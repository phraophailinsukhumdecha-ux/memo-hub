import { NextRequest, NextResponse } from 'next/server';
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
    return { code: ERR.ESOCKET, message: `การเชื่อมต่อ SMTP ถูกตัด — ${hint}` };
  }
  if (/Invalid login|Username and Password not accepted|535|EAUTH/i.test(msg)) {
    return { code: ERR.EAUTH, message: 'ยืนยันตัวตน SMTP ไม่ผ่าน (EAUTH) — ตรวจสอบ Username / Password (Gmail ต้องใช้ App Password)' };
  }
  if (/ENOTFOUND|getaddrinfo|ECONNREFUSED/i.test(msg)) {
    return { code: ERR.ECONNREFUSED, message: `ติดต่อ SMTP Host ไม่ได้ — ตรวจสอบ Host (${host || 'ไม่ระบุ'}) และเน็ตเวิร์ก` };
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { smtp, to } = body as { smtp: SmtpConfig; to: string };

    if (!to) {
      return NextResponse.json(
        { ok: false, code: ERR.EVALIDATE, message: 'กรุณาระบุอีเมลผู้รับ' },
        { status: 400 }
      );
    }

    const validation = validateSMTP(smtp);
    if (!validation.ok) {
      return NextResponse.json(validation, { status: 400 });
    }

    const transporter = createTransporter(smtp);
    const sender = buildSender(smtp);

    const testBody = `สวัสดีครับ

นี่คืออีเมลทดสอบจากระบบ MemoHub

หากคุณได้รับอีเมลนี้ แสดงว่าการตั้งค่า SMTP ถูกต้องแล้ว

---
MemoHub Digital Memo & Approval System`;

    const content = {
      text: testBody,
      html: testBody.replace(/\n/g, '<br />'),
    };

    await transporter.sendMail({
      from: sender,
      to,
      subject: 'MemoHub - ทดสอบการส่งอีเมล',
      replyTo: smtp.fromEmail || undefined,
      text: content.text,
      html: content.html,
    });

    return NextResponse.json({ ok: true, message: 'ส่งอีเมลสำเร็จ' });
  } catch (error) {
    const classified = classifyError(error as Error, 0, '');
    return NextResponse.json(
      { ok: false, code: classified.code, message: classified.message },
      { status: 500 }
    );
  }
}
