import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST() {
  try {
    const session = await getSession();
    const userIdStr = session?.userId?.toString();

    if (!userIdStr) {
      return NextResponse.json({ success: false, error: 'Chưa đăng nhập!' }, { status: 401 });
    }

    const userId = parseInt(userIdStr);

    // Clean up expired codes
    await prisma.tv_linking_codes.deleteMany({
      where: {
        expires_at: {
          lt: new Date()
        }
      }
    });

    // Generate unique 6-digit numeric code
    let code = '';
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      attempts++;
      code = Math.floor(100000 + Math.random() * 900000).toString();
      const existing = await prisma.tv_linking_codes.findUnique({
        where: { code }
      });
      if (!existing) {
        isUnique = true;
      }
    }

    if (!isUnique) {
      return NextResponse.json({ success: false, error: 'Không thể tạo mã lúc này, vui lòng thử lại.' }, { status: 500 });
    }

    // Code is valid for 5 minutes
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Store in database
    await prisma.tv_linking_codes.create({
      data: {
        code,
        user_id: userId,
        expires_at: expiresAt
      }
    });

    return NextResponse.json({
      success: true,
      code,
      expiresAt: expiresAt.toISOString(),
      expiresIn: 300 // 5 minutes in seconds
    });
  } catch (err: any) {
    console.error('Generate TV code error:', err);
    return NextResponse.json({ success: false, error: 'Lỗi hệ thống!' }, { status: 500 });
  }
}
