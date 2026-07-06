import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { sendMail } from '@/lib/mailer';
import { logUserActivity } from '@/lib/logger';

// POST: Generate and send verification email
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const { getSession } = await import('@/lib/auth');
  const session = await getSession();
  const userIdStr = session?.userId?.toString();

    if (!userIdStr) {
      return NextResponse.json({ error: 'Chưa đăng nhập!' }, { status: 401 });
    }

    const userId = parseInt(userIdStr);
    const user = await prisma.users.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'Không tìm thấy tài khoản!' }, { status: 404 });
    }

    if (user.email_verified) {
      return NextResponse.json({ error: 'Email đã được xác minh trước đó!' }, { status: 400 });
    }

    // Generate 6-digit verification code
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiration

    await prisma.users.update({
      where: { id: userId },
      data: {
        verification_token: token,
        verification_expires: expires,
      },
    });

    // Send email
    const subject = `Mã xác minh email của bạn`;
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e7; rounded: 12px;">
        <h2 style="color: #00ac47; text-align: center;">Xác Minh Địa Chỉ Email</h2>
        <p>Xin chào <strong>${user.name}</strong>,</p>
        <p>Bạn nhận được email này vì đã yêu cầu xác minh email cho tài khoản của mình trên hệ thống.</p>
        <div style="background-color: #f4f4f5; padding: 15px; text-align: center; border-radius: 8px; font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #18181b; margin: 20px 0;">
          ${token}
        </div>
        <p style="color: #71717a; font-size: 13px; text-align: center;">Mã xác minh này có hiệu lực trong vòng 15 phút. Nếu không phải bạn yêu cầu, vui lòng bỏ qua email này.</p>
      </div>
    `;

    const mailRes = await sendMail(user.email, subject, htmlBody, true);

    if (!mailRes.success) {
      return NextResponse.json({ error: mailRes.message }, { status: 500 });
    }

    // Log action
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
    await logUserActivity(userId, 'Yêu cầu OTP xác minh email', `Gửi OTP đến email ${user.email}`, ip);

    return NextResponse.json({ success: true, message: 'Đã gửi mã xác minh vào email của bạn!' });
  } catch (err: any) {
    console.error('Send verification email error:', err);
    return NextResponse.json({ error: 'Lỗi hệ thống!' }, { status: 500 });
  }
}

// PUT: Verify OTP code
export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const { getSession } = await import('@/lib/auth');
  const session = await getSession();
  const userIdStr = session?.userId?.toString();

    if (!userIdStr) {
      return NextResponse.json({ error: 'Chưa đăng nhập!' }, { status: 401 });
    }

    const userId = parseInt(userIdStr);
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json({ error: 'Vui lòng nhập mã xác minh!' }, { status: 400 });
    }

    const user = await prisma.users.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'Không tìm thấy tài khoản!' }, { status: 404 });
    }

    if (user.email_verified) {
      return NextResponse.json({ error: 'Email đã được xác minh trước đó!' }, { status: 400 });
    }

    if (!user.verification_token || !user.verification_expires) {
      return NextResponse.json({ error: 'Chưa yêu cầu mã xác minh hoặc mã đã hết hạn!' }, { status: 400 });
    }

    // Check expiration
    if (new Date() > new Date(user.verification_expires)) {
      return NextResponse.json({ error: 'Mã xác minh đã hết hạn, vui lòng lấy mã mới!' }, { status: 400 });
    }

    // Check code
    if (user.verification_token !== code.trim()) {
      return NextResponse.json({ error: 'Mã xác minh không chính xác!' }, { status: 400 });
    }

    // Verify user email
    await prisma.users.update({
      where: { id: userId },
      data: {
        email_verified: true,
        verification_token: null,
        verification_expires: null,
      },
    });

    // Log action
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
    await logUserActivity(userId, 'Xác minh email thành công', `Tài khoản ${user.email} đã được xác minh email`, ip);

    return NextResponse.json({ success: true, message: 'Xác minh email thành công!' });
  } catch (err: any) {
    console.error('Verify email error:', err);
    return NextResponse.json({ error: 'Lỗi hệ thống!' }, { status: 500 });
  }
}
