import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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
  console.log(`=== ${d.id} ===`);
  for (const f of d.data().fields || []) {
    if (f.type === 'form_row') {
      for (const sf of f.fieldConfig?.fields || []) {
        console.log(`  ${sf.name} | label=${sf.label} | type=${sf.type} | width=${sf.width || '(none)'}`);
      }
    } else {
      console.log(`  [${f.type}] id=${f.id}`);
    }
  }
}
process.exit(0);
