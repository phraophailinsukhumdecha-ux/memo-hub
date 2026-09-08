import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs, addDoc } from 'firebase/firestore';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  fromEmail: string;
  fromName: string;
  encryption?: string;
}

interface EmailFormat {
  subject: string;
  body: string;
  preview?: string;
}

const ERR = {
  EAUTH: 'EAUTH',
  ECONNREFUSED: 'ECONNREFUSED',
  ESOCKET: 'ESOCKET',
  EVALIDATE: 'EVALIDATE',
  EUNKNOWN: 'EUNKNOWN',
};

function classifyError(e: Error, port: number, host: string) {
  const msg = String(e?.message || '');
  if (/Unexpected socket close|socket hang up|ECONNRESET/i.test(msg)) {
    const hint = port === 465
      ? 'Port 465 ต้องใช้ SSL'
      : port === 587
        ? 'Port 587 ต้องใช้ TLS'
        : 'ตรวจสอบ Port และ Encryption';
    return { code: ERR.ESOCKET, message: `การเชื่อมต่อ SMTP ถูกตัด — ${hint}` };
  }
  if (/Invalid login|Username and Password not accepted|535|EAUTH/i.test(msg)) {
    return { code: ERR.EAUTH, message: 'ยืนยันตัวตน SMTP ไม่ผ่าน (EAUTH)' };
  }
  if (/ENOTFOUND|getaddrinfo|ECONNREFUSED/i.test(msg)) {
    return { code: ERR.ECONNREFUSED, message: `ติดต่อ SMTP Host ไม่ได้ (${host || '-'})` };
  }
  if (/connect ETIMEDOUT|Timeout/i.test(msg)) {
    return { code: ERR.ECONNREFUSED, message: 'เชื่อมต่อ SMTP timeout' };
  }
  return { code: ERR.EUNKNOWN, message: msg };
}

function validateSMTP(smtp: SmtpConfig) {
  if (!smtp?.host) return { ok: false, code: ERR.EVALIDATE, message: 'ข้อมูลไม่ครบ — ยังไม่ได้ตั้งค่า SMTP Host' };
  if (!smtp.user) return { ok: false, code: ERR.EVALIDATE, message: 'ข้อมูลไม่ครบ — ยังไม่ได้ตั้งค่า SMTP Username' };
  if (!smtp.password) return { ok: false, code: ERR.EVALIDATE, message: 'ข้อมูลไม่ครบ — ยังไม่ได้ตั้งค่า SMTP Password' };
  return { ok: true };
}

function createTransporter(smtp: SmtpConfig) {
  const port = Number(smtp.port) || 587;
  const secure = port === 465 ? true : port === 587 ? false : Boolean(smtp.secure);
  return nodemailer.createTransport({
    host: smtp.host,
    port,
    secure,
    auth: smtp.user ? { user: smtp.user, pass: smtp.password || '' } : undefined,
    tls: { rejectUnauthorized: false },
  });
}

function processContent(body: string) {
  if (!body) return { text: '', html: '' };
  const text = body;
  const html = body
    .replace(/\n/g, '<br />')
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#2563eb;text-decoration:underline;">$1</a>');
  return { text, html };
}

function buildSender(smtp: SmtpConfig) {
  const name = (smtp.fromName || '').trim();
  const email = (smtp.fromEmail || '').trim();
  const user = (smtp.user || '').trim();
  if (name && email) return `"${name}" <${email}>`;
  if (email) return email;
  if (name && user) return `"${name}" <${user}>`;
  if (name) return name;
  return 'MemoHub';
}

function replaceVariables(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{${key}}`, value);
  }
  return result;
}

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderFormRowHtml(value: Record<string, string>, fieldConfig: Record<string, unknown>): string {
  const fields = (fieldConfig.fields as Array<{ name: string; label: string }>) || [];
  if (fields.length === 0) return '';
  let html = '<table style="width:100%;border-collapse:collapse;font-size:13px;">';
  for (let i = 0; i < fields.length; i += 2) {
    const left = fields[i];
    const right = fields[i + 1];
    html += '<tr>';
    html += `<td style="padding:6px 8px;border:1px solid #e2e8f0;font-weight:600;width:120px;background:#f8fafc;">${escapeHtml(left.label)}</td>`;
    html += `<td style="padding:6px 8px;border:1px solid #e2e8f0;">${escapeHtml(value[left.name] || '')}</td>`;
    if (right) {
      html += `<td style="padding:6px 8px;border:1px solid #e2e8f0;font-weight:600;width:140px;background:#f8fafc;">${escapeHtml(right.label)}</td>`;
      html += `<td style="padding:6px 8px;border:1px solid #e2e8f0;">${escapeHtml(value[right.name] || '')}</td>`;
    } else {
      html += '<td style="padding:6px 8px;border:1px solid #e2e8f0;" colspan="2"></td>';
    }
    html += '</tr>';
  }
  html += '</table>';
  return html;
}

function renderBodyTextHtml(value: string, fieldConfig: Record<string, unknown>): string {
  const lines = (fieldConfig.lines as number) || 12;
  if (value) {
    return `<div style="border:1px solid #e2e8f0;border-radius:4px;padding:10px;font-size:13px;white-space:pre-wrap;">${escapeHtml(value)}</div>`;
  }
  return `<div style="border:1px solid #e2e8f0;border-radius:4px;padding:10px;min-height:${lines * 20}px;color:#94a3b8;font-size:13px;">(ไม่มีเนื้อหา)</div>`;
}

function renderCheckboxGroupHtml(value: string[], fieldConfig: Record<string, unknown>): string {
  const options = (fieldConfig.options as string[]) || [];
  if (options.length === 0) return '';
  let html = '<div style="font-size:13px;">';
  for (const opt of options) {
    const checked = value.includes(opt);
    html += `<span style="margin-right:12px;">${checked ? '☑' : '☐'} ${escapeHtml(opt)}</span>`;
  }
  html += '</div>';
  return html;
}

function renderDropdownSelectHtml(value: string, fieldConfig: Record<string, unknown>): string {
  const options = (fieldConfig.options as string[]) || [];
  const selected = options.find((o) => o === value);
  return `<span style="font-size:13px;">${escapeHtml(selected || value || '-')}</span>`;
}

function renderApprovalGridHtml(value: Record<string, Record<string, string>>): string {
  const colKeys = Object.keys(value).filter((k) => k.startsWith('col_')).sort((a, b) => {
    const ai = parseInt(a.split('_')[1]);
    const bi = parseInt(b.split('_')[1]);
    return ai - bi;
  });

  if (colKeys.length === 0) return '';

  let html = '<div style="margin:12px 0;">';
  html += '<p style="font-weight:600;font-size:13px;margin-bottom:8px;">สถานะการอนุมัติ:</p>';

  for (const colKey of colKeys) {
    const col = value[colKey];
    if (!col) continue;
    const name = col.name || '';
    const signerTitle = col.signerTitle || '';
    const signed = col.signed;
    const icon = signed ? '✓' : '○';
    const color = signed ? '#16a34a' : '#f59e0b';
    const title = col.colTitle || (colKey === 'col_0' ? 'ผู้ขออนุมัติ' : 'ผู้อนุมัติ');

    html += `<p style="margin:4px 0;font-size:13px;">`;
    html += `<span style="color:${color};font-weight:600;">${icon}</span> `;
    html += `<strong>${escapeHtml(title)}</strong> — ${escapeHtml(name)}`;
    if (signerTitle) html += ` (${escapeHtml(signerTitle)})`;
    if (signed && col.date) html += ` <span style="color:#94a3b8;font-size:11px;">${escapeHtml(col.date)}</span>`;
    html += '</p>';
  }

  html += '</div>';
  return html;
}

function renderMemoPreviewHtml(memo: Record<string, unknown>, templateFields: Array<{ id: string; type: string; label: string; fieldConfig?: Record<string, unknown> }>, emailFormatPreview?: string): string {
  const formData = (memo.formData || {}) as Record<string, unknown>;
  const deadlineRaw = memo.deadlineAt as { toDate?: () => Date } | Date | undefined;
  const deadlineDate = deadlineRaw && typeof deadlineRaw === 'object' && 'toDate' in deadlineRaw && typeof deadlineRaw.toDate === 'function' ? deadlineRaw.toDate() : new Date(deadlineRaw as Date | number | string);
  const buddhistYear = deadlineDate.getFullYear() + 543;
  const deadlineStr = `${deadlineDate.getDate()} ${deadlineDate.toLocaleDateString('th-TH', { month: 'long' })} ${buddhistYear}`;
  const createdRaw = memo.createdAt as { toDate?: () => Date } | Date | undefined;
  const createdDate = createdRaw && typeof createdRaw === 'object' && 'toDate' in createdRaw && typeof createdRaw.toDate === 'function' ? createdRaw.toDate() : new Date(createdRaw as Date | number | string);
  const createdStr = `${createdDate.getDate()} ${createdDate.toLocaleDateString('th-TH', { month: 'long' })} ${createdDate.getFullYear() + 543}`;

  const vars: Record<string, string> = {
    memo_number: (memo.memoNumber as string) || '',
    title: (memo.title as string) || '',
    owner_name: (memo.ownerName as string) || '',
    department: (memo.department as string) || '',
    status: memo.status === 'approved' ? 'อนุมัติแล้ว' : memo.status === 'rejected' ? 'ถูกปฏิเสธ' : 'รออนุมัติ',
    deadline: deadlineStr,
    created_at: createdStr,
  };

  let previewContent = '';

  if (emailFormatPreview && emailFormatPreview.trim()) {
    let rendered = replaceVariables(emailFormatPreview, vars);

    if (rendered.includes('{form_fields}')) {
      let formFieldsHtml = '';
      for (const field of templateFields) {
        if (field.type === 'section_title' || field.type === 'company_header' || field.type === 'approval_grid') continue;
        const value = formData[field.id];
        if (value === undefined || value === null) continue;

        let fieldHtml = '';
        if (field.type === 'form_row' && typeof value === 'object' && !Array.isArray(value)) {
          fieldHtml = renderFormRowHtml(value as Record<string, string>, field.fieldConfig || {});
        } else if (field.type === 'body_text' && typeof value === 'string') {
          fieldHtml = `<div style="margin:8px 0;"><p style="font-weight:600;font-size:12px;color:#64748b;margin-bottom:4px;">${escapeHtml(field.label)}</p>${renderBodyTextHtml(value, field.fieldConfig || {})}</div>`;
        } else if (field.type === 'checkbox_group' && Array.isArray(value)) {
          fieldHtml = `<div style="margin:8px 0;"><p style="font-weight:600;font-size:12px;color:#64748b;margin-bottom:4px;">${escapeHtml(field.label)}</p>${renderCheckboxGroupHtml(value, field.fieldConfig || {})}</div>`;
        } else if (field.type === 'dropdown_select' && typeof value === 'string') {
          fieldHtml = `<div style="margin:8px 0;"><p style="font-weight:600;font-size:12px;color:#64748b;margin-bottom:4px;">${escapeHtml(field.label)}</p>${renderDropdownSelectHtml(value, field.fieldConfig || {})}</div>`;
        }
        if (fieldHtml) formFieldsHtml += fieldHtml;
      }
      rendered = rendered.replace('{form_fields}', formFieldsHtml || '<p style="color:#94a3b8;font-size:13px;">(ไม่มีข้อมูลฟอร์ม)</p>');
    }

    if (rendered.includes('{body_text}')) {
      const bodyTextValue = formData.body_text as string || '';
      rendered = rendered.replace('{body_text}', bodyTextValue ? `<div style="margin:8px 0;"><p style="font-weight:600;font-size:12px;color:#64748b;margin-bottom:4px;">เนื้อหา</p>${renderBodyTextHtml(bodyTextValue, {})}</div>` : '');
    }

    if (rendered.includes('{approval_grid}')) {
      const gridValue = formData.approval_grid_1 as Record<string, Record<string, string>> || {};
      rendered = rendered.replace('{approval_grid}', renderApprovalGridHtml(gridValue));
    }

    previewContent = rendered;
  } else {
    let formFieldsHtml = '';
    for (const field of templateFields) {
      if (field.type === 'section_title' || field.type === 'company_header' || field.type === 'approval_grid') continue;
      const value = formData[field.id];
      if (value === undefined || value === null) continue;

      if (field.type === 'form_row' && typeof value === 'object' && !Array.isArray(value)) {
        formFieldsHtml += renderFormRowHtml(value as Record<string, string>, field.fieldConfig || {});
      } else if (field.type === 'body_text' && typeof value === 'string' && value) {
        formFieldsHtml += `<div style="margin:8px 0;"><p style="font-weight:600;font-size:12px;color:#64748b;margin-bottom:4px;">${escapeHtml(field.label)}</p>${renderBodyTextHtml(value, field.fieldConfig || {})}</div>`;
      } else if (field.type === 'checkbox_group' && Array.isArray(value) && value.length > 0) {
        formFieldsHtml += `<div style="margin:8px 0;"><p style="font-weight:600;font-size:12px;color:#64748b;margin-bottom:4px;">${escapeHtml(field.label)}</p>${renderCheckboxGroupHtml(value, field.fieldConfig || {})}</div>`;
      } else if (field.type === 'dropdown_select' && typeof value === 'string' && value) {
        formFieldsHtml += `<div style="margin:8px 0;"><p style="font-weight:600;font-size:12px;color:#64748b;margin-bottom:4px;">${escapeHtml(field.label)}</p>${renderDropdownSelectHtml(value, field.fieldConfig || {})}</div>`;
      }
    }

    const gridValue = formData.approval_grid_1 as Record<string, Record<string, string>> || {};
    const gridHtml = renderApprovalGridHtml(gridValue);

    previewContent = `
      <div style="margin:8px 0;"><p style="font-weight:600;font-size:12px;color:#64748b;margin-bottom:4px;">ผู้สร้าง</p><span style="font-size:13px;">${escapeHtml((memo.ownerName as string) || '')} (${escapeHtml((memo.department as string) || '')})</span></div>
      <div style="margin:8px 0;"><p style="font-weight:600;font-size:12px;color:#64748b;margin-bottom:4px;">Deadline</p><span style="font-size:13px;">${deadlineStr}</span></div>
      ${formFieldsHtml}
      ${gridHtml}
    `;
  }

  const memoNumber = (memo.memoNumber as string) || '';
  const memoTitle = (memo.title as string) || '';
  const statusText = memo.status === 'approved' ? 'อนุมัติแล้ว' : memo.status === 'rejected' ? 'ถูกปฏิเสธ' : 'รออนุมัติ';
  const statusColor = memo.status === 'approved' ? '#16a34a' : memo.status === 'rejected' ? '#dc2626' : '#2563eb';

  return `
    <div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin:16px 0;">
      <div style="background:#f8fafc;padding:12px 16px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <strong style="font-size:14px;">${escapeHtml(memoNumber)}</strong> — <span style="font-size:14px;">${escapeHtml(memoTitle)}</span>
        </div>
        <span style="color:${statusColor};font-size:12px;font-weight:600;">${statusText}</span>
      </div>
      <div style="padding:16px;">
        ${previewContent}
      </div>
    </div>
  `;
}

export async function POST(request: NextRequest) {
  try {
    const { memoId, toEmails } = await request.json() as { memoId: string; toEmails: string[] };

    if (!memoId || !toEmails || toEmails.length === 0) {
      return NextResponse.json({ ok: false, code: ERR.EVALIDATE, message: 'กรุณาระบุ memoId และผู้รับอีเมล' }, { status: 400 });
    }

    const baseUrl = request.headers.get('origin') || `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host') || 'localhost:3000'}`;

    const settingsDoc = await getDoc(doc(db, 'settings', 'global'));
    const settings = settingsDoc.data();
    const smtp = settings?.smtp as SmtpConfig | undefined;
    const emailFormat = settings?.emailFormat as EmailFormat | undefined;

    const validation = validateSMTP(smtp!);
    if (!validation.ok) {
      return NextResponse.json(validation, { status: 400 });
    }

    const memoDoc = await getDoc(doc(db, 'memos', memoId));
    if (!memoDoc.exists()) {
      return NextResponse.json({ ok: false, code: ERR.EVALIDATE, message: 'ไม่พบ Memo' }, { status: 404 });
    }
    const memo = memoDoc.data()!;

    // Load template fields for preview rendering
    let templateFields: Array<{ id: string; type: string; label: string; fieldConfig?: Record<string, unknown> }> = [];
    if (memo.templateId) {
      const templateDoc = await getDoc(doc(db, 'memoTemplates', memo.templateId));
      if (templateDoc.exists()) {
        const templateData = templateDoc.data();
        templateFields = (templateData.fields || []) as Array<{ id: string; type: string; label: string; fieldConfig?: Record<string, unknown> }>;
      }
    }

    const usersSnapshot = await getDocs(collection(db, 'users'));
    const allUsersData: Array<{ id: string; email?: string; displayName?: string }> = usersSnapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) } as { id: string; email?: string; displayName?: string }));

    const deadlineDate = memo.deadlineAt?.toDate?.() || new Date(memo.deadlineAt);
    const buddhistYear = deadlineDate.getFullYear() + 543;
    const deadlineStr = `${deadlineDate.getDate()} ${deadlineDate.toLocaleDateString('th-TH', { month: 'long' })} ${buddhistYear}`;

    const now = new Date();
    const sendDate = now.toLocaleDateString('th-TH');
    const time = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

    const baseVars: Record<string, string> = {
      memo_number: memo.memoNumber || memoId,
      title: memo.title || '',
      owner_name: memo.ownerName || '',
      status: memo.status === 'approved' ? 'อนุมัติแล้ว' : memo.status === 'rejected' ? 'ถูกปฏิเสธ' : 'รออนุมัติ',
      deadline: deadlineStr,
      sendDate,
      time,
      memo_url: `${baseUrl}/home`,
    };

    const subjectTemplate = emailFormat?.subject || '[MemoHub] {memo_number} - {title}';
    const bodyTemplate = emailFormat?.body || `สวัสดีค่ะ/ครับ

มี Memo ใหม่รอการอนุมัติของท่าน

เลขที่: {memo_number}
เรื่อง: {title}
ผู้สร้าง: {owner_name}
สถานะ: {status}
Deadline: {deadline}

กรุณาเข้าระบบเพื่ออนุมัติ Memo นี้

MemoHub Digital Memo & Approval System`;

    const transporter = createTransporter(smtp!);
    const sender = buildSender(smtp!);

    const sendOne = async (to: string) => {
      try {
        const approver = allUsersData.find((u) => u.email === to);
        const approverId = (approver?.id as string) || '';
        const approverName = (approver?.displayName as string) || to;

        const token = generateToken();
        await addDoc(collection(db, 'emailTokens'), {
          token,
          memoId,
          approverId,
          approverName,
          toEmail: to,
          action: null,
          used: false,
          createdAt: now,
          expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        });

        const approveUrl = `${baseUrl}/api/email-action?token=${token}&action=approve`;
        const cancelUrl = `${baseUrl}/email-cancel?token=${token}`;

        const vars = { ...baseVars, approver_name: approverName };
        const subject = replaceVariables(subjectTemplate, vars);
        const bodyText = replaceVariables(bodyTemplate, vars);

        const bodyHtml = bodyText
          .split('\n')
          .map((line) => `<p style="margin:4px 0;">${line || '&nbsp;'}</p>`)
          .join('');

        const previewHtml = renderMemoPreviewHtml(memo, templateFields, emailFormat?.preview);

        const htmlEmail = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
  <h2 style="color:#1e293b;">${subject}</h2>
  ${bodyHtml}
  ${previewHtml}
  <div style="margin:24px 0;text-align:center;">
    <a href="${approveUrl}" style="display:inline-block;padding:12px 32px;background:#16a34a;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;margin:0 8px;">อนุมัติ</a>
    <a href="${cancelUrl}" style="display:inline-block;padding:12px 32px;background:#dc2626;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;margin:0 8px;">ปฏิเสธ</a>
  </div>
  <hr style="border:1px solid #e2e8f0;margin:20px 0;" />
  <p style="color:#64748b;font-size:12px;text-align:center;">ลิงค์นี้จะหมดอายุใน 7 วัน</p>
  <p style="color:#64748b;font-size:12px;text-align:center;">MemoHub Digital Memo & Approval System</p>
</body>
</html>`;

        const content = processContent(bodyText);

        await transporter.sendMail({
          from: sender,
          to,
          subject,
          replyTo: smtp!.fromEmail || undefined,
          text: content.text,
          html: htmlEmail,
        });
        return { to, ok: true, message: 'ส่งสำเร็จ' };
      } catch (e) {
        const classified = classifyError(e as Error, smtp!.port, smtp!.host);
        return { to, ok: false, code: classified.code, message: classified.message };
      }
    };

    const results = await Promise.all(toEmails.map(sendOne));
    const failed = results.filter(r => !r.ok);

    if (failed.length > 0) {
      return NextResponse.json({
        ok: false,
        code: failed[0].code,
        message: `${failed.length}/${results.length} คนส่งไม่สำเร็จ — ${failed[0].message}`,
        total: results.length,
        success: results.length - failed.length,
        failed: failed.length,
        results,
      });
    }

    return NextResponse.json({
      ok: true,
      message: `ส่งอีเมลสำเร็จ ${results.length} คน`,
      total: results.length,
      success: results.length,
      failed: 0,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, code: ERR.EUNKNOWN, message: error instanceof Error ? error.message : 'เกิดข้อผิดพลาด' },
      { status: 500 }
    );
  }
}
