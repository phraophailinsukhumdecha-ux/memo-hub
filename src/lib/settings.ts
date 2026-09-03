import { GlobalSettings } from '@/types';
import { db } from './firebase';
import { doc, onSnapshot } from 'firebase/firestore';

const DEFAULT_SETTINGS: GlobalSettings = {
  smtp: { host: '', port: 587, secure: false, user: '', password: '', fromEmail: '', fromName: 'MemoHub' },
  deadlineDays: 7,
  positionOptions: ['CEO', 'หัวหน้าแผนก', 'ซัพพลายเออร์', 'ลูกค้า', 'ร้านค้า'],
  departmentOptions: ['ไอที', 'บัญชี', 'เซล'],
  updatedAt: new Date(),
  updatedBy: 'system',
};

function convertTimestamps(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
      result[key] = (value as { toDate: () => Date }).toDate();
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = convertTimestamps(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export async function getSettings(): Promise<GlobalSettings> {
  const res = await fetch('/api/settings');
  const data = await res.json();
  const s = data.settings;
  if (!s) return DEFAULT_SETTINGS;
  return {
    ...DEFAULT_SETTINGS,
    ...s,
    smtp: { ...DEFAULT_SETTINGS.smtp, ...(s.smtp || {}) },
    positionOptions: s.positionOptions || DEFAULT_SETTINGS.positionOptions,
    departmentOptions: s.departmentOptions || DEFAULT_SETTINGS.departmentOptions,
  };
}

export async function saveSettings(settings: Partial<GlobalSettings>, updatedBy: string): Promise<void> {
  await fetch('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ settings, updatedBy }),
  });
}

export function subscribeToSettings(callback: (settings: GlobalSettings) => void) {
  const docRef = doc(db, 'settings', 'global');
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const raw = convertTimestamps(docSnap.data() as Record<string, unknown>) as unknown as GlobalSettings;
      callback({
        ...DEFAULT_SETTINGS,
        ...raw,
        smtp: { ...DEFAULT_SETTINGS.smtp, ...(raw.smtp || {}) },
        positionOptions: raw.positionOptions || DEFAULT_SETTINGS.positionOptions,
        departmentOptions: raw.departmentOptions || DEFAULT_SETTINGS.departmentOptions,
      });
    } else {
      callback(DEFAULT_SETTINGS);
    }
  });
}
