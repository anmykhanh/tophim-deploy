import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Vui lòng điền đầy đủ thông tin!' },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.users.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Email hoặc mật khẩu không chính xác!' },
        { status: 400 }
      );
    }

    // Verify password
    const isPasswordValid = bcrypt.compareSync(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Email hoặc mật khẩu không chính xác!' },
        { status: 400 }
      );
    }

    // Set cookie with JWT
    const { signToken } = await import('@/lib/auth');
    const token = await signToken({ userId: user.id, role: user.role });
    
    const cookieStore = await cookies();
    cookieStore.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    });

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
    const { logUserActivity } = await import('@/lib/logger');
    await logUserActivity(user.id, 'Đăng nhập', 'Đăng nhập vào hệ thống thành công', ip);

    return NextResponse.json({ success: true, user: { id: user.id, name: user.name, role: user.role } });
  } catch (err) {
    console.error('Login API error:', err);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi hệ thống, vui lòng thử lại sau!' },
      { status: 500 }
    );
  }
}
