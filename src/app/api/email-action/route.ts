import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, addDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { sendOwnerNotification } from '@/lib/memo-email';

function getBaseUrl(request: NextRequest): string {
  return (
    request.headers.get('origin') ||
    `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host') || 'localhost:3000'}`
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const action = searchParams.get('action');

  // Info endpoint for cancel page
  if (token && action === 'info') {
    try {
      const tokenQuery = query(collection(db, 'emailTokens'), where('token', '==', token));
      const tokenSnapshot = await getDocs(tokenQuery);
      if (tokenSnapshot.empty) {
        return NextResponse.json({ ok: false, error: 'ไม่พบ Token' });
      }
      const tokenData = tokenSnapshot.docs[0].data();
      if (tokenData.used) {
        return NextResponse.json({ ok: false, error: 'ลิงค์ถูกใช้แล้ว' });
      }
      const memoDoc = await getDoc(doc(db, 'memos', tokenData.memoId));
      if (!memoDoc.exists()) {
        return NextResponse.json({ ok: false, error: 'ไม่พบ Memo' });
      }
      const memo = memoDoc.data()!;
      return NextResponse.json({
        ok: true,
        memo: {
          memoNumber: memo.memoNumber,
          title: memo.title,
          ownerName: memo.ownerName,
          department: memo.department || '',
          deadlineAt: memo.deadlineAt?.toDate?.() || memo.deadlineAt,
          status: memo.status,
        },
      });
    } catch {
      return NextResponse.json({ ok: false, error: 'เกิดข้อผิดพลาด' });
    }
  }

  if (!token || !action || !['approve', 'reject'].includes(action)) {
    return new Response(`
      <!DOCTYPE html>
      <html><head><meta charset="utf-8"><title>MemoHub</title></head>
      <body style="font-family:Arial,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f8fafc;">
        <div style="text-align:center;padding:40px;background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.1);max-width:400px;">
          <h2 style="color:#dc2626;">ลิงค์ไม่ถูกต้อง</h2>
          <p style="color:#64748b;">กรุณาตรวจสอบลิงค์จากอีเมลอีกครั้ง</p>
        </div>
      </body></html>
    `, { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  try {
    const tokenQuery = query(collection(db, 'emailTokens'), where('token', '==', token));
    const tokenSnapshot = await getDocs(tokenQuery);

    if (tokenSnapshot.empty) {
      return new Response(`
        <!DOCTYPE html>
        <html><head><meta charset="utf-8"><title>MemoHub</title></head>
        <body style="font-family:Arial,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f8fafc;">
          <div style="text-align:center;padding:40px;background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.1);max-width:400px;">
            <h2 style="color:#dc2626;">ไม่พบ Token</h2>
            <p style="color:#64748b;">ลิงค์นี้ไม่ถูกต้องหรือถูกลบไปแล้ว</p>
          </div>
        </body></html>
      `, { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    const tokenDoc = tokenSnapshot.docs[0];
    const tokenData = tokenDoc.data();

    if (tokenData.used) {
      return new Response(`
        <!DOCTYPE html>
        <html><head><meta charset="utf-8"><title>MemoHub</title></head>
        <body style="font-family:Arial,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f8fafc;">
          <div style="text-align:center;padding:40px;background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.1);max-width:400px;">
            <h2 style="color:#f59e0b;">ลิงค์ถูกใช้แล้ว</h2>
            <p style="color:#64748b;">คุณได้ดำเนินการกับ Memo นี้ไปแล้ว</p>
          </div>
        </body></html>
      `, { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    const expiresAt = tokenData.expiresAt?.toDate?.() || new Date(tokenData.expiresAt);
    if (new Date() > expiresAt) {
      return new Response(`
        <!DOCTYPE html>
        <html><head><meta charset="utf-8"><title>MemoHub</title></head>
        <body style="font-family:Arial,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f8fafc;">
          <div style="text-align:center;padding:40px;background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.1);max-width:400px;">
            <h2 style="color:#dc2626;">ลิงค์หมดอายุ</h2>
            <p style="color:#64748b;">ลิงค์นี้หมดอายุแล้ว กรุณาติดต่อผู้สร้าง Memo</p>
          </div>
        </body></html>
      `, { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    const memoDoc = await getDoc(doc(db, 'memos', tokenData.memoId));
    if (!memoDoc.exists()) {
      return new Response(`
        <!DOCTYPE html>
        <html><head><meta charset="utf-8"><title>MemoHub</title></head>
        <body style="font-family:Arial,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f8fafc;">
          <div style="text-align:center;padding:40px;background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.1);max-width:400px;">
            <h2 style="color:#dc2626;">ไม่พบ Memo</h2>
            <p style="color:#64748b;">Memo นี้อาจถูกลบไปแล้ว</p>
          </div>
        </body></html>
      `, { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    const memo = memoDoc.data()!;
    if (memo.status !== 'waiting' && memo.status !== 'new') {
      return new Response(`
        <!DOCTYPE html>
        <html><head><meta charset="utf-8"><title>MemoHub</title></head>
        <body style="font-family:Arial,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f8fafc;">
          <div style="text-align:center;padding:40px;background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.1);max-width:400px;">
            <h2 style="color:#f59e0b;">Memo ดำเนินการแล้ว</h2>
            <p style="color:#64748b;">Memo นี้มีสถานะ: ${memo.status}</p>
          </div>
        </body></html>
      `, { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    const now = new Date();
    const formData = memo.formData || {};

    // Look up user by email for more robust matching
    let matchUserId = tokenData.approverId || '';
    let matchUserName = tokenData.approverName || '';
    const toEmail = tokenData.toEmail || '';

    if (toEmail) {
      const usersSnap = await getDocs(query(collection(db, 'users'), where('email', '==', toEmail)));
      if (!usersSnap.empty) {
        const userDoc = usersSnap.docs[0];
        const userData = userDoc.data();
        matchUserId = userDoc.id;
        matchUserName = userData.displayName || matchUserName;
      }
    }

    // Debug: log what we're trying to match
    const debugInfo = { matchUserId, matchUserName, toEmail, gridKeys: Object.keys(formData) };

    let approverColKey: string | null = null;
    let isOwner = false;

    // First check if user is the owner (col_0)
    for (const fieldKey of Object.keys(formData)) {
      const fieldValue = formData[fieldKey];
      if (fieldValue && typeof fieldValue === 'object' && !Array.isArray(fieldValue)) {
        const col0 = fieldValue['col_0'];
        if (col0) {
          if ((matchUserId && col0.userId === matchUserId) || (matchUserName && col0.name === matchUserName)) {
            isOwner = true;
          }
        }
      }
    }

    // Then check approver columns (col_1, col_2, etc.) — skip already signed
    for (const fieldKey of Object.keys(formData)) {
      const fieldValue = formData[fieldKey];
      if (fieldValue && typeof fieldValue === 'object' && !Array.isArray(fieldValue)) {
        for (const colKey of Object.keys(fieldValue)) {
          if (colKey.startsWith('col_') && colKey !== 'col_0') {
            const col = (fieldValue as Record<string, Record<string, string>>)[colKey];
            if (!col) continue;
            if (col.signed) continue;
            if (matchUserId && col.userId === matchUserId) {
              approverColKey = colKey;
              break;
            }
            if (matchUserName && col.name && col.name === matchUserName) {
              approverColKey = colKey;
              break;
            }
          }
        }
        if (approverColKey) break;
      }
    }

    if (!approverColKey) {
      const ownerMsg = isOwner
        ? '<p style="color:#64748b;">คุณเป็นเจ้าของ Memo นี้ — ไม่สามารถอนุมัติ Memo ของตัวเองได้</p><p style="color:#64748b;font-size:13px;">กรุณาให้ผู้อนุมัติคนอื่นกดอนุมัติแทน</p>'
        : '<p style="color:#64748b;">คุณไม่ได้เป็นผู้อนุมัติใน Memo นี้</p>';

      const allCols: Record<string, unknown> = {};
      for (const fieldKey of Object.keys(formData)) {
        const fieldValue = formData[fieldKey];
        if (fieldValue && typeof fieldValue === 'object' && !Array.isArray(fieldValue)) {
          for (const colKey of Object.keys(fieldValue)) {
            if (colKey.startsWith('col_')) {
              allCols[colKey] = fieldValue[colKey];
            }
          }
        }
      }
      return new Response(`
        <!DOCTYPE html>
        <html><head><meta charset="utf-8"><title>MemoHub</title></head>
        <body style="font-family:Arial,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f8fafc;">
          <div style="text-align:center;padding:40px;background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.1);max-width:500px;">
            <h2 style="color:#dc2626;">ไม่มีสิทธิ์ดำเนินการ</h2>
            ${ownerMsg}
            <p style="color:#64748b;margin-bottom:12px;">คุณไม่ได้เป็นผู้อนุมัติใน Memo นี้</p>
            <div style="text-align:left;background:#f8fafc;padding:12px;border-radius:8px;font-size:12px;color:#64748b;">
              <p><strong>Email:</strong> ${toEmail}</p>
              <p><strong>UserId:</strong> ${matchUserId || '(not found)'}</p>
              <p><strong>Name:</strong> ${matchUserName || '(not found)'}</p>
              <p><strong>Grid columns:</strong> ${JSON.stringify(allCols, null, 2)}</p>
            </div>
          </div>
        </body></html>
      `, { status: 403, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    const updatedFormData = JSON.parse(JSON.stringify(formData));
    for (const fieldKey of Object.keys(updatedFormData)) {
      const fieldValue = updatedFormData[fieldKey];
      if (fieldValue && typeof fieldValue === 'object' && !Array.isArray(fieldValue)) {
        if (fieldValue[approverColKey]) {
          fieldValue[approverColKey].signed = action === 'approve';
          fieldValue[approverColKey].date = now.toISOString().split('T')[0];
          fieldValue[approverColKey].time = now.toTimeString().split(' ')[0].substring(0, 5);
        }
      }
    }

    const approval = {
      level: 0,
      approvalLevel: approverColKey,
      approverId: tokenData.approverId,
      approverName: tokenData.approverName,
      action: action as 'approve' | 'reject',
      comment: `ดำเนินการผ่านอีเมล`,
      actedAt: now,
    };

    let newStatus = memo.status;
    if (action === 'reject') {
      newStatus = 'rejected';
    } else {
      let allApproved = true;
      for (const fieldKey of Object.keys(updatedFormData)) {
        const fieldValue = updatedFormData[fieldKey];
        if (fieldValue && typeof fieldValue === 'object' && !Array.isArray(fieldValue)) {
          for (const colKey of Object.keys(fieldValue)) {
            if (colKey.startsWith('col_') && colKey !== 'col_0') {
              const col = fieldValue[colKey];
              if ((col?.userId || col?.name) && !col?.signed) {
                allApproved = false;
                break;
              }
            }
          }
        }
        if (!allApproved) break;
      }
      if (allApproved) newStatus = 'approved';
    }

    const updateData: Record<string, unknown> = {
      formData: updatedFormData,
      approvals: [...(memo.approvals || []), approval],
      updatedAt: now,
    };

    if (newStatus === 'approved') {
      updateData.status = 'approved';
      updateData.closedAt = now;
    } else if (newStatus === 'rejected') {
      updateData.status = 'rejected';
      updateData.closedAt = now;
    }

    await updateDoc(doc(db, 'memos', tokenData.memoId), updateData);
    await updateDoc(doc(db, 'emailTokens', tokenDoc.id), { used: true, action, usedAt: now });

    // Notify the memo owner by email (fire-and-forget safe: never throws)
    await sendOwnerNotification({
      memoId: tokenData.memoId,
      actorId: tokenData.approverId,
      actorName: tokenData.approverName,
      action: action as 'approve' | 'reject',
      baseUrl: getBaseUrl(request),
    });

    const actionLabel = action === 'approve' ? 'อนุมัติ' : 'ปฏิเสธ';
    const statusColor = action === 'approve' ? '#16a34a' : '#dc2626';
    const statusBg = action === 'approve' ? '#f0fdf4' : '#fef2f2';

    return new Response(`
      <!DOCTYPE html>
      <html><head><meta charset="utf-8"><title>MemoHub</title></head>
      <body style="font-family:Arial,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f8fafc;">
        <div style="text-align:center;padding:40px;background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.1);max-width:400px;">
          <div style="width:60px;height:60px;border-radius:50%;background:${statusBg};display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
            <span style="font-size:28px;">${action === 'approve' ? '✓' : '✗'}</span>
          </div>
          <h2 style="color:${statusColor};">ดำเนินการ${actionLabel}สำเร็จ</h2>
          <p style="color:#64748b;margin:8px 0 4px;">Memo: ${tokenData.memoId}</p>
          <p style="color:#64748b;font-size:14px;">ดำเนินการโดย: ${tokenData.approverName}</p>
          ${newStatus === 'approved' ? '<p style="color:#16a34a;font-weight:600;margin-top:16px;">✓ Memo ได้รับการอนุมัติครบทุกคนแล้ว</p>' : ''}
          ${newStatus === 'rejected' ? '<p style="color:#dc2626;font-weight:600;margin-top:16px;">✗ Memo ถูกปฏิเสธ</p>' : ''}
        </div>
      </body></html>
    `, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  } catch (error) {
    return new Response(`
      <!DOCTYPE html>
      <html><head><meta charset="utf-8"><title>MemoHub</title></head>
      <body style="font-family:Arial,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f8fafc;">
        <div style="text-align:center;padding:40px;background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.1);max-width:400px;">
          <h2 style="color:#dc2626;">เกิดข้อผิดพลาด</h2>
          <p style="color:#64748b;">${error instanceof Error ? error.message : 'ไม่ทราบสาเหตุ'}</p>
        </div>
      </body></html>
    `, { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { token, action, remark } = await request.json() as { token: string; action: string; remark?: string };

    if (!token || !action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ ok: false, error: 'ข้อมูลไม่ถูกต้อง' }, { status: 400 });
    }

    // Reject (Cancel) via email always requires a remark
    if (action === 'reject' && !remark?.trim()) {
      return NextResponse.json({ ok: false, error: 'กรุณาระบุเหตุผลในการปฏิเสธ' }, { status: 400 });
    }

    const tokenQuery = query(collection(db, 'emailTokens'), where('token', '==', token));
    const tokenSnapshot = await getDocs(tokenQuery);

    if (tokenSnapshot.empty) {
      return NextResponse.json({ ok: false, error: 'ไม่พบ Token' }, { status: 404 });
    }

    const tokenDoc = tokenSnapshot.docs[0];
    const tokenData = tokenDoc.data();

    if (tokenData.used) {
      return NextResponse.json({ ok: false, error: 'ลิงค์ถูกใช้แล้ว' }, { status: 400 });
    }

    const expiresAt = tokenData.expiresAt?.toDate?.() || new Date(tokenData.expiresAt);
    if (new Date() > expiresAt) {
      return NextResponse.json({ ok: false, error: 'ลิงค์หมดอายุ' }, { status: 400 });
    }

    const memoDoc = await getDoc(doc(db, 'memos', tokenData.memoId));
    if (!memoDoc.exists()) {
      return NextResponse.json({ ok: false, error: 'ไม่พบ Memo' }, { status: 404 });
    }

    const memo = memoDoc.data()!;
    if (memo.status !== 'waiting' && memo.status !== 'new') {
      return NextResponse.json({ ok: false, error: 'Memo ดำเนินการแล้ว' }, { status: 400 });
    }

    const now = new Date();
    const formData = memo.formData || {};

    let matchUserId = tokenData.approverId || '';
    let matchUserName = tokenData.approverName || '';
    const toEmail = tokenData.toEmail || '';

    if (toEmail) {
      const usersSnap = await getDocs(query(collection(db, 'users'), where('email', '==', toEmail)));
      if (!usersSnap.empty) {
        const userDoc = usersSnap.docs[0];
        const userData = userDoc.data();
        matchUserId = userDoc.id;
        matchUserName = userData.displayName || matchUserName;
      }
    }

    let approverColKey: string | null = null;
    let isOwner = false;

    for (const fieldKey of Object.keys(formData)) {
      const fieldValue = formData[fieldKey];
      if (fieldValue && typeof fieldValue === 'object' && !Array.isArray(fieldValue)) {
        const col0 = fieldValue['col_0'];
        if (col0) {
          if ((matchUserId && col0.userId === matchUserId) || (matchUserName && col0.name === matchUserName)) {
            isOwner = true;
          }
        }
      }
    }

    for (const fieldKey of Object.keys(formData)) {
      const fieldValue = formData[fieldKey];
      if (fieldValue && typeof fieldValue === 'object' && !Array.isArray(fieldValue)) {
        for (const colKey of Object.keys(fieldValue)) {
          if (colKey.startsWith('col_') && colKey !== 'col_0') {
            const col = (fieldValue as Record<string, Record<string, string>>)[colKey];
            if (!col) continue;
            if (col.signed) continue;
            if (matchUserId && col.userId === matchUserId) {
              approverColKey = colKey;
              break;
            }
            if (matchUserName && col.name && col.name === matchUserName) {
              approverColKey = colKey;
              break;
            }
          }
        }
        if (approverColKey) break;
      }
    }

    if (!approverColKey) {
      return NextResponse.json({ ok: false, error: isOwner ? 'คุณเป็นเจ้าของ Memo นี้' : 'คุณไม่ได้เป็นผู้อนุมัติใน Memo นี้' }, { status: 403 });
    }

    const updatedFormData = JSON.parse(JSON.stringify(formData));
    for (const fieldKey of Object.keys(updatedFormData)) {
      const fieldValue = updatedFormData[fieldKey];
      if (fieldValue && typeof fieldValue === 'object' && !Array.isArray(fieldValue)) {
        if (fieldValue[approverColKey]) {
          fieldValue[approverColKey].signed = action === 'approve';
          fieldValue[approverColKey].date = now.toISOString().split('T')[0];
          fieldValue[approverColKey].time = now.toTimeString().split(' ')[0].substring(0, 5);
        }
      }
    }

    const approval = {
      level: 0,
      approvalLevel: approverColKey,
      approverId: tokenData.approverId,
      approverName: tokenData.approverName,
      action: action as 'approve' | 'reject',
      comment: remark || (action === 'approve' ? 'อนุมัติผ่านอีเมล' : 'ปฏิเสธผ่านอีเมล'),
      actedAt: now,
    };

    let newStatus = memo.status;
    if (action === 'reject') {
      newStatus = 'rejected';
    } else {
      let allApproved = true;
      for (const fieldKey of Object.keys(updatedFormData)) {
        const fieldValue = updatedFormData[fieldKey];
        if (fieldValue && typeof fieldValue === 'object' && !Array.isArray(fieldValue)) {
          for (const colKey of Object.keys(fieldValue)) {
            if (colKey.startsWith('col_') && colKey !== 'col_0') {
              const col = fieldValue[colKey];
              if ((col?.userId || col?.name) && !col?.signed) {
                allApproved = false;
                break;
              }
            }
          }
        }
        if (!allApproved) break;
      }
      if (allApproved) newStatus = 'approved';
    }

    const updateData: Record<string, unknown> = {
      formData: updatedFormData,
      approvals: [...(memo.approvals || []), approval],
      updatedAt: now,
    };

    if (newStatus === 'approved') {
      updateData.status = 'approved';
      updateData.closedAt = now;
    } else if (newStatus === 'rejected') {
      updateData.status = 'rejected';
      updateData.closedAt = now;
    }

    await updateDoc(doc(db, 'memos', tokenData.memoId), updateData);
    await updateDoc(doc(db, 'emailTokens', tokenDoc.id), { used: true, action, usedAt: now });

    // Notify the memo owner by email (fire-and-forget safe: never throws)
    await sendOwnerNotification({
      memoId: tokenData.memoId,
      actorId: tokenData.approverId,
      actorName: matchUserName || tokenData.approverName,
      action: action as 'approve' | 'reject',
      remark: remark?.trim() || undefined,
      baseUrl: getBaseUrl(request),
    });

    return NextResponse.json({ ok: true, message: action === 'approve' ? 'อนุมัติสำเร็จ' : 'ปฏิเสธสำเร็จ' });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
