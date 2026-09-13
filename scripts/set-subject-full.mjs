import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';

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
  let changed = false;
  const fields = (data.fields || []).map((f) => {
    if (f?.type !== 'form_row') return f;
    const sub = (f.fieldConfig?.fields || []).map((sf) => {
      if (sf.name === 'subject' && sf.width !== 'full') {
        changed = true;
        return { ...sf, width: 'full' };
      }
      return sf;
    });
    return { ...f, fieldConfig: { ...f.fieldConfig, fields: sub } };
  });
  if (changed) {
    await updateDoc(doc(db, 'memoTemplates', d.id), { fields });
    console.log(`updated ${d.id}: subject -> full width`);
  } else {
    console.log(`skipped ${d.id}: no change`);
  }
}
process.exit(0);
