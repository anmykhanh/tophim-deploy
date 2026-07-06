import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { getSession } = await import('@/lib/auth');
    const session = await getSession();
    const userIdStr = session?.userId?.toString();

    if (!userIdStr) {
      return NextResponse.json({ error: 'Bạn phải đăng nhập để gửi yêu cầu!' }, { status: 401 });
    }

    const userId = parseInt(userIdStr);
    const { title, originalTitle, imdbUrl, referenceUrl, description } = await request.json();

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Tên phim không được để trống!' }, { status: 400 });
    }
    if (!description?.trim()) {
      return NextResponse.json({ error: 'Nội dung yêu cầu không được để trống!' }, { status: 400 });
    }

    const newRequest = await prisma.movie_requests.create({
      data: {
        user_id: userId,
        title: title.trim(),
        original_title: originalTitle?.trim() || null,
        imdb_url: imdbUrl?.trim() || null,
        reference_url: referenceUrl?.trim() || null,
        description: description.trim(),
        status: 'pending',
      },
    });

    // Logging action
    try {
      const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
      const { logUserActivity } = await import('@/lib/logger');
      await logUserActivity(userId, 'Yêu cầu phim', `Đã yêu cầu phim: "${title.trim()}"`, ip);
    } catch (logErr) {
      console.error('Failed to log request activity:', logErr);
    }

    return NextResponse.json({ success: true, message: 'Gửi yêu cầu phim thành công!', request: newRequest });
  } catch (err) {
    console.error('Create request error:', err);
    return NextResponse.json({ error: 'Đã xảy ra lỗi hệ thống!' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending'; // pending, completed

    const requests = await prisma.movie_requests.findMany({
      where: {
        status: status,
      },
      include: {
        users: {
          select: {
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return NextResponse.json({ success: true, requests });
  } catch (err) {
    console.error('Get requests error:', err);
    return NextResponse.json({ error: 'Đã xảy ra lỗi hệ thống!' }, { status: 500 });
  }
}
