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
      return NextResponse.json({ success: false, message: 'Bạn chưa đăng nhập' }, { status: 401 });
    }
    const userId = parseInt(userIdStr, 10);

    const body = await request.json();
    const roomCode = body.room_code || '';

    if (!roomCode) {
      return NextResponse.json({ success: false, message: 'Mã phòng không hợp lệ' }, { status: 400 });
    }

    const room = await prisma.watch_rooms.findUnique({
      where: { room_id: roomCode }
    });

    if (!room) {
      return NextResponse.json({ success: false, message: 'Phòng không tồn tại hoặc đã đóng' }, { status: 404 });
    }

    // Verify if host is executing, or if the movie has ended
    const isEnded = body.is_ended === true;
    if (userId !== room.host_id && !isEnded) {
      return NextResponse.json({ success: false, message: 'Chỉ chủ phòng mới được đóng phòng chiếu' }, { status: 403 });
    }

    // Delete room
    await prisma.watch_rooms.delete({
      where: { room_id: roomCode }
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Delete Room API Error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
