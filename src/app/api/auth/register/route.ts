import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Vui lòng điền đầy đủ thông tin!' },
        { status: 400 }
      );
    }

    // Check if email exists
    const existingUser = await prisma.users.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email đã được sử dụng!' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Create user
    const newUser = await prisma.users.create({
      data: {
        name,
        email,
        password: hashedPassword,
        avatar: '/avt/meme/05.jpg',
        role: 'user',
      },
    });

    // Set cookie with JWT to auto-login
    const { signToken } = await import('@/lib/auth');
    const token = await signToken({ userId: newUser.id, role: newUser.role });

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
    await logUserActivity(newUser.id, 'Đăng ký', 'Đăng ký tài khoản mới thành công', ip);

    return NextResponse.json({ success: true, user: { id: newUser.id, name: newUser.name, role: newUser.role } });
  } catch (err) {
    console.error('Register API error:', err);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi hệ thống, vui lòng thử lại sau!' },
      { status: 500 }
    );
  }
}
