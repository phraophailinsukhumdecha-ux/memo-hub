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
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { smtp, to } = body as { smtp: SmtpConfig; to: string };

    if (!smtp.host || !to) {
      return NextResponse.json(
        { success: false, error: 'กรุณากรอก SMTP Host และอีเมลผู้รับ' },
        { status: 400 }
      );
    }

    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: {
        user: smtp.user || undefined,
        pass: smtp.password || undefined,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    const info = await transporter.sendMail({
      from: `"${smtp.fromName}" <${smtp.fromEmail}>`,
      to,
      subject: 'MemoHub - ทดสอบการส่งอีเมล',
      text: `สวัสดีครับ

นี่คืออีเมลทดสอบจากระบบ MemoHub

หากคุณได้รับอีเมลนี้ แสดงว่าการตั้งค่า SMTP ถูกต้องแล้ว

---
MemoHub Digital Memo & Approval System`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1e293b;">MemoHub - ทดสอบการส่งอีเมล</h2>
          <p>สวัสดีครับ</p>
          <p>นี่คืออีเมลทดสอบจากระบบ <strong>MemoHub</strong></p>
          <p>หากคุณได้รับอีเมลนี้ แสดงว่าการตั้งค่า SMTP ถูกต้องแล้ว</p>
          <hr style="border: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="color: #64748b; font-size: 12px;">MemoHub Digital Memo & Approval System</p>
        </div>
      `,
    });

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
