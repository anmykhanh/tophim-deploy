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
      return NextResponse.json({ success: false, message: 'Bạn cần đăng nhập để gửi tin nhắn' }, { status: 401 });
    }
    const userId = parseInt(userIdStr, 10);

    const body = await request.json();
    const roomCode = body.room_code || '';
    const message = (body.message || '').trim();

    if (!roomCode) {
      return NextResponse.json({ success: false, message: 'Mã phòng không hợp lệ' }, { status: 400 });
    }

    if (!message) {
      return NextResponse.json({ success: false, message: 'Nội dung tin nhắn trống' }, { status: 400 });
    }

    // Verify room exists
    const room = await prisma.watch_rooms.findUnique({
      where: { room_id: roomCode }
    });

    if (!room) {
      return NextResponse.json({ success: false, message: 'Phòng không tồn tại' }, { status: 404 });
    }

    // Insert message
    await prisma.watch_room_messages.create({
      data: {
        room_id: roomCode,
        user_id: userId,
        message: message
      }
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Chat API Error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
