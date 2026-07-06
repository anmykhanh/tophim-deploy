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
      return NextResponse.json({ error: 'Chưa đăng nhập!' }, { status: 401 });
    }
    const userId = parseInt(userIdStr, 10);

    const { movieId, episodeId, progress, duration, watchedSeconds } = await request.json();

    if (!movieId) {
      return NextResponse.json({ error: 'Thiếu movieId' }, { status: 400 });
    }

    // Upsert watch history
    const existing = await prisma.watch_history.findFirst({
      where: {
        user_id: userId,
        movie_id: movieId,
      },
    });

    if (existing) {
      await prisma.watch_history.update({
        where: { id: existing.id },
        data: {
          episode_id: episodeId ? parseInt(episodeId, 10) : null,
          watch_time: progress ? Math.round(progress) : 0,
          duration: duration ? Math.round(duration) : 0,
          last_watched_at: new Date(),
        },
      });
    } else {
      await prisma.watch_history.create({
        data: {
          user_id: userId,
          movie_id: movieId,
          episode_id: episodeId ? parseInt(episodeId, 10) : null,
          watch_time: progress ? Math.round(progress) : 0,
          duration: duration ? Math.round(duration) : 0,
          last_watched_at: new Date(),
        },
      });
    }

    if (watchedSeconds && watchedSeconds > 0) {
      const now = new Date();
      const todayUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

      const existingDailyStat = await prisma.daily_watch_stats.findFirst({
        where: {
          user_id: userId,
          watch_date: todayUTC,
        },
      });

      if (existingDailyStat) {
        await prisma.daily_watch_stats.update({
          where: { id: existingDailyStat.id },
          data: {
            watch_time: { increment: Math.round(watchedSeconds) },
          },
        });
      } else {
        await prisma.daily_watch_stats.create({
          data: {
            user_id: userId,
            watch_date: todayUTC,
            watch_time: Math.round(watchedSeconds),
          },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Lỗi lưu lịch sử xem:', err);
    return NextResponse.json({ error: 'Lỗi hệ thống!' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { getSession } = await import('@/lib/auth');
    const session = await getSession();
    const userIdStr = session?.userId?.toString();
    if (!userIdStr) {
      return NextResponse.json({ error: 'Chưa đăng nhập!' }, { status: 401 });
    }
    const userId = parseInt(userIdStr, 10);

    const { movieId } = await request.json();
    if (!movieId) {
      return NextResponse.json({ error: 'Thiếu movieId' }, { status: 400 });
    }

    await prisma.watch_history.deleteMany({
      where: {
        user_id: userId,
        movie_id: parseInt(movieId, 10),
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Lỗi xóa lịch sử xem:', err);
    return NextResponse.json({ error: 'Lỗi hệ thống!' }, { status: 500 });
  }
}

