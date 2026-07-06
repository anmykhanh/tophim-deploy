import { notFound, redirect } from 'next/navigation';
import prisma, { normalizeNFC } from '@/lib/db';
import WatchPageClient from '@/components/WatchPageClient';
import { Metadata } from 'next';
import { cookies, headers } from 'next/headers';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ep?: string; t?: string }>;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (!slug) return {};

  const movie = await prisma.movies.findUnique({
    where: { slug },
  });

  if (!movie) return {};

  const sParams = await searchParams;
  const epStr = sParams.ep;

  let currentEpisodeName = 'Mới Nhất';
  if (epStr) {
    const epId = parseInt(epStr, 10);
    if (!isNaN(epId)) {
      const ep = await prisma.episodes.findFirst({
        where: { id: epId, movie_id: movie.id }
      });
      if (ep) {
        currentEpisodeName = ep.name;
      }
    }
  } else {
    const firstEp = await prisma.episodes.findFirst({
      where: { movie_id: movie.id },
      orderBy: [
        { server_name: 'asc' },
        { order_num: 'asc' }
      ]
    });
    if (firstEp) {
      currentEpisodeName = firstEp.name;
    }
  }

  const headersList = await headers();
  const host = headersList.get('host') || 'localhost:3000';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const domain = `${protocol}://${host}`;

  let imageUrl = movie.poster_url || '';
  if (imageUrl && !imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
    imageUrl = `${domain}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
  }

  const title = `Xem Phim ${movie.title} Tập ${currentEpisodeName} Vietsub Thuyết Minh | Tô Phim`;
  const cleanDescription = movie.description
    ? movie.description.replace(/<[^>]*>/g, '').substring(0, 160) + '...'
    : `Xem phim ${movie.title} Tập ${currentEpisodeName} chất lượng cao, vietsub, thuyết minh mới nhất tại Tô Phim.`;

  const url = `${domain}/xem/${slug}${epStr ? `?ep=${epStr}` : ''}`;

  return {
    title,
    description: cleanDescription,
    openGraph: {
      title: `Xem Phim ${movie.title} Tập ${currentEpisodeName}`,
      description: cleanDescription,
      url,
      siteName: 'Tô Phim',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: movie.title,
        },
      ],
      type: 'video.episode',
    },
    twitter: {
      card: 'summary_large_image',
      title: `Xem Phim ${movie.title} Tập ${currentEpisodeName}`,
      description: cleanDescription,
      images: [imageUrl],
    },
  };
}

export default async function WatchPage({ params, searchParams }: PageProps) {
  const cookieStore = await cookies();
  const { getSession } = await import('@/lib/auth');
  const session = await getSession();
  const userIdStr = session?.userId?.toString();
  const userId = userIdStr ? parseInt(userIdStr) : null;

  // Fetch current user
  let currentUser = null;
  if (userId) {
    const userDb = await prisma.users.findUnique({
      where: { id: userId },
      select: { id: true, name: true, avatar: true, role: true }
    });
    if (userDb) {
      currentUser = {
        id: userDb.id,
        name: userDb.name,
        avatar: userDb.avatar,
        role: userDb.role ?? 'user',
      };
    }
  }

  const { slug } = await params;
  const sParams = await searchParams;
  const epStr = sParams.ep;
  const tStr = sParams.t;
  const queryTime = tStr ? parseFloat(tStr) : 0;

  if (!slug) {
    redirect('/');
  }

  // Fetch movie details by slug
  const movie = await prisma.movies.findUnique({
    where: { slug },
    include: {
      movie_category: {
        include: {
          categories: true
        }
      }
    }
  });

  if (!movie) {
    notFound();
  }

  const movieId = movie.id;

  // Views are now incremented via client-side API call in WatchPageClient

  // Fetch all episodes of this movie
  const rawEpisodes = await prisma.episodes.findMany({
    where: { movie_id: movieId },
    include: {
      episode_subtitles: true
    },
    orderBy: [
      { order_num: 'asc' }
    ]
  });

  const globalServers = await prisma.servers.findMany({
    orderBy: { priority: 'desc' }
  });

  const getProviderPriority = (serverName: string) => {
    const name = serverName.toLowerCase();

    if (movie.server_priority) {
      const priorities = movie.server_priority.split(',').map((s: string) => s.trim().toLowerCase());
      const idx = priorities.findIndex((p: string) => name.includes(p));
      if (idx !== -1) return idx - 1000; // negative to put it at the top
    }

    const foundGlobal = globalServers.find(s =>
      name.includes(s.name.toLowerCase()) ||
      (s.display_name && name.includes(s.display_name.toLowerCase()))
    );
    if (foundGlobal) {
      return -foundGlobal.priority; // negative because lower number is higher priority in sorting
    }

    // fallback
    if (name.includes('ophim')) return 1;
    if (name.includes('kkphim') || name.includes('kk')) return 2;
    if (name.includes('nguonc') || name.includes('nc')) return 3;
    if (name.includes('vsmov')) return 4;
    return 99;
  };

  const episodes = [...rawEpisodes].sort((a, b) => {
    const priorityA = getProviderPriority(a.server_name);
    const priorityB = getProviderPriority(b.server_name);
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    return (a.order_num ?? 0) - (b.order_num ?? 0);
  });


  if (episodes.length === 0) {
    redirect(`/phim/${slug}`);
  }

  // Determine current episode to play
  let currentEpisode = episodes[0];
  if (epStr) {
    const epId = parseInt(epStr, 10);
    if (!isNaN(epId)) {
      const found = episodes.find(e => e.id === epId);
      if (found) {
        currentEpisode = found;
      }
    }
  }

  let tmdbTotalEpisodes = 0;
  if (movie.tmdb_id && movie.type && ['phimbo', 'hoathinh', 'tvshows'].includes(movie.type)) {
    const setting = await prisma.settings.findUnique({ where: { key: 'tmdb_api_key' } });
    const apiKey = setting?.value || process.env.TMDB_API_KEY;
    if (apiKey) {
      try {
        const res = await fetch(`https://api.tmdb.org/3/tv/${movie.tmdb_id}?api_key=${apiKey}&language=vi-VN`, { next: { revalidate: 3600 } });
        if (res.ok) {
          const data = await res.json();
          if (data.number_of_episodes) {
            tmdbTotalEpisodes = data.number_of_episodes;
          }
        }
      } catch (e) { }
    }
  }

  const serializedMovie = {
    ...movie,
    imdb_rating: movie.imdb_rating ? Number(movie.imdb_rating) : null,
    tmdb_total_episodes: tmdbTotalEpisodes,
    created_at: movie.created_at.toISOString(),
    updated_at: movie.updated_at.toISOString(),
    categories: movie.movie_category.map(mc => mc.categories).filter(c => c && c.type === 'genre')
  };

  const serializedEpisodes = episodes.map(ep => ({
    ...ep,
    created_at: ep.created_at.toISOString()
  }));

  const serializedCurrentEpisode = {
    ...currentEpisode,
    created_at: currentEpisode.created_at.toISOString()
  };

  // Fetch comments
  const comments = await prisma.comments.findMany({
    where: { movie_id: movieId, status: true },
    include: {
      users: {
        select: {
          id: true,
          name: true,
          avatar: true,
          role: true,
          user_labels: true,
          gender: true
        }
      }
    },
    orderBy: { created_at: 'desc' }
  });

  const commentIds = comments.map(c => c.id);
  const allLikes = commentIds.length > 0
    ? await prisma.comment_likes.findMany({
      where: { comment_id: { in: commentIds } }
    })
    : [];

  const isAdmin = currentUser?.role === 'admin';

  const serializedComments = comments.map(c => {
    const displayUser = { ...c.users, role: c.users.role ?? 'user' as const };

    const likes = allLikes.filter(l => l.comment_id === c.id);
    const likeCount = likes.length;
    const isLiked = currentUser ? likes.some(l => l.user_id === currentUser.id) : false;

    return {
      id: c.id,
      parent_id: c.parent_id,
      content: c.content,
      gif_url: c.gif_url,
      is_spoiler: c.is_spoiler,
      created_at: c.created_at.toISOString(),
      users: displayUser,
      real_user: isAdmin ? { id: c.users.id, name: c.users.name, avatar: c.users.avatar } : null,
      likeCount,
      isLiked
    };
  });

  // Fetch actors
  const movieActors = await prisma.movie_actor.findMany({
    where: { movie_id: movieId },
    include: { actors: true }
  });
  const actors = movieActors.map(ma => ma.actors);

  // Fetch recommended movies
  const recommendations = await prisma.movies.findMany({
    where: { type: movie.type, id: { not: movieId } },
    orderBy: { created_at: 'desc' },
    take: 12
  });

  // Fetch GIPHY API KEY
  const giphyKeySetting = await prisma.settings.findUnique({
    where: { key: 'giphy_api_key' }
  });
  const giphyApiKey = giphyKeySetting?.value || 'dc6zaTOxFJmzC';

  // Fetch Facebook Group Setting from Database
  const facebookGroupSetting = await prisma.settings.findUnique({
    where: { key: 'social_facebook_group' }
  });
  const facebookGroupUrl = facebookGroupSetting?.value || 'https://facebook.com';

  const serializedRecommendations = recommendations.map(m => ({
    ...m,
    imdb_rating: m.imdb_rating ? Number(m.imdb_rating) : null,
    created_at: m.created_at.toISOString(),
    updated_at: m.updated_at.toISOString()
  }));

  let seasonsList: Array<{ id: number; title: string; slug: string }> = [];

  const getBaseTitle = (t: string) => {
    return t
      .replace(/\s*\(?Phần\s+\d+\)?\s*$/i, '')
      .replace(/\s*\(?Season\s+\d+\)?\s*$/i, '')
      .trim();
  };

  const baseTitle = getBaseTitle(movie.title);
  if (baseTitle) {
    const titleMatches = await prisma.movies.findMany({
      where: {
        OR: [
          { title: { startsWith: baseTitle } },
          { title: { contains: baseTitle } }
        ]
      },
      select: {
        id: true,
        title: true,
        slug: true
      }
    });
    const filteredMatches = titleMatches.filter(m => getBaseTitle(m.title) === baseTitle);

    const uniqueMoviesMap = new Map<number, { id: number; title: string; slug: string }>();
    seasonsList.forEach(s => uniqueMoviesMap.set(s.id, s));
    filteredMatches.forEach(m => uniqueMoviesMap.set(m.id, m));
    seasonsList = Array.from(uniqueMoviesMap.values());
  }

  if (!seasonsList.some(s => s.id === movieId)) {
    seasonsList.push({ id: movie.id, title: movie.title, slug: movie.slug });
  }

  seasonsList.sort((a, b) => a.title.localeCompare(b.title, 'vi', { numeric: true, sensitivity: 'base' }));

  // Fetch Ads settings
  const adsSettings = await prisma.settings.findMany({
    where: { key: { startsWith: 'ads_' } }
  });
  const adsConfig = adsSettings.reduce((acc, curr) => {
    acc[curr.key] = curr.value || '';
    return acc;
  }, {} as Record<string, string>);

  // Fetch watch history progress for this user & movie (only apply if matching the current episode)
  let initialProgress = 0;
  if (userId) {
    const historyEntry = await prisma.watch_history.findFirst({
      where: {
        user_id: userId,
        movie_id: movieId,
      },
      select: {
        watch_time: true,
        episode_id: true
      }
    });
    if (historyEntry && historyEntry.episode_id === currentEpisode.id) {
      initialProgress = historyEntry.watch_time || 0;
    }
  }

  const effectiveInitialProgress = Math.max(initialProgress, queryTime > 0 ? queryTime : 0);

  return (
    <div className="min-h-screen bg-[#0f111a] text-white pt-[80px] lg:pt-[100px] watch-page-wrapper">
      <WatchPageClient
        movie={normalizeNFC(serializedMovie)}
        episodes={normalizeNFC(serializedEpisodes)}
        currentEpisode={normalizeNFC(serializedCurrentEpisode)}
        comments={normalizeNFC(serializedComments)}
        actors={normalizeNFC(actors)}
        recommendations={normalizeNFC(serializedRecommendations)}
        currentUser={currentUser}
        giphyApiKey={giphyApiKey}
        facebookGroupUrl={facebookGroupUrl}
        seasons={normalizeNFC(seasonsList)}
        adsConfig={adsConfig}
        initialProgress={effectiveInitialProgress}
      />
    </div>
  );
}
