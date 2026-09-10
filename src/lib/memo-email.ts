import { db } from '@/lib/firebase';
import {
  doc,
  getDoc,
  collection,
  getDocs,
  addDoc,
} from 'firebase/firestore';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { resolveLogoAbsolute } from '@/lib/logo';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  fromEmail: string;
  fromName: string;
  encryption?: string;
}

export interface OwnerMailFormat {
  ownerSubject?: string;
  ownerBody?: string;
}

export const DEFAULT_OWNER_SUBJECT =
  '[MemoHub] {memo_number} {action_label}โดย {actor_name}';
export const DEFAULT_OWNER_BODY = `สวัสดีค่ะ/ครับ

Memo ของท่านมีการดำเนินการ: {action_label}โดย {actor_name}
เลขที่: {memo_number}
เรื่อง: {title}

เปิดดูฟอร์ม Memo ฉบับเต็ม: {memo_link}`;

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function replaceVariables(
  template: string,
  vars: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{${key}}`, value);
  }
  return result;
}

export function createTransporter(smtp: SmtpConfig) {
  const port = Number(smtp.port) || 587;
  const secure =
    port === 465 ? true : port === 587 ? false : Boolean(smtp.secure);
  return nodemailer.createTransport({
    host: smtp.host,
    port,
    secure,
    auth: smtp.user
      ? { user: smtp.user, pass: smtp.password || '' }
      : undefined,
    tls: { rejectUnauthorized: false },
  });
}

export function buildSender(smtp: SmtpConfig): string {
  const name = (smtp.fromName || '').trim();
  const email = (smtp.fromEmail || '').trim();
  const user = (smtp.user || '').trim();
  if (name && email) return `"${name}" <${email}>`;
  if (email) return email;
  if (name && user) return `"${name}" <${user}>`;
  if (name) return name;
  return 'MemoHub';
}

function formatThaiDateTime(d: Date): string {
  const date = d.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const time = d.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${date} ${time} น.`;
}

function resolveDisplayName(
  uid: string,
  userMap: Map<string, { displayName?: string }>
): string {
  return userMap.get(uid)?.displayName || uid;
}

/**
 * Compact memo detail summary for emails (NOT the full document form):
 * header line + detail rows + body text + approval status list.
 */
export function buildCompactMemoHtml(
  memo: Record<string, unknown>,
  templateFields: Array<{
    id: string;
    type: string;
    label: string;
    fieldConfig?: Record<string, unknown>;
  }>,
  userMap: Map<string, { displayName?: string; department?: string }>,
  baseUrl: string
): string {
  const formData = (memo.formData || {}) as Record<string, unknown>;
  const memoNumber = (memo.memoNumber as string) || '';
  const status = memo.status as string;
  const statusText =
    status === 'approved'
      ? 'อนุมัติแล้ว'
      : status === 'rejected'
        ? 'ถูกปฏิเสธ'
        : 'รออนุมัติ';
  const statusColor =
    status === 'approved'
      ? '#16a34a'
      : status === 'rejected'
        ? '#dc2626'
        : '#2563eb';

  // Company logo + number header
  const headerField = templateFields.find((f) => f.type === 'company_header');
  const headerConfig = (headerField?.fieldConfig || {}) as Record<string, unknown>;
  const logoUrl = resolveLogoAbsolute(
    headerField ? ((headerConfig.logoUrl as string) || '') : '',
    baseUrl
  );
  const companyName = (headerConfig.companyName as string) || '';

  // Detail rows from form_row (skip header-box fields shown in memo details)
  const skipNames = new Set([
    'RefNo',
    'refNo',
    'quotationNo',
    'jobNo',
    'date',
  ]);
  let detailRows = '';
  for (const field of templateFields) {
    if (field.type !== 'form_row') continue;
    const config = (field.fieldConfig || {}) as Record<string, unknown>;
    const fields = (config.fields as Array<{ name: string; label: string; type: string }>) || [];
    const data = (formData[field.id] as Record<string, unknown>) || {};
    for (const f of fields) {
      if (skipNames.has(f.name)) continue;
      const raw = data[f.name];
      let display: string;
      if (f.type === 'user_dropdown') {
        display =
          typeof raw === 'string' && raw
            ? escapeHtml(resolveDisplayName(raw, userMap))
            : '-';
      } else if (f.type === 'user_multiselect') {
        const ids = Array.isArray(raw) ? (raw as string[]) : [];
        display =
          ids.length > 0
            ? ids.map((id) => escapeHtml(resolveDisplayName(id, userMap))).join(', ')
            : '-';
      } else {
        const str = (raw as string) || '';
        display = str ? escapeHtml(str) : '-';
      }
      detailRows += `<tr><td style="padding:6px 10px;font-weight:600;width:170px;background:#f8fafc;border-bottom:1px solid #e2e8f0;vertical-align:top;">${escapeHtml(f.label)}</td><td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;">${display}</td></tr>`;
    }
  }

  // Body text
  let bodyHtml = '';
  for (const field of templateFields) {
    if (field.type !== 'body_text') continue;
    const val = (formData[field.id] as string) || '';
    if (val) {
      bodyHtml += `<p style="font-size:13px;margin:0 0 4px;font-weight:600;">${escapeHtml(field.label || 'เนื้อหา')}</p><div style="border:1px solid #e2e8f0;border-radius:4px;padding:10px;font-size:13px;white-space:pre-wrap;">${escapeHtml(val)}</div>`;
    }
  }

  // Approval status list
  let approvalHtml = '';
  for (const field of templateFields) {
    const val = formData[field.id];
    if (!val || typeof val !== 'object' || Array.isArray(val)) continue;
    const cols = val as Record<string, Record<string, string>>;
    const colKeys = Object.keys(cols)
      .filter((k) => k.startsWith('col_'))
      .sort((a, b) => parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]));
    if (colKeys.length === 0) continue;
    approvalHtml += '<p style="font-weight:600;font-size:13px;margin:12px 0 6px;">สถานะการอนุมัติ:</p>';
    for (const colKey of colKeys) {
      const col = cols[colKey];
      if (!col) continue;
      const icon = col.signed ? '✓' : '○';
      const color = col.signed ? '#16a34a' : '#f59e0b';
      const title = col.colTitle || (colKey === 'col_0' ? 'ผู้ขออนุมัติ' : 'ผู้อนุมัติ');
      approvalHtml += `<p style="margin:4px 0;font-size:13px;"><span style="color:${color};font-weight:600;">${icon}</span> <strong>${escapeHtml(title)}</strong> — ${escapeHtml(col.name || '-')}`;
      if (col.signerTitle) approvalHtml += ` (${escapeHtml(col.signerTitle)})`;
      if (col.signed && col.date) approvalHtml += ` <span style="color:#94a3b8;font-size:11px;">${escapeHtml(col.date)}${col.time ? ` ${escapeHtml(col.time)}` : ''}</span>`;
      approvalHtml += '</p>';
    }
  }

  return `
    <div style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin:16px 0;">
      <div style="background:#f8fafc;padding:10px 14px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;gap:10px;">
        ${logoUrl ? `<img src="${logoUrl}" style="max-height:32px;" alt="logo" />` : ''}
        <div>
          <div style="font-weight:700;font-size:14px;color:#0f172a;">${escapeHtml(memoNumber)}</div>
          ${companyName ? `<div style="font-size:11px;color:#64748b;">${escapeHtml(companyName)}</div>` : ''}
        </div>
        <span style="margin-left:auto;color:${statusColor};font-size:12px;font-weight:700;">${statusText}</span>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">${detailRows}</table>
      <div style="padding:10px 14px;">${bodyHtml}${approvalHtml}</div>
    </div>`;
}

/** Create a view-only token for the public full-memo page. */
export async function createViewToken(memoId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const now = new Date();
  await addDoc(collection(db, 'memoViewTokens'), {
    token,
    memoId,
    used: false,
    createdAt: now,
    expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
  });
  return token;
}

export function buildViewUrl(baseUrl: string, token: string): string {
  return `${baseUrl}/memo-view?token=${token}`;
}

interface OwnerNotifyInput {
  memoId: string;
  actorId?: string;
  actorName: string;
  action: 'approve' | 'reject';
  remark?: string;
  baseUrl: string;
}

/**
 * Send a notification email to the memo owner after someone approves/rejects.
 * Never throws — failures are logged and returned as { ok: false }.
 * Fire-and-forget safe: callers must NOT await this on the critical path.
 */
export async function sendOwnerNotification(
  input: OwnerNotifyInput
): Promise<{ ok: boolean; message?: string }> {
  try {
    const { memoId, actorName, action, remark, baseUrl } = input;

    const settingsDoc = await getDoc(doc(db, 'settings', 'global'));
    const settings = settingsDoc.data();
    const smtp = settings?.smtp as SmtpConfig | undefined;
    if (!smtp?.host || !smtp.user || !smtp.password) {
      return { ok: false, message: 'SMTP not configured' };
    }

    const memoDoc = await getDoc(doc(db, 'memos', memoId));
    if (!memoDoc.exists()) return { ok: false, message: 'Memo not found' };
    const memo = memoDoc.data()!;

    // Resolve owner email
    const ownerId = memo.ownerId as string;
    if (!ownerId) return { ok: false, message: 'No owner' };
    const ownerDoc = await getDoc(doc(db, 'users', ownerId));
    const ownerEmail = ownerDoc.exists()
      ? ((ownerDoc.data().email as string) || '')
      : '';
    if (!ownerEmail) return { ok: false, message: 'Owner has no email' };

    // Template fields for the summary
    let templateFields: Array<{
      id: string;
      type: string;
      label: string;
      fieldConfig?: Record<string, unknown>;
    }> = [];
    if (memo.templateId) {
      const templateDoc = await getDoc(doc(db, 'memoTemplates', memo.templateId));
      if (templateDoc.exists()) {
        templateFields = (templateDoc.data().fields || []) as typeof templateFields;
      }
    }

    const usersSnapshot = await getDocs(collection(db, 'users'));
    const userMap = new Map<string, { displayName?: string; department?: string }>();
    for (const d of usersSnapshot.docs) {
      const u = d.data() as Record<string, unknown>;
      userMap.set(d.id, {
        displayName: u.displayName as string,
        department: u.department as string,
      });
    }

    const emailFormat = (settings?.emailFormat || {}) as OwnerMailFormat & {
      subject?: string;
      body?: string;
    };
    const now = new Date();
    const actedAt = formatThaiDateTime(now);
    const actionLabel = action === 'approve' ? 'อนุมัติ' : 'ถูกปฏิเสธ';
    const isApprove = action === 'approve';

    const viewToken = await createViewToken(memoId);
    const memoLink = buildViewUrl(baseUrl, viewToken);

    const vars: Record<string, string> = {
      memo_number: (memo.memoNumber as string) || memoId,
      title: (memo.title as string) || '',
      owner_name: (memo.ownerName as string) || '',
      department: (memo.department as string) || '',
      status:
        (memo.status as string) === 'approved'
          ? 'อนุมัติแล้ว'
          : (memo.status as string) === 'rejected'
            ? 'ถูกปฏิเสธ'
            : 'รออนุมัติ',
      actor_name: actorName,
      action_label: actionLabel,
      remark: remark || '-',
      memo_link: memoLink,
      acted_at: actedAt,
    };

    const subject = replaceVariables(
      emailFormat.ownerSubject || DEFAULT_OWNER_SUBJECT,
      vars
    );
    const bodyTemplate = emailFormat.ownerBody || DEFAULT_OWNER_BODY;
    const bodyHtml = replaceVariables(bodyTemplate, vars)
      .split('\n')
      .map((line) => `<p style="margin:4px 0;">${line || '&nbsp;'}</p>`)
      .join('');

    const stampColor = isApprove ? '#16a34a' : '#dc2626';
    const stampBg = isApprove ? '#f0fdf4' : '#fef2f2';
    const stampText = isApprove ? '✓ อนุมัติแล้ว' : '✗ ถูกปฏิเสธ';

    const summaryHtml = buildCompactMemoHtml(
      memo as Record<string, unknown>,
      templateFields,
      userMap,
      baseUrl
    );

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
  <h2 style="color:#1e293b;">${escapeHtml(subject)}</h2>
  <div style="background:${stampBg};border:2px solid ${stampColor};border-radius:8px;padding:14px;margin:16px 0;">
    <p style="margin:0;font-size:16px;font-weight:800;color:${stampColor};">${stampText}</p>
    <p style="margin:8px 0 0;font-size:13px;color:#334155;">โดย <strong>${escapeHtml(actorName)}</strong> · ${escapeHtml(actedAt)}</p>
    ${!isApprove ? `<p style="margin:8px 0 0;font-size:13px;color:#334155;"><strong>เหตุผล:</strong> ${escapeHtml(remark || '-')}</p>` : ''}
  </div>
  ${bodyHtml}
  ${summaryHtml}
  <div style="margin:24px 0;text-align:center;">
    <a href="${memoLink}" style="display:inline-block;padding:12px 32px;background:#0f172a;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">เปิดดูฟอร์ม Memo ฉบับเต็ม</a>
  </div>
  <hr style="border:1px solid #e2e8f0;margin:20px 0;" />
  <p style="color:#64748b;font-size:12px;text-align:center;">MemoHub Digital Memo & Approval System</p>
</body>
</html>`;

    const transporter = createTransporter(smtp);
    await transporter.sendMail({
      from: buildSender(smtp),
      to: ownerEmail,
      subject,
      replyTo: smtp.fromEmail || undefined,
      text: `${subject}\n\n${replaceVariables(bodyTemplate, vars)}`,
      html,
    });
    return { ok: true };
  } catch (e) {
    console.error('sendOwnerNotification failed:', e);
    return { ok: false, message: e instanceof Error ? e.message : 'Unknown' };
  }
}
