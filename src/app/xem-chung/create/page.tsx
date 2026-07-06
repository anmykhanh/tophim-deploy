import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import CreateRoomClient from './CreateRoomClient';

interface PageProps {
  searchParams: Promise<{ movie_id?: string }>;
}

export default async function XemChungCreatePage({ searchParams }: PageProps) {
  const cookieStore = await cookies();
  const { getSession } = await import('@/lib/auth');
  const session = await getSession();
  const userIdStr = session?.userId?.toString();
  if (!userIdStr) {
    redirect('/pages/login');
  }

  const params = await searchParams;
  const movieId = params.movie_id ? parseInt(params.movie_id, 10) : 0;

  if (movieId <= 0) {
    redirect('/xem-chung/select-movie');
  }

  // Fetch movie
  const movieRaw = await prisma.movies.findUnique({
    where: { id: movieId }
  });

  if (!movieRaw) {
    redirect('/xem-chung/select-movie');
  }

  const movie = JSON.parse(JSON.stringify(movieRaw));

  // Fetch episodes
  const episodesRaw = await prisma.episodes.findMany({
    where: { movie_id: movieId },
    orderBy: [
      { server_name: 'asc' },
      { order_num: 'asc' }
    ]
  });

  const episodes = JSON.parse(JSON.stringify(episodesRaw));

  if (episodes.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white font-sans">
        <div className="text-center space-y-4">
          <p className="text-zinc-400">Phim này chưa có tập nào để khởi tạo phòng xem chung!</p>
          <Link href="/xem-chung/select-movie" className="inline-block px-4 py-2 bg-rose-600 hover:bg-rose-500 rounded-xl text-xs font-bold transition-all text-white decoration-none">
            Chọn phim khác
          </Link>
        </div>
      </div>
    );
  }

  // Group episodes by server
  const servers: Record<string, any[]> = {};
  episodes.forEach((ep: any) => {
    if (!servers[ep.server_name]) {
      servers[ep.server_name] = [];
    }
    servers[ep.server_name].push(ep);
  });

  return (
    <CreateRoomClient movie={movie} servers={servers} />
  );
}

// Inline fallback Link import support
import Link from 'next/link';
