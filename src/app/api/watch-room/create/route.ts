import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const { getSession } = await import('@/lib/auth');
  const session = await getSession();
  const userIdStr = session?.userId?.toString();
    if (!userIdStr) {
      return NextResponse.json({ success: false, message: 'Bạn cần đăng nhập để tạo phòng' }, { status: 401 });
    }
    const userId = parseInt(userIdStr, 10);

    const body = await request.json();
    const movieId = parseInt(body.movie_id, 10);
    const episodeId = parseInt(body.episode_id, 10);
    const serverName = body.server_name || '';
    const capacity = parseInt(body.capacity || '10', 10);
    const isPublic = body.is_public === true;
    let title = (body.title || '').trim();
    let scheduledAt = body.scheduled_at ? new Date(body.scheduled_at) : null;

    if (isNaN(movieId) || isNaN(episodeId) || !serverName) {
      return NextResponse.json({ success: false, message: 'Thông tin phim hoặc tập phim không hợp lệ' }, { status: 400 });
    }

    // Fetch movie details to verify and set fallback title
    const movie = await prisma.movies.findUnique({
      where: { id: movieId }
    });

    if (!movie) {
      return NextResponse.json({ success: false, message: 'Phim không tồn tại' }, { status: 404 });
    }

    if (!title) {
      title = `Xem chung: ${movie.title}`;
    }

    // Generate unique room code
    const roomCode = 'ROOM-' + crypto.randomBytes(4).toString('hex').toUpperCase();

    // Insert room
    await prisma.watch_rooms.create({
      data: {
        room_id: roomCode,
        host_id: userId,
        movie_id: movieId,
        episode_id: episodeId,
        server_name: serverName,
        title: title,
        capacity: capacity,
        is_public: isPublic,
        scheduled_at: scheduledAt,
        status: 'playing',
        current_time: 0.0
      }
    });

    return NextResponse.json({ success: true, room_code: roomCode });
  } catch (err: any) {
    console.error('Create Room API Error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
