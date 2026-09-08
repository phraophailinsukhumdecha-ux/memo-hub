import { NextRequest } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, addDoc, collection, query, where, getDocs } from 'firebase/firestore';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const action = searchParams.get('action');

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
    let approverColKey: string | null = null;

    for (const fieldKey of Object.keys(formData)) {
      const fieldValue = formData[fieldKey];
      if (fieldValue && typeof fieldValue === 'object' && !Array.isArray(fieldValue)) {
        for (const colKey of Object.keys(fieldValue)) {
          if (colKey.startsWith('col_') && colKey !== 'col_0') {
            const col = (fieldValue as Record<string, Record<string, string>>)[colKey];
            if (col?.userId === tokenData.approverId || col?.name === tokenData.approverName) {
              approverColKey = colKey;
              break;
            }
          }
        }
      }
    }

    if (!approverColKey) {
      return new Response(`
        <!DOCTYPE html>
        <html><head><meta charset="utf-8"><title>MemoHub</title></head>
        <body style="font-family:Arial,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f8fafc;">
          <div style="text-align:center;padding:40px;background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.1);max-width:400px;">
            <h2 style="color:#dc2626;">ไม่มีสิทธิ์ดำเนินการ</h2>
            <p style="color:#64748b;">คุณไม่ได้เป็นผู้อนุมัติใน Memo นี้</p>
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
