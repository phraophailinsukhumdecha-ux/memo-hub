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
import { resolveLogoForEmail } from '@/lib/logo';
import { resolveTypography, resolveFieldTypography } from '@/lib/typography';
import { MemoTypography, MemoAttachment, Approval } from '@/types';
import { getNextApprovalColumn } from '@/lib/approval-flow';
import { getAttachmentDriveUrl } from '@/lib/attachment-links';
import { formatThaiDateTime } from '@/lib/datetime';
import {
  buildEmailVariables,
  replaceEmailVariables,
  DEFAULT_APPROVER_SUBJECT,
  DEFAULT_APPROVER_BODY,
  DEFAULT_OWNER_SUBJECT,
  DEFAULT_OWNER_BODY,
} from '@/lib/email-variables';

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
  approverSubject?: string;
  approverBody?: string;
}

/** Kept for backwards compatibility — templates live in email-variables.ts. */
export { DEFAULT_OWNER_SUBJECT, DEFAULT_OWNER_BODY };

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Kept for backwards compatibility. */
export const replaceVariables = replaceEmailVariables;

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

/** Font stack for email chrome from template typography (Sukhumvit default). */
export function resolveMailFontFamily(typography?: MemoTypography): string {
  return resolveTypography(typography || null).fontFamily;
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

function resolveDisplayName(
  uid: string,
  userMap: Map<string, { displayName?: string }>
): string {
  return userMap.get(uid)?.displayName || uid;
}

/**
 * Standalone approval status grid HTML for emails.
 * Shows ✓/✗/○ for each approver with name, title, date/time.
 */
export function buildApprovalStatusHtml(
  formData: Record<string, unknown>,
  templateFields: Array<{ id: string; type: string; label: string; fieldConfig?: Record<string, unknown> }>,
  typography?: MemoTypography,
  approvals?: Approval[],
  rejectionComment?: string
): string {
  const typo = resolveTypography(typography || null);
  // Placeholder comments written by the email action flow are not real remarks.
  const autoComments = new Set(['อนุมัติผ่านอีเมล', 'ปฏิเสธผ่านอีเมล', 'ดำเนินการผ่านอีเมล']);
  let html = '';
  for (const field of templateFields) {
    const val = formData[field.id];
    if (!val || typeof val !== 'object' || Array.isArray(val)) continue;
    const cols = val as Record<string, Record<string, string>>;
    const colKeys = Object.keys(cols)
      .filter((k) => k.startsWith('col_'))
      .sort((a, b) => parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]));
    if (colKeys.length === 0) continue;
    html += `<p style="font-weight:600;font-size:${typo.baseFontSize}px;margin:12px 0 6px;">สถานะการอนุมัติ:</p>`;
    for (const colKey of colKeys) {
      const col = cols[colKey];
      if (!col) continue;
      const isRequester = colKey === 'col_0';
      let icon: string;
      let color: string;
      if (isRequester) {
        icon = '✓';
        color = '#16a34a';
      } else if (col.action === 'reject') {
        icon = '✗';
        color = '#dc2626';
      } else if (col.signed) {
        icon = '✓';
        color = '#16a34a';
      } else {
        icon = '○';
        color = '#f59e0b';
      }
      const title = col.colTitle || (colKey === 'col_0' ? 'ผู้ขออนุมัติ' : 'ผู้อนุมัติ');
      const approval = approvals?.find(
        (item) =>
          item.approvalLevel === colKey ||
          (item.approverId && col.userId && item.approverId === col.userId) ||
          (item.approverName && col.name && item.approverName === col.name)
      );
      const approvalComment = ((approval?.comment || '') as string).trim();
      const channel = approval?.channel || (autoComments.has(approvalComment) ? 'email' : undefined);

      html += `<p style="margin:4px 0;font-size:${typo.baseFontSize}px;"><span style="color:${color};font-weight:600;">${icon}</span> <strong>${escapeHtml(title)}</strong> — ${escapeHtml(col.name || '-')}`;
      if (col.signerTitle) html += ` (${escapeHtml(col.signerTitle)})`;
      if (!isRequester && channel) html += ` <span style="color:#64748b;font-size:11px;">(${channel === 'email' ? 'ผ่านอีเมล' : 'ผ่านระบบ'})</span>`;
      if ((col.signed || col.action) && col.date) html += ` <span style="color:#94a3b8;font-size:11px;">${escapeHtml(col.date)}${col.time ? ` ${escapeHtml(col.time)}` : ''}</span>`;
      html += '</p>';

      // Remark / rejection reason, shown directly under the person who wrote it.
      const rawRemark = approvalComment || ((col.comment || '') as string).trim();
      const isRejected = col.action === 'reject' || approval?.action === 'reject';
      const fallbackRemark = isRejected ? (rejectionComment || '').trim() : '';
      const remark = rawRemark || fallbackRemark;
      if (remark && !autoComments.has(remark)) {
        html += `<p style="margin:0 0 6px 20px;font-size:${Math.max(11, typo.baseFontSize - 3)}px;color:#475569;">หมายเหตุ: ${escapeHtml(remark)}</p>`;
      }
    }
  }
  return html;
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
  baseUrl: string,
  typography?: MemoTypography
): string {
  const typo = resolveTypography(typography || null);
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
  const logoUrl = resolveLogoForEmail(
    headerField ? ((headerConfig.logoUrl as string) || '') : ''
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
  type SummaryField = {
    id: string;
    type: string;
    label: string;
    fieldConfig?: Record<string, unknown>;
    typography?: MemoTypography;
  };
  const sFields = templateFields as SummaryField[];
  let detailRows = '';
  for (const field of sFields) {
    if (field.type !== 'form_row') continue;
    const ft = resolveFieldTypography(typography, field.typography);
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
      detailRows += `<tr><td style="padding:6px 10px;font-weight:${ft.boldLabels ? 600 : 400};font-size:${ft.baseFontSize}px;width:170px;background:#f8fafc;border-bottom:1px solid #e2e8f0;vertical-align:top;">${escapeHtml(f.label)}</td><td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:${ft.baseFontSize}px;line-height:${ft.lineHeight};text-align:${ft.textAlign};font-weight:${ft.boldBody ? 700 : 400};">${display}</td></tr>`;
    }
  }

  // Body text
  let bodyHtml = '';
  for (const field of sFields) {
    if (field.type !== 'body_text') continue;
    const val = (formData[field.id] as string) || '';
    if (val) {
      const ft = resolveFieldTypography(typography, field.typography);
      bodyHtml += `<p style="font-size:${ft.baseFontSize}px;margin:0 0 4px;font-weight:${ft.boldLabels ? 600 : 400};">${escapeHtml(field.label || 'เนื้อหา')}</p><div style="border:1px solid #e2e8f0;border-radius:4px;padding:10px;font-size:${ft.baseFontSize}px;line-height:${ft.lineHeight};text-align:${ft.textAlign};font-weight:${ft.boldBody ? 700 : 400};white-space:pre-wrap;">${escapeHtml(val)}</div>`;
    }
  }

  // Attachments (shown as Google Drive links)
  let attachmentsHtml = '';
  for (const field of sFields) {
    if (field.type !== 'attachment') continue;
    const rawFiles = formData[field.id];
    const files = (Array.isArray(rawFiles) ? rawFiles : []).filter(
      (item): item is MemoAttachment =>
        Boolean(item) && typeof item === 'object' && typeof (item as MemoAttachment).fileId === 'string'
    );
    if (files.length === 0) continue;
    const items = files
      .map(
        (file) =>
          `<li style="margin:2px 0;"><a href="${escapeHtml(getAttachmentDriveUrl(file))}" target="_blank" rel="noreferrer" style="color:#1d4ed8;text-decoration:underline;">${escapeHtml(file.name)}</a></li>`
      )
      .join('');
    attachmentsHtml += `<div style="margin-top:10px;"><p style="font-weight:600;font-size:${typo.baseFontSize}px;margin:0 0 4px;">ไฟล์แนบ (${files.length})</p><ul style="margin:0;padding-left:18px;font-size:${typo.baseFontSize}px;">${items}</ul></div>`;
  }

  // Approval status list
  let approvalHtml = '';
  approvalHtml = buildApprovalStatusHtml(
    formData,
    templateFields,
    typography,
    memo.approvals as Approval[] | undefined,
    memo.rejectionComment as string | undefined
  );

  return `
    <div style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin:16px 0;font-family:${typo.fontFamily};">
      <div style="background:#f8fafc;padding:10px 14px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;gap:10px;">
        ${logoUrl ? `<img src="${logoUrl}" style="max-height:32px;" alt="logo" />` : ''}
        <div>
          <div style="font-weight:700;font-size:14px;color:#0f172a;">${escapeHtml(memoNumber)}</div>
          ${companyName ? `<div style="font-size:11px;color:#64748b;">${escapeHtml(companyName)}</div>` : ''}
        </div>
        <span style="margin-left:auto;color:${statusColor};font-size:12px;font-weight:700;">${statusText}</span>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:${typo.baseFontSize}px;">${detailRows}</table>
      <div style="padding:10px 14px;">${bodyHtml}${attachmentsHtml}${approvalHtml}</div>
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
    let templateTypo: MemoTypography | undefined;
    if (memo.templateId) {
      const templateDoc = await getDoc(doc(db, 'memoTemplates', memo.templateId));
      if (templateDoc.exists()) {
        const templateData = templateDoc.data();
        templateFields = (templateData.fields || []) as typeof templateFields;
        templateTypo = templateData.typography as MemoTypography | undefined;
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

    const vars = buildEmailVariables({
      memo: memo as Record<string, unknown>,
      templateFields,
      baseUrl,
      memoId,
      recipientName: (memo.ownerName as string) || '',
      actorName,
      actionLabel,
      remark: remark || '-',
      actedAt,
      memoLink,
    });

    const subject = replaceEmailVariables(
      emailFormat.ownerSubject || DEFAULT_OWNER_SUBJECT,
      vars
    );
    const bodyTemplate = emailFormat.ownerBody || DEFAULT_OWNER_BODY;
    const bodyHtml = replaceEmailVariables(bodyTemplate, vars)
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
      baseUrl,
      templateTypo
    );

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:${resolveMailFontFamily(templateTypo)};max-width:600px;margin:0 auto;padding:20px;">
  <h2 style="color:#1e293b;">${escapeHtml(subject)}</h2>
  <div style="background:${stampBg};border:2px solid ${stampColor};border-radius:8px;padding:14px;margin:16px 0;">
    <p style="margin:0;font-size:16px;font-weight:800;color:${stampColor};">${stampText}</p>
    <p style="margin:8px 0 0;font-size:13px;color:#334155;">โดย <strong>${escapeHtml(actorName)}</strong> · ${escapeHtml(actedAt)}</p>
    ${!isApprove ? `<p style="margin:8px 0 0;font-size:13px;color:#334155;"><strong>เหตุผล:</strong> ${escapeHtml(remark || '-')}</p>` : ''}
  </div>
  ${bodyHtml}
  ${summaryHtml}
  <div style="margin:24px 0;text-align:center;">
    <a href="${memoLink}" style="display:inline-block;padding:12px 32px;background:#0f172a;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">ดูเอกสาร</a>
  </div>
  <div style="text-align:center;margin-bottom:16px;">
    <a href="${baseUrl}/home" style="color:#2563eb;text-decoration:underline;font-size:13px;">เข้าสู่ระบบเพื่อดูเอกสาร</a>
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

interface ApproverNotifyInput {
  memoId: string;
  actorId: string;
  actorName: string;
  action: 'approve' | 'reject';
  remark?: string;
  baseUrl: string;
}

/**
 * Send notification emails to OTHER approvers (not the actor) after someone acts.
 * Only emails approvers who haven't acted yet (not signed, not rejected).
 * Never throws — fire-and-forget safe.
 */
export async function sendApproverNotifications(
  input: ApproverNotifyInput
): Promise<{ ok: boolean; sent?: number; message?: string }> {
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

    const formData = (memo.formData || {}) as Record<string, unknown>;

    // Sequential flow: only the NEXT approver in the chain receives a follow-up
    // action email. After a rejection the memo is closed, so nothing is sent.
    if (action !== 'approve') return { ok: true, sent: 0 };

    const nextColumn = getNextApprovalColumn(formData);
    if (!nextColumn) return { ok: true, sent: 0 };

    interface ApproverInfo {
      email: string;
      name: string;
      userId: string;
      colKey: string;
      colTitle: string;
    }

    const pendingApprovers: ApproverInfo[] = [
      {
        email: '',
        name: nextColumn.name || '',
        userId: nextColumn.userId || '',
        colKey: nextColumn.key,
        colTitle: 'ผู้อนุมัติ',
      },
    ];

    // Resolve emails from users collection
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const allUsers = usersSnapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Record<string, unknown>),
    })) as Array<{ id: string; email?: string; displayName?: string }>;

    for (const approver of pendingApprovers) {
      // Match by userId first (reliable), then by displayName (fallback)
      const user = allUsers.find((u) => approver.userId && u.id === approver.userId)
        || allUsers.find((u) => u.displayName === approver.name);
      if (user?.email) approver.email = user.email;
    }

    // Load template fields for summary
    let templateFields: Array<{ id: string; type: string; label: string; fieldConfig?: Record<string, unknown> }> = [];
    let templateTypo: MemoTypography | undefined;
    if (memo.templateId) {
      const templateDoc = await getDoc(doc(db, 'memoTemplates', memo.templateId));
      if (templateDoc.exists()) {
        const templateData = templateDoc.data();
        templateFields = (templateData.fields || []) as typeof templateFields;
        templateTypo = templateData.typography as MemoTypography | undefined;
      }
    }

    const userMap = new Map<string, { displayName?: string; department?: string }>();
    for (const d of usersSnapshot.docs) {
      const u = d.data() as Record<string, unknown>;
      userMap.set(d.id, {
        displayName: u.displayName as string,
        department: u.department as string,
      });
    }

    const emailFormat = (settings?.emailFormat || {}) as Record<string, string>;
    const now = new Date();
    const actedAt = formatThaiDateTime(now);
    const actionLabel = action === 'approve' ? 'อนุมัติ' : 'ถูกปฏิเสธ';

    const viewToken = await createViewToken(memoId);
    const memoLink = buildViewUrl(baseUrl, viewToken);

    const transporter = createTransporter(smtp);
    const sender = buildSender(smtp);
    let sentCount = 0;

    for (const approver of pendingApprovers) {
      if (!approver.email) continue;

      // One-time action token so the approver can approve/reject straight from
      // the email — same flow as the first reviewer (checker) email.
      const actionToken = crypto.randomBytes(32).toString('hex');
      await addDoc(collection(db, 'emailTokens'), {
        token: actionToken,
        memoId,
        approverId: approver.userId,
        approverName: approver.name,
        toEmail: approver.email,
        action: null,
        used: false,
        createdAt: now,
      });
      const approveUrl = `${baseUrl}/email-approve?token=${actionToken}`;
      const cancelUrl = `${baseUrl}/email-cancel?token=${actionToken}`;

      const vars = buildEmailVariables({
        memo: memo as Record<string, unknown>,
        templateFields,
        baseUrl,
        memoId,
        approverName: approver.name,
        recipientName: approver.name,
        actorName,
        actionLabel,
        remark: remark || '-',
        actedAt,
        memoLink,
      });

      const subjectTemplate = emailFormat.approverSubject || DEFAULT_APPROVER_SUBJECT;
      const bodyTemplate = emailFormat.approverBody || DEFAULT_APPROVER_BODY;
      const subject = replaceEmailVariables(subjectTemplate, vars);

      const bodyText = replaceEmailVariables(bodyTemplate, vars);
      const bodyHtml = bodyText
        .split('\n')
        .map((line) => `<p style="margin:4px 0;">${line || '&nbsp;'}</p>`)
        .join('');

      // buildCompactMemoHtml already includes the approval-status list, so we
      // must not render buildApprovalStatusHtml again (it would duplicate).
      const summaryHtml = buildCompactMemoHtml(
        memo as Record<string, unknown>,
        templateFields,
        userMap,
        baseUrl,
        templateTypo
      );

      const htmlEmail = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:${resolveMailFontFamily(templateTypo)};max-width:600px;margin:0 auto;padding:20px;">
  <h2 style="color:#1e293b;">${escapeHtml(subject)}</h2>
  ${bodyHtml}
  ${summaryHtml}
  <div style="margin:24px 0;text-align:center;">
    <a href="${approveUrl}" style="display:inline-block;padding:12px 32px;background:#16a34a;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;margin:0 8px;">อนุมัติ</a>
    <a href="${cancelUrl}" style="display:inline-block;padding:12px 32px;background:#dc2626;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;margin:0 8px;">ปฏิเสธ</a>
  </div>
  <div style="margin:0 0 20px;text-align:center;">
    <a href="${baseUrl}/home" style="display:inline-block;padding:10px 24px;background:#0f172a;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">เข้าสู่ระบบเพื่ออนุมัติ</a>
  </div>
  <div style="text-align:center;margin-bottom:16px;">
    <a href="${memoLink}" style="color:#2563eb;text-decoration:underline;font-size:13px;">ดูเอกสารฉบับเต็ม (ไม่ต้องเข้าสู่ระบบ)</a>
  </div>
  <hr style="border:1px solid #e2e8f0;margin:20px 0;" />
  <p style="color:#64748b;font-size:12px;text-align:center;">MemoHub Digital Memo & Approval System</p>
</body>
</html>`;

      try {
        await transporter.sendMail({
          from: sender,
          to: approver.email,
          subject,
          replyTo: smtp.fromEmail || undefined,
          text: `${subject}\n\n${replaceVariables(bodyTemplate, vars)}`,
          html: htmlEmail,
        });
        sentCount++;
      } catch (e) {
        console.error(`sendApproverNotifications: failed to email ${approver.email}:`, e);
      }
    }

    return { ok: true, sent: sentCount };
  } catch (e) {
    console.error('sendApproverNotifications failed:', e);
    return { ok: false, message: e instanceof Error ? e.message : 'Unknown' };
  }
}
