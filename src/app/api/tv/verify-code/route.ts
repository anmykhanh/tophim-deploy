import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { signToken } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const code = body.code?.toString().trim();

    if (!code || code.length !== 6) {
      return NextResponse.json({ success: false, error: 'Mã liên kết phải gồm 6 chữ số.' }, { status: 400 });
    }

    // Find the code
    const record = await prisma.tv_linking_codes.findUnique({
      where: { code }
    });

    if (!record) {
      return NextResponse.json({ success: false, error: 'Mã liên kết không hợp lệ hoặc đã hết hạn.' }, { status: 404 });
    }

    // Check expiration
    if (new Date() > new Date(record.expires_at)) {
      await prisma.tv_linking_codes.delete({ where: { id: record.id } }).catch(() => {});
      return NextResponse.json({ success: false, error: 'Mã liên kết đã hết hạn.' }, { status: 410 });
    }

    // Fetch the user
    const user = await prisma.users.findUnique({
      where: { id: record.user_id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true
      }
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy tài khoản tương ứng.' }, { status: 404 });
    }

    // Generate JWT token
    const token = await signToken({
      userId: user.id,
      role: user.role || 'user'
    });

    // Delete the code so it cannot be reused
    await prisma.tv_linking_codes.delete({
      where: { id: record.id }
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role
      }
    });
  } catch (err: any) {
    console.error('Verify TV code error:', err);
    return NextResponse.json({ success: false, error: 'Lỗi hệ thống!' }, { status: 500 });
  }
}
