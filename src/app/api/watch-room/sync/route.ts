import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roomCode = searchParams.get('room_code') || '';
    const lastMsgId = parseInt(searchParams.get('last_msg_id') || '0', 10);
    const isHost = parseInt(searchParams.get('is_host') || '0', 10) === 1;
    const currentTime = parseFloat(searchParams.get('current_time') || '0.0');
    const status = searchParams.get('status') || 'paused';

    if (!roomCode) {
      return NextResponse.json({ success: false, message: 'Mã phòng không hợp lệ' }, { status: 400 });
    }

    // Fetch room details
    const room = await prisma.watch_rooms.findUnique({
      where: { room_id: roomCode }
    });

    if (!room) {
      return NextResponse.json({ success: false, message: 'Phòng không tồn tại hoặc đã bị đóng' }, { status: 404 });
    }

    const cookieStore = await cookies();
    const { getSession } = await import('@/lib/auth');
  const session = await getSession();
  const userIdStr = session?.userId?.toString();
    const userId = userIdStr ? parseInt(userIdStr, 10) : 0;

    let finalRoomStatus = room.status;
    let finalRoomTime = room.current_time || 0;

    // Calculate real-time elapsed progress for guests if room is playing
    if (!isHost && room.status === 'playing') {
      const elapsed = (new Date().getTime() - new Date(room.updated_at).getTime()) / 1000;
      finalRoomTime = (room.current_time || 0) + elapsed;
    }

    // If client claims to be the host, check permissions and update room state
    if (isHost && userId === room.host_id) {
      await prisma.watch_rooms.update({
        where: { room_id: roomCode },
        data: {
          current_time: currentTime,
          status: status,
          updated_at: new Date()
        }
      });
      finalRoomStatus = status;
      finalRoomTime = currentTime;
    }

    // Fetch new chat messages
    const newMessages = await prisma.watch_room_messages.findMany({
      where: {
        room_id: roomCode,
        id: { gt: lastMsgId }
      },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      },
      orderBy: { id: 'asc' }
    });

    const messages = newMessages.map(msg => ({
      id: msg.id,
      message: msg.message,
      created_at: msg.created_at,
      user_id: msg.users.id,
      user_name: msg.users.name,
      user_avatar: msg.users.avatar
    }));

    // Clean up old messages older than 1 day in background/asynchronously
    try {
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      await prisma.watch_room_messages.deleteMany({
        where: {
          room_id: roomCode,
          created_at: { lt: oneDayAgo }
        }
      });
    } catch (err) {
      console.error('Failed to clean up old messages:', err);
    }

    return NextResponse.json({
      success: true,
      status: finalRoomStatus,
      current_time: finalRoomTime,
      messages: messages,
      host_id: room.host_id
    });
  } catch (err: any) {
    console.error('Sync Error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
