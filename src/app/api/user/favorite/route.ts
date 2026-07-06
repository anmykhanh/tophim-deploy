import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const { getSession } = await import('@/lib/auth');
  const session = await getSession();
  const userIdStr = session?.userId?.toString();

    if (!userIdStr) {
      return NextResponse.json({ favorited: false, error: 'Chưa đăng nhập!' }, { status: 401 });
    }

    const userId = parseInt(userIdStr);
    const { searchParams } = new URL(request.url);
    const movieIdStr = searchParams.get('movie_id');

    if (!movieIdStr) {
      return NextResponse.json({ error: 'Thiếu movie_id' }, { status: 400 });
    }

    const movieId = parseInt(movieIdStr);

    const existing = await prisma.favorites.findUnique({
      where: {
        user_id_movie_id: {
          user_id: userId,
          movie_id: movieId,
        },
      },
    });

    return NextResponse.json({ favorited: !!existing });
  } catch (err: any) {
    console.error('Check favorite error:', err);
    return NextResponse.json({ error: 'Lỗi hệ thống!' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const { getSession } = await import('@/lib/auth');
  const session = await getSession();
  const userIdStr = session?.userId?.toString();

    if (!userIdStr) {
      return NextResponse.json({ success: false, message: 'Bạn cần đăng nhập để thực hiện chức năng này.' }, { status: 401 });
    }

    const userId = parseInt(userIdStr);
    const { movie_id } = await request.json();

    if (!movie_id) {
      return NextResponse.json({ success: false, message: 'Phim không hợp lệ.' }, { status: 400 });
    }

    const movieId = parseInt(movie_id);

    const existing = await prisma.favorites.findUnique({
      where: {
        user_id_movie_id: {
          user_id: userId,
          movie_id: movieId,
        },
      },
    });

    if (existing) {
      await prisma.favorites.delete({
        where: {
          user_id_movie_id: {
            user_id: userId,
            movie_id: movieId,
          },
        },
      });
      return NextResponse.json({ success: true, favorited: false, message: 'Đã xóa khỏi yêu thích' });
    } else {
      await prisma.favorites.create({
        data: {
          user_id: userId,
          movie_id: movieId,
        },
      });
      return NextResponse.json({ success: true, favorited: true, message: 'Đã thêm vào yêu thích ❤️' });
    }
  } catch (err: any) {
    console.error('Toggle favorite error:', err);
    return NextResponse.json({ success: false, message: 'Lỗi hệ thống!' }, { status: 500 });
  }
}
