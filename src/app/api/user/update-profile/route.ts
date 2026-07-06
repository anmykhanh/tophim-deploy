import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
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
    const { name, avatar, gender } = await request.json();

    if (!name) {
       return NextResponse.json({ error: 'Họ và tên không được để trống!' }, { status: 400 });
    }

    await prisma.users.update({
      where: { id: userId },
      data: {
        name,
        avatar: avatar || null,
        gender: gender || null,
      },
    });

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
    const { logUserActivity } = await import('@/lib/logger');
    await logUserActivity(userId, 'Cập nhật hồ sơ', `Đã cập nhật Tên: "${name}", Giới tính: "${gender || 'Khác'}"`, ip);

    return NextResponse.json({ success: true, message: 'Cập nhật thông tin thành công!' });
  } catch (err) {
    console.error('Update profile error:', err);
    return NextResponse.json({ error: 'Đã xảy ra lỗi hệ thống!' }, { status: 500 });
  }
}
