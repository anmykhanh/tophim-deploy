import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';

// GET: Validate reset token
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Liên kết không hợp lệ.' },
        { status: 400 }
      );
    }

    const user = await prisma.users.findFirst({
      where: {
        reset_token: token,
        reset_expires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Liên kết đã hết hạn hoặc không hợp lệ. Vui lòng yêu cầu lại.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Validate reset token error:', err);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi hệ thống, vui lòng thử lại sau!' },
      { status: 500 }
    );
  }
}

// POST: Update password
export async function POST(request: Request) {
  try {
    const { token, password, confirm } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Liên kết không hợp lệ.' },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { error: 'Vui lòng nhập mật khẩu mới!' },
        { status: 400 }
      );
    }

    if (password !== confirm) {
      return NextResponse.json(
        { error: 'Mật khẩu xác nhận không khớp!' },
        { status: 400 }
      );
    }

    // Find valid user
    const user = await prisma.users.findFirst({
      where: {
        reset_token: token,
        reset_expires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Liên kết đã hết hạn hoặc không hợp lệ. Vui lòng yêu cầu lại.' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Update password and clear token fields
    await prisma.users.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        reset_token: null,
        reset_expires: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Đổi mật khẩu thành công! Bây giờ bạn có thể đăng nhập.',
    });
  } catch (err: any) {
    console.error('Reset password API error:', err);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi hệ thống, vui lòng thử lại sau!' },
      { status: 500 }
    );
  }
}
