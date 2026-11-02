/**
 * One-time backfill for approval audit data.
 *
 * - Adds `channel` ('web' | 'email') to every memo approval, derived from the
 *   used emailTokens (or from the legacy placeholder comments).
 * - Enriches existing eventLogs with metadata (memoId, memoNumber, decision,
 *   channel, comment) and adds the missing logs for email approvals.
 *
 * Usage:
 *   node scripts/backfill-approval-logs.mjs          # dry run
 *   node scripts/backfill-approval-logs.mjs --apply  # write changes
 */
import fs from 'node:fs';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const APPLY = process.argv.includes('--apply');
const AUTO_COMMENTS = new Set(['อนุมัติผ่านอีเมล', 'ปฏิเสธผ่านอีเมล', 'ดำเนินการผ่านอีเมล']);
const MATCH_WINDOW_MS = 5_000;

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

const toMillis = (value) => {
  if (!value) return null;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (value instanceof Date) return value.getTime();
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
};

function actionOf(decision) {
  return decision === 'approve' ? 'MEMO_APPROVED' : 'MEMO_REJECTED';
}

function labelOf(decision) {
  return decision === 'approve' ? 'อนุมัติ' : 'ปฏิเสธ';
}

function channelLabel(channel) {
  return channel === 'email' ? 'อีเมล' : 'ระบบ';
}

function buildDetails(title, decision, channel, comment) {
  return `${labelOf(decision)} Memo: ${title} (ผ่าน${channelLabel(channel)})${comment ? ` — หมายเหตุ: ${comment}` : ''}`;
}

async function main() {
  console.log(APPLY ? '=== APPLY MODE ===' : '=== DRY RUN (add --apply to write) ===');

  const [memosSnap, tokensSnap, logsSnap] = await Promise.all([
    db.collection('memos').get(),
    db.collection('emailTokens').where('used', '==', true).get(),
    db.collection('eventLogs').get(),
  ]);

  // memoId|approverId -> token actions
  const tokenMap = new Map();
  for (const doc of tokensSnap.docs) {
    const data = doc.data();
    if (!data.memoId || !data.approverId) continue;
    const key = `${data.memoId}|${data.approverId}`;
    const list = tokenMap.get(key) || [];
    list.push({ action: data.action || '', usedAtMs: toMillis(data.usedAt) });
    tokenMap.set(key, list);
  }

  // event log indexes
  const exactIndex = new Map(); // userId|action|ms -> [{ id, data }]
  const byUserAction = new Map(); // userId|action -> [{ id, data, ms }]
  for (const doc of logsSnap.docs) {
    const data = doc.data();
    if (!data.userId || !data.action) continue;
    const ms = toMillis(data.timestamp);
    if (ms === null) continue;
    const key = `${data.userId}|${data.action}`;
    const entry = { id: doc.id, data, ms };
    const list = byUserAction.get(key) || [];
    list.push(entry);
    byUserAction.set(key, list);
    const exactKey = `${key}|${ms}`;
    const exact = exactIndex.get(exactKey) || [];
    exact.push(entry);
    exactIndex.set(exactKey, exact);
  }

  const claimed = new Set();
  const memoUpdates = [];
  const logUpdates = [];
  const logCreates = [];
  let approvalCount = 0;
  let webCount = 0;
  let emailCount = 0;
  let alreadyEnriched = 0;

  for (const memoDoc of memosSnap.docs) {
    const memo = memoDoc.data();
    const approvals = Array.isArray(memo.approvals) ? memo.approvals : [];
    if (approvals.length === 0) continue;

    const title = memo.title || memo.memoNumber || memoDoc.id;
    const memoNumber = memo.memoNumber || '';
    let approvalsChanged = false;
    const nextApprovals = approvals.map((approval) => {
      const comment = (approval.comment || '').trim();
      const tokens = tokenMap.get(`${memoDoc.id}|${approval.approverId}`) || [];
      const emailToken = tokens.find((token) => !token.action || token.action === approval.action);

      let channel = approval.channel;
      if (!channel) {
        if (emailToken || AUTO_COMMENTS.has(comment)) channel = 'email';
        else channel = 'web';
      }

      if (approval.channel !== channel) approvalsChanged = true;
      approvalCount++;
      if (channel === 'email') emailCount++;
      else webCount++;

      const actedAtMs = toMillis(approval.actedAt);
      const eventAction = actionOf(approval.action);
      const remark = AUTO_COMMENTS.has(comment) ? '' : comment;

      // Find the audit log that belongs to this action.
      let match = null;
      if (actedAtMs !== null) {
        const exact = (exactIndex.get(`${approval.approverId}|${eventAction}|${actedAtMs}`) || [])
          .find((entry) => !claimed.has(entry.id));
        if (exact) {
          match = exact;
        } else {
          const candidates = (byUserAction.get(`${approval.approverId}|${eventAction}`) || [])
            .filter((entry) => !claimed.has(entry.id) && Math.abs(entry.ms - actedAtMs) <= MATCH_WINDOW_MS)
            .sort((a, b) => Math.abs(a.ms - actedAtMs) - Math.abs(b.ms - actedAtMs));
          match = candidates[0] || null;
        }
      }

      if (match) {
        claimed.add(match.id);
        const existing = match.data.metadata || {};
        if (existing.memoId && existing.channel) {
          alreadyEnriched++;
        } else {
          logUpdates.push({
            id: match.id,
            metadata: {
              ...existing,
              memoId: memoDoc.id,
              memoNumber,
              decision: approval.action,
              channel,
              comment: remark,
            },
            details: buildDetails(title, approval.action, channel, remark),
          });
        }
      } else if (actedAtMs !== null) {
        logCreates.push({
          userId: approval.approverId || '',
          userName: approval.approverName || '',
          action: eventAction,
          details: buildDetails(title, approval.action, channel, remark),
          metadata: {
            memoId: memoDoc.id,
            memoNumber,
            decision: approval.action,
            channel,
            comment: remark,
          },
          timestamp: Timestamp.fromMillis(actedAtMs),
        });
      }

      return approval.channel === channel ? approval : { ...approval, channel };
    });

    if (approvalsChanged) {
      memoUpdates.push({ id: memoDoc.id, approvals: nextApprovals });
    }
  }

  console.log(`memos scanned:            ${memosSnap.size}`);
  console.log(`approvals scanned:        ${approvalCount} (web ${webCount}, email ${emailCount})`);
  console.log(`memo docs to update:      ${memoUpdates.length}`);
  console.log(`eventLogs to update:      ${logUpdates.length}`);
  console.log(`eventLogs to create:      ${logCreates.length}`);
  console.log(`logs already enriched:    ${alreadyEnriched}`);

  if (!APPLY) {
    console.log('\nSample updates:');
    for (const update of logUpdates.slice(0, 5)) console.log('  update', update.id, update.metadata);
    for (const create of logCreates.slice(0, 5)) console.log('  create', create.metadata, create.details);
    console.log('\nDry run only — nothing was written.');
    return;
  }

  let batch = db.batch();
  let ops = 0;
  const commitIfNeeded = async () => {
    if (ops >= 400) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  };

  for (const update of memoUpdates) {
    batch.update(db.collection('memos').doc(update.id), { approvals: update.approvals });
    ops++;
    await commitIfNeeded();
  }
  for (const update of logUpdates) {
    batch.update(db.collection('eventLogs').doc(update.id), {
      metadata: update.metadata,
      details: update.details,
    });
    ops++;
    await commitIfNeeded();
  }
  for (const create of logCreates) {
    batch.set(db.collection('eventLogs').doc(), create);
    ops++;
    await commitIfNeeded();
  }
  if (ops > 0) await batch.commit();

  console.log('\nBackfill complete.');
}

main().catch((error) => {
  console.error('Backfill failed:', error);
  process.exit(1);
});
