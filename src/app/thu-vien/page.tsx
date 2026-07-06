import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import LibraryClient from '@/components/LibraryClient';

interface PageProps {
  searchParams: Promise<{
    tab?: string;
  }>;
}

export default async function LibraryPage({ searchParams }: PageProps) {
  const cookieStore = await cookies();
  const { getSession } = await import('@/lib/auth');
  const session = await getSession();
  const userIdStr = session?.userId?.toString();

  if (!userIdStr) {
    redirect('/pages/login');
  }

  const userId = parseInt(userIdStr);
  
  // Resolve search parameters
  const { tab } = await searchParams;
  let currentTab = tab || 'history';
  const validTabs = ['history', 'watch_later', 'favorite', 'folder', 'actor'];
  if (!validTabs.includes(currentTab)) {
    currentTab = 'history';
  }

  let movies: any[] = [];
  let folders: any[] = [];
  let actors: any[] = [];

  if (currentTab === 'history') {
    const historyItems = await prisma.watch_history.findMany({
      where: { user_id: userId },
      orderBy: { last_watched_at: 'desc' },
    });
    const movieIds = historyItems.map((item) => item.movie_id);

    const dbMovies = await prisma.movies.findMany({
      where: { id: { in: movieIds } },
      include: {
        episodes: {
          select: { id: true, name: true }
        }
      }
    });

    movies = historyItems
      .map((item) => {
        const m = dbMovies.find((dbm) => dbm.id === item.movie_id);
        if (!m) return null;
        
        // Find watched episode details
        const watchedEpisode = m.episodes.find(ep => ep.id === item.episode_id);
        const lastWatchedEpisodeName = watchedEpisode ? watchedEpisode.name : '';
        
        return {
          id: m.id,
          title: m.title,
          slug: m.slug,
          original_title: m.original_title,
          poster_url: m.poster_url,
          thumb_url: m.thumb_url,
          quality: m.quality,
          latest_episode: lastWatchedEpisodeName || (m.episodes[0]?.name || null),
          watch_time: item.watch_time || 0,
          action_time: item.last_watched_at.toISOString(),
        };
      })
      .filter(Boolean);
  } else if (currentTab === 'watch_later') {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const wl = await prisma.watch_history.findMany({
      where: {
        user_id: userId,
        last_watched_at: { gte: thirtyDaysAgo },
        watch_time: { gt: 5 },
      },
      orderBy: { last_watched_at: 'desc' },
    });
    const movieIds = wl.map((item) => item.movie_id);

    const dbMovies = await prisma.movies.findMany({
      where: { id: { in: movieIds } },
      include: {
        episodes: {
          select: { id: true, name: true }
        }
      },
    });

    movies = wl
      .map((item) => {
        const m = dbMovies.find((dbm) => dbm.id === item.movie_id);
        if (!m) return null;
        
        // Find watched episode details
        const watchedEpisode = m.episodes.find(ep => ep.id === item.episode_id);
        const lastWatchedEpisodeName = watchedEpisode ? watchedEpisode.name : '';

        return {
          id: m.id,
          title: m.title,
          slug: m.slug,
          original_title: m.original_title,
          poster_url: m.poster_url,
          thumb_url: m.thumb_url,
          quality: m.quality,
          latest_episode: lastWatchedEpisodeName || (m.episodes[0]?.name || null),
          episode_id: item.episode_id,
          watch_time: item.watch_time || 0,
          duration: item.duration || 0,
          action_time: item.last_watched_at.toISOString(),
        };
      })
      .filter(Boolean);
  } else if (currentTab === 'favorite') {
    const fav = await prisma.favorites.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });
    const movieIds = fav.map((item) => item.movie_id);

    const dbMovies = await prisma.movies.findMany({
      where: { id: { in: movieIds } },
      include: {
        episodes: {
          orderBy: { order_num: 'desc' },
          take: 1,
          select: { name: true },
        },
      },
    });

    movies = fav
      .map((item) => {
        const m = dbMovies.find((dbm) => dbm.id === item.movie_id);
        if (!m) return null;
        return {
          id: m.id,
          title: m.title,
          slug: m.slug,
          original_title: m.original_title,
          poster_url: m.poster_url,
          thumb_url: m.thumb_url,
          quality: m.quality,
          latest_episode: m.episodes[0]?.name || null,
          action_time: item.created_at.toISOString(),
        };
      })
      .filter(Boolean);
  } else if (currentTab === 'folder') {
    const foldersList = await prisma.movie_folders.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      include: {
        movie_folder_items: {
          orderBy: { created_at: 'desc' },
          include: {
            movies: {
              include: {
                episodes: {
                  orderBy: { order_num: 'desc' },
                  take: 1,
                  select: { name: true },
                },
              },
            },
          },
        },
      },
    });

    folders = foldersList.map((f) => ({
      id: f.id,
      name: f.name,
      slug: f.slug,
      is_public: f.is_public,
      created_at: f.created_at.toISOString(),
      movie_count: f.movie_folder_items.length,
      movies: f.movie_folder_items.map((item) => {
        const m = item.movies;
        return {
          id: m.id,
          title: m.title,
          slug: m.slug,
          original_title: m.original_title,
          poster_url: m.poster_url,
          thumb_url: m.thumb_url,
          quality: m.quality,
          latest_episode: m.episodes[0]?.name || null,
        };
      }),
    }));
  } else if (currentTab === 'actor') {
    const actorFavs = await prisma.actor_favorites.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      include: {
        actors: true,
      },
    });

    actors = actorFavs.map((fav) => ({
      id: fav.actors.id,
      name: fav.actors.name,
      slug: fav.actors.slug,
      avatar: fav.actors.avatar,
      action_time: fav.created_at.toISOString(),
    }));
  }

  return (
    <LibraryClient
      currentTab={currentTab as any}
      movies={movies}
      folders={folders}
      actors={actors}
    />
  );
}
