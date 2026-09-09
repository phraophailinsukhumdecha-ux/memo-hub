import { db } from './firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const SEED_VERSION = 7;

export async function seedAllData(): Promise<boolean> {
  console.log('Seed function disabled — use manual data entry instead');
  return false;
}

export async function resetAndSeedAllData(): Promise<boolean> {
  return await seedAllData();
}

export async function checkAndMigrate(): Promise<void> {
  try {
    const docRef = doc(db, 'settings', 'global');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      const currentVersion = data?.seedVersion || 1;
      if (currentVersion < SEED_VERSION) {
        await updateDoc(docRef, { seedVersion: SEED_VERSION });
      }
    }
  } catch (error) {
    console.error('Migration check error:', error);
  }
}
