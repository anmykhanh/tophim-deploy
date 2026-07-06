import { notFound, redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import WatchRoomClient from './WatchRoomClient';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function XemChungRoomPage({ params }: PageProps) {
  const { id: roomCode } = await params;
  if (!roomCode) {
    notFound();
  }

  // Fetch room details
  const roomRaw = await prisma.watch_rooms.findUnique({
    where: { room_id: roomCode },
    include: {
      movies: {
        select: {
          title: true,
          poster_url: true,
          thumb_url: true,
          description: true
        }
      },
      users: {
        select: {
          name: true
        }
      }
    }
  });

  if (!roomRaw) {
    return (
      <div style={{ color: 'white', background: '#09090b', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
        <p className="mb-4">Phòng xem chung này không tồn tại hoặc đã bị đóng!</p>
        <Link href="/xem-chung" style={{ color: '#ffd875', textDecoration: 'underline' }}>Quay lại sảnh chờ</Link>
      </div>
    );
  }

  // Query episode separately since there is no Prisma relation defined in schema
  const episodeRaw = await prisma.episodes.findUnique({
    where: { id: roomRaw.episode_id },
    select: {
      video_url: true,
      name: true
    }
  });

  const room = {
    ...JSON.parse(JSON.stringify(roomRaw)),
    episodes: episodeRaw ? JSON.parse(JSON.stringify(episodeRaw)) : null
  };

  const cookieStore = await cookies();
  const { getSession } = await import('@/lib/auth');
  const session = await getSession();
  const userIdStr = session?.userId?.toString();
  const currentUserId = userIdStr ? parseInt(userIdStr, 10) : 0;

  let currentUser = null;
  if (currentUserId) {
    const dbUser = await prisma.users.findUnique({
      where: { id: currentUserId },
      select: { id: true, name: true, avatar: true }
    });
    if (dbUser) {
      currentUser = JSON.parse(JSON.stringify(dbUser));
    }
  }

  return (
    <WatchRoomClient room={room} currentUser={currentUser} />
  );
}
