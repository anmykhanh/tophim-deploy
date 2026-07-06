import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { signToken } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { credential } = await request.json();
    if (!credential) {
      return NextResponse.json({ error: 'Mã xác thực không hợp lệ!' }, { status: 400 });
    }

    // 1. Get Google Client ID from Settings
    const googleClientIdSetting = await prisma.settings.findUnique({
      where: { key: 'google_client_id' }
    });
    const googleClientId = googleClientIdSetting?.value;
    if (!googleClientId) {
      return NextResponse.json({ error: 'Đăng nhập bằng Google chưa được cấu hình Client ID!' }, { status: 400 });
    }

    // 2. Verify token via Google TokenInfo API
    const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
    if (!verifyRes.ok) {
      return NextResponse.json({ error: 'Xác thực Google Token thất bại!' }, { status: 400 });
    }

    const payload = await verifyRes.json();
    
    // 3. Verify Aud (Client ID)
    if (payload.aud !== googleClientId) {
      return NextResponse.json({ error: 'Audience mismatch! Client ID không khớp.' }, { status: 400 });
    }

    const { email, name, picture } = payload;
    if (!email) {
      return NextResponse.json({ error: 'Không thể lấy email từ Google!' }, { status: 400 });
    }

    // 4. Find or Create user in database
    let user = await prisma.users.findUnique({
      where: { email }
    });

    if (!user) {
      // Create new user with random password (they'll use Google to login)
      const randomPassword = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const hashedPassword = bcrypt.hashSync(randomPassword, 10);
      user = await prisma.users.create({
        data: {
          email,
          name: name || email.split('@')[0],
          password: hashedPassword,
          avatar: picture || null,
          role: 'user',
        }
      });
    } else {
      // Update avatar if changed
      if (picture && user.avatar !== picture) {
        await prisma.users.update({
          where: { id: user.id },
          data: { avatar: picture }
        });
      }
    }

    // 5. Create JWT token (same as regular login)
    const token = await signToken({ userId: user.id, role: user.role });

    // 6. Set auth_token cookie (same cookie name as regular login)
    const cookieStore = await cookies();
    cookieStore.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    });

    // 7. Log activity
    try {
      const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
      const { logUserActivity } = await import('@/lib/logger');
      await logUserActivity(user.id, 'Đăng nhập Google', 'Đăng nhập vào hệ thống thành công qua Google', ip);
    } catch (logErr) {
      // Non-critical, ignore
    }

    return NextResponse.json({ success: true, user: { id: user.id, name: user.name, role: user.role } });
  } catch (err) {
    console.error('Google Login Auth Error:', err);
    return NextResponse.json({ error: 'Đã xảy ra lỗi đăng nhập Google!' }, { status: 500 });
  }
}
