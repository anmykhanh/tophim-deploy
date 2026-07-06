import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';

// GET: Fetch current user's logs
export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const { getSession } = await import('@/lib/auth');
  const session = await getSession();
  const userIdStr = session?.userId?.toString();

    if (!userIdStr) {
      return NextResponse.json({ error: 'Chưa đăng nhập!' }, { status: 401 });
    }

    const userId = parseInt(userIdStr);
    const logs = await prisma.user_logs.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 50, // limit to 50 most recent logs
    });

    return NextResponse.json({ success: true, logs });
  } catch (err: any) {
    console.error('Fetch user logs error:', err);
    return NextResponse.json({ error: 'Lỗi hệ thống!' }, { status: 500 });
  }
}
