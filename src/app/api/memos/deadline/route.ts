import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';

export async function POST() {
  try {
    const now = new Date();

    const memosQ = query(
      collection(db, 'memos'),
      where('status', 'in', ['new', 'waiting'])
    );
    const memosSnap = await getDocs(memosQ);

    let updatedCount = 0;
    let cancelledCount = 0;

    for (const d of memosSnap.docs) {
      const memo = d.data();
      const deadline = memo.deadlineAt?.toDate ? memo.deadlineAt.toDate() : new Date(memo.deadlineAt);

      if (deadline <= now) {
        await updateDoc(doc(db, 'memos', d.id), {
          status: 'cancel',
          currentApprovalIndex: memo.approvalRoute?.length || 0,
          currentApprovalLevel: null,
          closedAt: now,
          updatedAt: now,
        });
        cancelledCount++;
      } else if (memo.status === 'new') {
        const createdAt = memo.createdAt?.toDate ? memo.createdAt.toDate() : new Date(memo.createdAt);
        const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
        if (hoursSinceCreation >= 24) {
          await updateDoc(doc(db, 'memos', d.id), {
            status: 'waiting',
            waitingAt: now,
            updatedAt: now,
          });
          updatedCount++;
        }
      }
    }

    return NextResponse.json({ updatedCount, cancelledCount });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 });
  }
}
