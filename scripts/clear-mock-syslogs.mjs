/**
 * Remove the seeded/mock syslog rows that shipped with the initial demo data.
 *
 * Usage:
 *   node scripts/clear-mock-syslogs.mjs          # dry run
 *   node scripts/clear-mock-syslogs.mjs --apply  # delete
 */
import fs from 'node:fs';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const APPLY = process.argv.includes('--apply');

function loadEnv() {
  const text = fs.readFileSync('.env.local', 'utf8');
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#') || !line.includes('=')) continue;
    const i = line.indexOf('=');
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return env;
}

const env = loadEnv();
const keyPath = env.GOOGLE_APPLICATION_CREDENTIALS;
if (!keyPath) throw new Error('GOOGLE_APPLICATION_CREDENTIALS is not set in .env.local');
const key = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: key.project_id,
      clientEmail: key.client_email,
      privateKey: key.private_key,
    }),
  });
}
const db = getFirestore(getApps()[0], 'memohub-db');

async function main() {
  console.log(APPLY ? '=== APPLY MODE ===' : '=== DRY RUN (add --apply to delete) ===');

  // The seeded rows are dated September 2026; real logs start later.
  const cutoff = new Date('2026-10-01T00:00:00Z');
  const snapshot = await db.collection('syslogs').where('timestamp', '<', cutoff).get();

  console.log(`mock syslogs found: ${snapshot.size} (before ${cutoff.toISOString()})`);
  for (const doc of snapshot.docs.slice(0, 10)) {
    const data = doc.data();
    console.log(`  - [${data.level}/${data.category}] ${data.message}`);
  }

  if (!APPLY) {
    console.log('\nDry run only — nothing was deleted.');
    return;
  }

  let batch = db.batch();
  let ops = 0;
  for (const doc of snapshot.docs) {
    batch.delete(doc.ref);
    ops++;
    if (ops >= 400) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  }
  if (ops > 0) await batch.commit();

  console.log(`\nDeleted ${snapshot.size} mock syslog rows.`);
}

main().catch((error) => {
  console.error('Cleanup failed:', error);
  process.exit(1);
});
