import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import nodemailer from 'nodemailer';

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
      ? 'Port 465 ต้องใช้ SSL — ตรวจสอบว่าใน Settings เลือก Encryption เป็น SSL'
      : port === 587
        ? 'Port 587 ต้องใช้ TLS — ตรวจสอบว่าใน Settings เลือก Encryption เป็น TLS'
        : 'ตรวจสอบ Port (465=SSL / 587=TLS) และ Encryption ให้สอดคล้องกัน';
    return { code: ERR.ESOCKET, message: `การเชื่อมต่อ SMTP ถูกตัด (Unexpected socket close) — ${hint}` };
  }
  if (/Invalid login|Username and Password not accepted|535|EAUTH/i.test(msg)) {
    return { code: ERR.EAUTH, message: 'ยืนยันตัวตน SMTP ไม่ผ่าน (EAUTH) — ตรวจสอบ Username / Password (Gmail ต้องใช้ App Password)' };
  }
  if (/ENOTFOUND|getaddrinfo|ECONNREFUSED/i.test(msg)) {
    return { code: ERR.ECONNREFUSED, message: `ติดต่อ SMTP Host ไม่ได้ (ECONNREFUSED) — ตรวจสอบ Host (${host || 'ไม่ระบุ'}) และเน็ตเวิร์ก` };
  }
  if (/connect ETIMEDOUT|Timeout/i.test(msg)) {
    return { code: ERR.ECONNREFUSED, message: 'เชื่อมต่อ SMTP timeout — ตรวจสอบ Port / Firewall / เน็ตเวิร์ก' };
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

    const usersSnapshot = await getDocs(collection(db, 'users'));

    const deadlineDate = memo.deadlineAt?.toDate?.() || new Date(memo.deadlineAt);
    const buddhistYear = deadlineDate.getFullYear() + 543;
    const deadlineStr = `${deadlineDate.getDate()} ${deadlineDate.toLocaleDateString('th-TH', { month: 'long' })} ${buddhistYear}`;

    const now = new Date();
    const sendDate = now.toLocaleDateString('th-TH');
    const time = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

    const vars: Record<string, string> = {
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

    const subject = replaceVariables(subjectTemplate, vars);
    const bodyText = replaceVariables(bodyTemplate, vars);

    const approveUrl = `${baseUrl}/home?memo=${memoId}&action=approve`;
    const cancelUrl = `${baseUrl}/home?memo=${memoId}&action=cancel`;
    const bodyHtml = bodyText
      .split('\n')
      .map((line) => `<p style="margin:4px 0;">${line || '&nbsp;'}</p>`)
      .join('');

    const htmlEmail = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
  <h2 style="color:#1e293b;">${subject}</h2>
  ${bodyHtml}
  <div style="margin:24px 0;text-align:center;">
    <a href="${approveUrl}" style="display:inline-block;padding:12px 32px;background:#16a34a;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;margin:0 8px;">อนุมัติ</a>
    <a href="${cancelUrl}" style="display:inline-block;padding:12px 32px;background:#dc2626;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;margin:0 8px;">ปฏิเสธ</a>
  </div>
  <hr style="border:1px solid #e2e8f0;margin:20px 0;" />
  <p style="color:#64748b;font-size:12px;text-align:center;">MemoHub Digital Memo & Approval System</p>
</body>
</html>`;

    const transporter = createTransporter(smtp!);
    const sender = buildSender(smtp!);
    const content = processContent(bodyText);

    const sendOne = async (to: string) => {
      try {
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
