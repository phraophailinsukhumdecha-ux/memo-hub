import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { getDeadlineDays } from '@/lib/deadline';

const ENABLE_AUTO_CANCEL = true;

export async function POST() {
  try {
    const now = new Date();
    const deadlineDays = await getDeadlineDays();

    const memosQ = query(
      collection(db, 'memos'),
      where('status', 'in', ['new', 'waiting'])
    );
    const memosSnap = await getDocs(memosQ);

    let updatedCount = 0;
    let cancelledCount = 0;

    for (const d of memosSnap.docs) {
      const memo = d.data();
      const createdAt = memo.createdAt?.toDate ? memo.createdAt.toDate() : new Date(memo.createdAt);
      const newDeadline = new Date(createdAt.getTime() + deadlineDays * 86400000);
      const currentDeadline = memo.deadlineAt?.toDate ? memo.deadlineAt.toDate() : memo.deadlineAt ? new Date(memo.deadlineAt) : null;
      const deadlineChanged = !currentDeadline || currentDeadline.getTime() !== newDeadline.getTime();

      if (ENABLE_AUTO_CANCEL && newDeadline <= now) {
        await updateDoc(doc(db, 'memos', d.id), {
          status: 'cancel',
          deadlineAt: newDeadline,
          currentApprovalIndex: memo.approvalRoute?.length || 0,
          currentApprovalLevel: null,
          closedAt: now,
          updatedAt: now,
        });
        cancelledCount++;
      } else {
        const patch: Record<string, unknown> = {};
        if (deadlineChanged) patch.deadlineAt = newDeadline;
        if (memo.status === 'new') {
          const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
          if (hoursSinceCreation >= 24) {
            patch.status = 'waiting';
            patch.waitingAt = now;
          }
        }
        if (Object.keys(patch).length > 0) {
          patch.updatedAt = now;
          await updateDoc(doc(db, 'memos', d.id), patch);
          updatedCount++;
        }
      }
    }

    return NextResponse.json({ updatedCount, cancelledCount });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 });
  }
}
