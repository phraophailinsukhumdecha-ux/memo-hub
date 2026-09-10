import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

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

export async function generateMemoId(department: string): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  const dept = getDeptAbbr(department);
  const prefix = `${dept}${dateStr}`;

  try {
    const memosRef = collection(db, 'memos');
    const q = query(memosRef, where('memoNumber', '>=', prefix), where('memoNumber', '<', prefix + '\uf8ff'));
    const snapshot = await getDocs(q);
    const seq = snapshot.size + 1;
    const seqStr = String(seq).padStart(2, '0');
    return `${prefix}_${seqStr}`;
  } catch (e) {
    console.error('Error generating memo ID:', e);
    const seqStr = String(1).padStart(2, '0');
    return `${prefix}_${seqStr}`;
  }
}
