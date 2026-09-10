// One-off local script: set whole memo document font to TH Sarabun.
// Usage: node scripts/set-font-local.mjs
// - Sets template.typography.fontFamily to TH Sarabun stack (keeps other keys)
// - Removes per-section typography.fontFamily overrides (keeps size/align/etc.)
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';

const TH_SARABUN_STACK =
  '"TH Sarabun New", "TH SarabunPSK", "TH Sarabun", "Noto Sans Thai", Tahoma, sans-serif';

const app = initializeApp({
  apiKey: 'AIzaSyAySCPzCj1qaLGolMn5ggG6oCsOppF9sxA',
  authDomain: 'intappprojects.firebaseapp.com',
  projectId: 'intappprojects',
  storageBucket: 'intappprojects.firebasestorage.app',
  messagingSenderId: '378414291222',
  appId: '1:378414291222:web:8d536d481122aae3e49837',
});
const db = getFirestore(app, 'memohub-db');

const snap = await getDocs(collection(db, 'memoTemplates'));
for (const d of snap.docs) {
  const data = d.data();
  const typography = { ...(data.typography || {}), fontFamily: TH_SARABUN_STACK };
  const fields = (data.fields || []).map((f) => {
    if (f && f.typography && f.typography.fontFamily) {
      const { fontFamily, ...rest } = f.typography;
      return { ...f, typography: rest };
    }
    return f;
  });
  await updateDoc(doc(db, 'memoTemplates', d.id), { typography, fields });
  console.log(`updated ${d.id}: template font -> TH Sarabun, section font overrides cleared`);
}
console.log('done');
process.exit(0);
