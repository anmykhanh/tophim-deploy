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
      return NextResponse.json({ success: false, message: 'Bạn cần đăng nhập để báo lỗi!' }, { status: 401 });
    }

    const userId = parseInt(userIdStr);
    const body = await request.json();
    const { movie_id, episode_id, error_type, description } = body;

    if (!movie_id || !error_type) {
      return NextResponse.json({ success: false, message: 'Thiếu thông tin báo lỗi!' }, { status: 400 });
    }

    const messageContent = `Loại lỗi: ${error_type}. Chi tiết: ${description || 'Không có mô tả chi tiết.'}`;

    const report = await prisma.error_reports.create({
      data: {
        user_id: userId,
        movie_id: parseInt(movie_id),
        episode_id: episode_id ? parseInt(episode_id) : null,
        message: messageContent,
        status: 'pending'
      }
    });

    return NextResponse.json({ success: true, message: 'Gửi báo lỗi thành công! Cảm ơn ý kiến của bạn.', report });
  } catch (err: any) {
    console.error('Report error API error:', err);
    return NextResponse.json({ success: false, message: 'Lỗi hệ thống!' }, { status: 500 });
  }
}
