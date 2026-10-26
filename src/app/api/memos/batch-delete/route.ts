import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, deleteDoc, addDoc, collection } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const { memoIds, userId, userRole } = await request.json() as {
      memoIds: string[];
      userId?: string;
      userRole?: string;
    };

    if (!memoIds || !Array.isArray(memoIds) || memoIds.length === 0) {
      return NextResponse.json({ error: 'กรุณาระบุ memo IDs' }, { status: 400 });
    }

    const now = new Date();
    let deleted = 0;
    let failed = 0;

    for (const id of memoIds) {
      try {
        const memoDoc = await getDoc(doc(db, 'memos', id));
        if (!memoDoc.exists()) {
          failed++;
          continue;
        }

        const memo = memoDoc.data()!;

        // Permission check: Admin can delete everything.
        // Non-admin can only delete if it's draft or if no approver has taken action yet.
        if (userRole !== 'admin') {
          if (userId && memo.ownerId !== userId) {
            failed++;
            continue;
          }

          if (memo.status === 'approved' || memo.status === 'rejected') {
            failed++;
            continue;
          }

          if (Array.isArray(memo.approvals) && memo.approvals.length > 0) {
            failed++;
            continue;
          }

          let hasSigned = false;
          if (memo.formData && typeof memo.formData === 'object') {
            const fd = memo.formData as Record<string, unknown>;
            for (const key of Object.keys(fd)) {
              const val = fd[key];
              if (val && typeof val === 'object' && !Array.isArray(val)) {
                const grid = val as Record<string, { signed?: boolean; action?: string }>;
                for (const colKey of Object.keys(grid)) {
                  if (colKey.startsWith('col_') && colKey !== 'col_0') {
                    const col = grid[colKey];
                    if (col && (col.signed || col.action === 'approve' || col.action === 'reject')) {
                      hasSigned = true;
                      break;
                    }
                  }
                }
              }
              if (hasSigned) break;
            }
          }
          if (hasSigned) {
            failed++;
            continue;
          }
        }

        await addDoc(collection(db, 'eventLogs'), {
          userId: userId || memo.ownerId,
          userName: memo.ownerName,
          action: 'MEMO_DELETED',
          details: `ลบ Memo: ${memo.title} (${memo.memoNumber})`,
          timestamp: now,
        });

        await deleteDoc(doc(db, 'memos', id));
        deleted++;
      } catch {
        failed++;
      }
    }

    return NextResponse.json({ success: true, deleted, failed, total: memoIds.length });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 });
  }
}
