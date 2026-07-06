import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

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
    const { oldPassword, newPassword } = await request.json();

    if (!oldPassword || !newPassword) {
      return NextResponse.json({ error: 'Vui lòng điền đầy đủ thông tin!' }, { status: 400 });
    }

    const user = await prisma.users.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'Người dùng không tồn tại!' }, { status: 404 });
    }

    // Verify old password
    const isPasswordValid = bcrypt.compareSync(oldPassword, user.password);
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Mật khẩu cũ không chính xác!' }, { status: 400 });
    }

    // Hash and update new password
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    await prisma.users.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
      },
    });

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
    const { logUserActivity } = await import('@/lib/logger');
    await logUserActivity(userId, 'Đổi mật khẩu', 'Thay đổi mật khẩu tài khoản thành công', ip);

    return NextResponse.json({ success: true, message: 'Đổi mật khẩu thành công!' });
  } catch (err) {
    console.error('Change password error:', err);
    return NextResponse.json({ error: 'Đã xảy ra lỗi hệ thống!' }, { status: 500 });
  }
}
