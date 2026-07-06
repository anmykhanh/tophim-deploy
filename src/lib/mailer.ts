import nodemailer from 'nodemailer';
import prisma from './db';

export async function sendMail(to: string, subject: string, body: string, isHtml: boolean = true) {
  try {
    // Fetch SMTP settings from DB
    const settingsList = await prisma.settings.findMany({
      where: {
        OR: [
          { key: { startsWith: 'smtp_' } },
          { key: 'site_name' }
        ]
      }
    });

    const settings: Record<string, string> = {};
    settingsList.forEach(s => {
      if (s.value) {
        settings[s.key] = s.value;
      }
    });

    const host = settings['smtp_host'] || '';
    const port = settings['smtp_port'] || '';
    const user = settings['smtp_user'] || '';
    const pass = settings['smtp_pass'] || '';
    const crypto = settings['smtp_crypto'] || 'tls'; // 'tls' or 'ssl'
    const siteName = settings['site_name'] || 'Tô Phim';

    if (!host || !port || !user || !pass) {
      return { success: false, message: 'Hệ thống chưa cấu hình SMTP.' };
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(port, 10),
      secure: crypto.toLowerCase() === 'ssl', // true for 465, false for other ports
      auth: {
        user,
        pass,
      },
      tls: {
        // Do not fail on invalid certs
        rejectUnauthorized: false
      }
    });

    // Send mail
    const mailOptions = {
      from: `"${siteName}" <${user}>`,
      to,
      subject,
      [isHtml ? 'html' : 'text']: body,
      text: isHtml ? body.replace(/<[^>]*>/g, '') : body, // simple plaintext fallback
    };

    await transporter.sendMail(mailOptions);
    return { success: true, message: 'Gửi email thành công.' };
  } catch (error: any) {
    console.error('Mailer error:', error);
    return { success: false, message: `Gửi email thất bại. Lỗi Mailer: ${error.message || error}` };
  }
}
