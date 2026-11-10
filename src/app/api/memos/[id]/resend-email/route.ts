import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, getDocs, collection, addDoc } from 'firebase/firestore';
import crypto from 'crypto';
import { getApprovalRecipients } from '@/lib/approval-flow';
import {
  buildCompactMemoHtml,
  createTransporter,
  buildSender,
  createViewToken,
  buildViewUrl,
  resolveMailFontFamily,
  type SmtpConfig,
} from '@/lib/memo-email';
import {
  buildEmailVariables,
  replaceEmailVariables,
  DEFAULT_APPROVER_SUBJECT,
  DEFAULT_APPROVER_BODY,
} from '@/lib/email-variables';
import { logApiError } from '@/lib/logger';
import type { Memo, MemoTemplate, MemoTypography, User } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface ResendBody {
  emails?: string[];
}

function buildEmailHtml(params: {
  subject: string;
  bodyText: string;
  summaryHtml: string;
  viewUrl: string;
  baseUrl: string;
  typography?: MemoTypography;
  approveUrl?: string;
  cancelUrl?: string;
}): string {
  const { subject, bodyText, summaryHtml, viewUrl, baseUrl, typography } = params;
  const bodyHtml = bodyText
    .split('\n')
    .map((line) => `<p style="margin:4px 0;">${line || '&nbsp;'}</p>`)
    .join('');
  const buttons =
    params.approveUrl && params.cancelUrl
      ? `<div style="margin:24px 0;text-align:center;">
    <a href="${params.approveUrl}" style="display:inline-block;padding:12px 32px;background:#16a34a;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;margin:0 8px;">อนุมัติ</a>
    <a href="${params.cancelUrl}" style="display:inline-block;padding:12px 32px;background:#dc2626;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;margin:0 8px;">ปฏิเสธ</a>
  </div>`
      : '';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:${resolveMailFontFamily(typography)};max-width:600px;margin:0 auto;padding:20px;">
  <h2 style="color:#1e293b;">${subject}</h2>
  ${bodyHtml}
  ${summaryHtml}
  ${buttons}
  <div style="margin:8px 0 24px;text-align:center;">
    <a href="${viewUrl}" style="display:inline-block;padding:10px 24px;background:#0f172a;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">ดูเอกสาร</a>
  </div>
  <div style="margin:0 0 24px;text-align:center;">
    <a href="${baseUrl}/home" style="color:#2563eb;text-decoration:underline;font-size:13px;">เข้าสู่ระบบเพื่อดูเอกสาร</a>
  </div>
  <hr style="border:1px solid #e2e8f0;margin:20px 0;" />
  <p style="color:#64748b;font-size:12px;text-align:center;">MemoHub Digital Memo & Approval System</p>
</body>
</html>`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as ResendBody;
    const requestedEmails = Array.isArray(body.emails)
      ? Array.from(new Set(body.emails.filter((email): email is string => typeof email === 'string' && email.trim().length > 0)))
      : [];

    if (requestedEmails.length === 0) {
      return NextResponse.json({ ok: false, error: 'กรุณาเลือกผู้รับอย่างน้อย 1 คน' }, { status: 400 });
    }

    const memoDoc = await getDoc(doc(db, 'memos', id));
    if (!memoDoc.exists()) {
      return NextResponse.json({ ok: false, error: 'ไม่พบ Memo' }, { status: 404 });
    }
    const memo = { id: memoDoc.id, ...memoDoc.data() } as Memo;
    if (memo.status === 'draft') {
      return NextResponse.json({ ok: false, error: 'Memo ฉบับร่างยังส่งอีเมลไม่ได้' }, { status: 400 });
    }

    const usersSnapshot = await getDocs(collection(db, 'users'));
    const users = usersSnapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })) as User[];

    const recipients = getApprovalRecipients(memo.formData, users);
    const selected = recipients.filter((recipient) => requestedEmails.includes(recipient.email));
    if (selected.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'รายชื่อที่เลือกไม่ได้อยู่ในผู้ตรวจสอบ/ผู้อนุมัติของ Memo นี้' },
        { status: 400 }
      );
    }

    const settingsDoc = await getDoc(doc(db, 'settings', 'global'));
    const settings = settingsDoc.data();
    const smtp = settings?.smtp as SmtpConfig | undefined;
    if (!smtp?.host || !smtp.user || !smtp.password) {
      return NextResponse.json({ ok: false, error: 'ยังไม่ได้ตั้งค่า SMTP' }, { status: 400 });
    }
    const emailFormat = (settings?.emailFormat || {}) as Record<string, string>;
    const subjectTemplate = emailFormat.subject || DEFAULT_APPROVER_SUBJECT;
    const bodyTemplate = emailFormat.body || DEFAULT_APPROVER_BODY;

    let template: MemoTemplate | null = null;
    if (memo.templateId) {
      const templateDoc = await getDoc(doc(db, 'memoTemplates', memo.templateId));
      if (templateDoc.exists()) {
        template = { id: templateDoc.id, ...templateDoc.data() } as MemoTemplate;
      }
    }
    const templateFields = (template?.fields || []) as Array<{
      id: string;
      type: string;
      label: string;
      fieldConfig?: Record<string, unknown>;
    }>;
    const typography = template?.typography;

    const userMap = new Map(
      users.map((user) => [user.id, { displayName: user.displayName, department: user.department }])
    );
    const baseUrl =
      request.headers.get('origin') ||
      `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host') || 'localhost:3000'}`;

    const viewToken = await createViewToken(id);
    const viewUrl = buildViewUrl(baseUrl, viewToken);
    const summaryHtml = buildCompactMemoHtml(
      memo as unknown as Record<string, unknown>,
      templateFields,
      userMap,
      baseUrl,
      typography
    );

    const transporter = createTransporter(smtp);
    const sender = buildSender(smtp);
    const isOpen = memo.status === 'new' || memo.status === 'waiting';
    const now = new Date();
    const results: Array<{ to: string; ok: boolean; message?: string }> = [];

    if (!isOpen) {
      // Closed memo: one view-only email to everyone selected.
      const names = selected.map((recipient) => recipient.name).filter(Boolean).join(', ') || 'ท่านผู้เกี่ยวข้อง';
      const vars = buildEmailVariables({
        memo: memo as unknown as Record<string, unknown>,
        templateFields,
        baseUrl,
        memoId: id,
        recipientName: names,
        approverName: names,
        memoLink: viewUrl,
      });
      const subject = replaceEmailVariables(subjectTemplate, vars);
      const bodyText = replaceEmailVariables(bodyTemplate, vars);
      const html = buildEmailHtml({ subject, bodyText, summaryHtml, viewUrl, baseUrl, typography });
      const to = selected.map((recipient) => recipient.email).join(', ');

      try {
        await transporter.sendMail({
          from: sender,
          to,
          subject,
          replyTo: smtp.fromEmail || undefined,
          text: `${subject}\n\n${bodyText}`,
          html,
        });
        results.push({ to, ok: true });
      } catch (error) {
        results.push({ to, ok: false, message: error instanceof Error ? error.message : 'Unknown' });
      }
    } else {
      // Open memo: one email per selected recipient (each needs its own action token).
      for (const recipient of selected) {
        const token = crypto.randomBytes(32).toString('hex');
        await addDoc(collection(db, 'emailTokens'), {
          token,
          memoId: id,
          approverId: recipient.userId || '',
          approverName: recipient.name,
          toEmail: recipient.email,
          action: null,
          used: false,
          createdAt: now,
        });

        const approveUrl = `${baseUrl}/email-approve?token=${token}`;
        const cancelUrl = `${baseUrl}/email-cancel?token=${token}`;
        const vars = buildEmailVariables({
          memo: memo as unknown as Record<string, unknown>,
          templateFields,
          baseUrl,
          memoId: id,
          recipientName: recipient.name,
          approverName: recipient.name,
          memoLink: viewUrl,
        });
        const subject = replaceEmailVariables(subjectTemplate, vars);
        const bodyText = replaceEmailVariables(bodyTemplate, vars);
        const html = buildEmailHtml({
          subject,
          bodyText,
          summaryHtml,
          viewUrl,
          baseUrl,
          typography,
          approveUrl,
          cancelUrl,
        });

        try {
          await transporter.sendMail({
            from: sender,
            to: recipient.email,
            subject,
            replyTo: smtp.fromEmail || undefined,
            text: `${subject}\n\n${bodyText}`,
            html,
          });
          results.push({ to: recipient.email, ok: true });
        } catch (error) {
          results.push({
            to: recipient.email,
            ok: false,
            message: error instanceof Error ? error.message : 'Unknown',
          });
        }
      }
    }

    const failed = results.filter((result) => !result.ok);
    if (failed.length > 0) {
      await logApiError(
        '/api/memos/[id]/resend-email',
        new Error(failed[0].message || 'ส่งอีเมลไม่สำเร็จ')
      );
      return NextResponse.json({
        ok: false,
        message: `ส่งไม่สำเร็จ ${failed.length}/${results.length} คน`,
        results,
      });
    }

    return NextResponse.json({
      ok: true,
      message: `ส่งอีเมลซ้ำสำเร็จ ${results.length} ฉบับ`,
      total: results.length,
      results,
    });
  } catch (error) {
    await logApiError('/api/memos/[id]/resend-email', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'เกิดข้อผิดพลาด' },
      { status: 500 }
    );
  }
}
