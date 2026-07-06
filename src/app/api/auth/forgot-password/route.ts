import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import crypto from 'crypto';
import { sendMail } from '@/lib/mailer';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Vui lòng nhập địa chỉ email!' },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.users.findUnique({
      where: { email },
    });

    // To prevent email enumeration, return success even if user not found.
    // However, only send mail and update DB if user exists.
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 3600000); // 1 hour from now

      // Save token to DB
      await prisma.users.update({
        where: { id: user.id },
        data: {
          reset_token: token,
          reset_expires: expires,
        },
      });

      // Construct reset link
      const origin = request.headers.get('origin') || 'http://localhost:3000';
      const resetLink = `${origin}/pages/reset-password?token=${encodeURIComponent(token)}`;

      const subject = "Khôi phục mật khẩu - Tô Phim";
      const body = `
        <h3>Xin chào ${user.name || 'bạn'},</h3>
        <p>Bạn đã yêu cầu khôi phục mật khẩu tại Tô Phim.</p>
        <p>Vui lòng click vào đường dẫn bên dưới để đặt lại mật khẩu mới. Link này sẽ hết hạn sau 1 giờ.</p>
        <p><a href="${resetLink}" style="display:inline-block;padding:10px 20px;background:#00ac47;color:#fff;text-decoration:none;border-radius:5px;font-weight:bold;">Đặt lại mật khẩu</a></p>
        <p>Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>
        <br>
        <p>Trân trọng,<br>Đội ngũ Tô Phim</p>
      `;

      const mailResult = await sendMail(email, subject, body, true);
      if (!mailResult.success) {
        return NextResponse.json(
          { error: mailResult.message || 'Gửi email thất bại. Vui lòng thử lại sau.' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Đã gửi hướng dẫn khôi phục mật khẩu vào email của bạn. Vui lòng kiểm tra hộp thư!',
    });
  } catch (err: any) {
    console.error('Forgot password API error:', err);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi hệ thống, vui lòng thử lại sau!' },
      { status: 500 }
    );
  }
}
