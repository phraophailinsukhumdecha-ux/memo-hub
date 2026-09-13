import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
const app = initializeApp({apiKey:'AIzaSyAySCPzCj1qaLGolMn5ggG6oCsOppF9sxA',authDomain:'intappprojects.firebaseapp.com',projectId:'intappprojects'},'chk4');
const db = getFirestore(app,'memohub-db');
const s = await getDoc(doc(db,'memoTemplates','tpl_purchasing'));
const d = s.data();
const ag = (d.fields||[]).find(f=>f.type==='approval_grid');
console.log('approval_grid columns:');
(ag?.fieldConfig?.columns || []).forEach((c,i) => {
  console.log(`  col_${i}: title="${c.title}" subtitle="${c.subtitle || ''}"`);
});
process.exit(0);
