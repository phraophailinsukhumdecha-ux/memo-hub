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
}

interface EmailFormat {
  subject: string;
  body: string;
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
      return NextResponse.json({ error: 'กรุณาระบุ memoId และผู้รับอีเมล' }, { status: 400 });
    }

    const settingsDoc = await getDoc(doc(db, 'settings', 'global'));
    const settings = settingsDoc.data();
    const smtp = settings?.smtp as SmtpConfig | undefined;
    const emailFormat = settings?.emailFormat as EmailFormat | undefined;

    if (!smtp?.host) {
      return NextResponse.json({ error: 'กรุณาตั้งค่า SMTP Server ก่อนส่งอีเมล' }, { status: 400 });
    }

    const memoDoc = await getDoc(doc(db, 'memos', memoId));
    if (!memoDoc.exists()) {
      return NextResponse.json({ error: 'ไม่พบ Memo' }, { status: 404 });
    }
    const memo = memoDoc.data()!;

    const usersSnapshot = await getDocs(collection(db, 'users'));
    const ownerUser = usersSnapshot.docs.find((d) => d.id === memo.ownerId);

    const deadlineDate = memo.deadlineAt?.toDate?.() || new Date(memo.deadlineAt);
    const buddhistYear = deadlineDate.getFullYear() + 543;
    const deadlineStr = `${deadlineDate.getDate()} ${deadlineDate.toLocaleDateString('th-TH', { month: 'long' })} ${buddhistYear}`;

    const vars: Record<string, string> = {
      memo_number: memo.memoNumber || memoId,
      title: memo.title || '',
      owner_name: memo.ownerName || '',
      status: memo.status === 'approved' ? 'อนุมัติแล้ว' : memo.status === 'rejected' ? 'ถูกปฏิเสธ' : 'รออนุมัติ',
      deadline: deadlineStr,
      memo_url: `${typeof window !== 'undefined' ? window.location.origin : ''}/home`,
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

    const bodyHtml = bodyText
      .split('\n')
      .map((line) => `<p style="margin:4px 0;">${line || '&nbsp;'}</p>`)
      .join('');

    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: {
        user: smtp.user || undefined,
        pass: smtp.password || undefined,
      },
      tls: { rejectUnauthorized: false },
    });

    const info = await transporter.sendMail({
      from: `"${smtp.fromName}" <${smtp.fromEmail}>`,
      to: toEmails.join(', '),
      subject,
      text: bodyText,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1e293b;">${subject}</h2>
          ${bodyHtml}
          <hr style="border: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="color: #64748b; font-size: 12px;">MemoHub Digital Memo & Approval System</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true, messageId: info.messageId });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
