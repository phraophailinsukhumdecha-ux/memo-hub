import nodemailer from 'nodemailer';
import { GlobalSettings } from '@/types';

interface SendEmailInput {
  to: string;
  name: string;
  subject: string;
  body: string;
}

interface SendEmailResult {
  success: boolean;
  error?: string;
}

function createTransporter(smtp: GlobalSettings['smtp']) {
  return nodemailer.createTransport({
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
}

export async function sendEmail(
  input: SendEmailInput,
  smtp: GlobalSettings['smtp']
): Promise<SendEmailResult> {
  try {
    const transporter = createTransporter(smtp);

    await transporter.sendMail({
      from: `"${smtp.fromName}" <${smtp.fromEmail}>`,
      to: input.to,
      subject: input.subject,
      text: input.body,
      html: `<div style="font-family: Arial, sans-serif; white-space: pre-wrap;">${input.body}</div>`,
    });

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการส่งอีเมล';
    return { success: false, error: errorMessage };
  }
}

export async function sendBulkEmail(
  recipients: Array<{ email: string; name: string }>,
  subject: string,
  body: string,
  smtp: GlobalSettings['smtp']
): Promise<SendEmailResult[]> {
  const promises = recipients.map((recipient) =>
    sendEmail({
      to: recipient.email,
      name: recipient.name,
      subject,
      body,
    }, smtp)
  );
  return Promise.all(promises);
}
