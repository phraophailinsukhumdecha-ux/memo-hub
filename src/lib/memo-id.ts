import { db } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { formatActionDate } from '@/lib/datetime';

const DEPT_MAP: Record<string, string> = {
  'ไอที': 'IT', 'IT': 'IT',
  'บัญชี': 'AC', 'AC': 'AC',
  'เซล': 'SA', 'SA': 'SA',
  'การตลาด': 'MK', 'MK': 'MK',
  'ทรัพยากรบุคคล': 'HR', 'HR': 'HR',
  'บุคลากร': 'HR',
  'คลังสินค้า': 'WH', 'WH': 'WH',
  'จัดซื้อ': 'PD', 'PD': 'PD',
  'ขาย': 'SA',
  'บริหาร': 'MG', 'MG': 'MG',
};

export function getDeptAbbr(department: string): string {
  if (!department) return 'XX';
  if (DEPT_MAP[department]) return DEPT_MAP[department];
  return department.substring(0, 2).toUpperCase();
}

/**
 * Build the next memo id: `<DEPT><YYYYMMDD>_<NN>`.
 *
 * The sequence is the highest suffix used today + 1 (never a plain count), so
 * deleting a memo can no longer reuse an existing number and overwrite it.
 * The date follows Thailand time (Asia/Bangkok), matching the app.
 */
export async function generateMemoId(department: string): Promise<string> {
  const dateStr = formatActionDate(); // YYYY-MM-DD in Asia/Bangkok
  const compactDate = dateStr.replace(/-/g, '');
  const dept = getDeptAbbr(department);
  const prefix = `${dept}${compactDate}`;

  const startOfDay = new Date(`${dateStr}T00:00:00+07:00`);
  const startOfNextDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  const memosRef = collection(db, 'memos');
  const q = query(
    memosRef,
    where('createdAt', '>=', startOfDay),
    where('createdAt', '<', startOfNextDay)
  );
  const snapshot = await getDocs(q);

  // Use the maximum suffix across ALL departments for the day, so the daily
  // sequence keeps moving forward even when memos were deleted.
  let maxSeq = 0;
  for (const docSnap of snapshot.docs) {
    const match = /_(\d+)$/.exec(docSnap.id);
    if (!match) continue;
    const seq = parseInt(match[1], 10);
    if (Number.isFinite(seq) && seq > maxSeq) maxSeq = seq;
  }

  let nextSeq = maxSeq + 1;
  for (let attempt = 0; attempt < 100; attempt++) {
    const candidate = `${prefix}_${String(nextSeq).padStart(2, '0')}`;
    const existing = await getDoc(doc(db, 'memos', candidate));
    if (!existing.exists()) return candidate;
    nextSeq++;
  }

  throw new Error('ไม่สามารถสร้างรหัส Memo ที่ไม่ซ้ำได้ กรุณาลองใหม่');
}
