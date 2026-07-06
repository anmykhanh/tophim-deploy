import { notFound, redirect } from 'next/navigation';
import prisma, { normalizeNFC } from '@/lib/db';
import MovieDetailClient from '@/components/MovieDetailClient';
import { Metadata } from 'next';
import { cookies, headers } from 'next/headers';

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getMovieGallery(movie: any, tmdbApiKey: string): Promise<string[]> {
  const gallery: string[] = [];
  try {
    let tmdbId = movie.tmdb_id;
    const isTv = movie.type === 'phimbo' || movie.type === 'tvshows';

    if (!tmdbId) {
      const query = movie.original_title || movie.title;
      const searchType = isTv ? 'tv' : 'movie';
      const searchUrl = `https://api.tmdb.org/3/search/${searchType}?api_key=${tmdbApiKey}&query=${encodeURIComponent(query)}&year=${movie.year || ''}`;

      const searchRes = await fetch(searchUrl, { next: { revalidate: 86400 } });
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.results?.[0]) {
          tmdbId = searchData.results[0].id;
          await prisma.movies.update({
            where: { id: movie.id },
            data: { tmdb_id: tmdbId }
          });
        }
      }
    }

    if (tmdbId) {
      const searchType = isTv ? 'tv' : 'movie';
      const imagesUrl = `https://api.tmdb.org/3/${searchType}/${tmdbId}/images?api_key=${tmdbApiKey}`;
      const imagesRes = await fetch(imagesUrl, { next: { revalidate: 86400 } });
      if (imagesRes.ok) {
        const imagesData = await imagesRes.json();
        const backdrops = imagesData.backdrops || [];
        backdrops.slice(0, 12).forEach((img: any) => {
          gallery.push(`https://image.tmdb.org/t/p/w780${img.file_path}`);
        });
      }
    }
  } catch (err) {
    console.error("Failed to fetch gallery from TMDB:", err);
  }

  if (gallery.length === 0) {
    if (movie.thumb_url) gallery.push(movie.thumb_url);
  }

  return gallery;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (!slug) return {};

  const movie = await prisma.movies.findUnique({
    where: { slug },
  });

  if (!movie) return {};

  const headersList = await headers();
  const host = headersList.get('host') || 'localhost:3000';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const domain = `${protocol}://${host}`;

  let imageUrl = movie.poster_url || '';
  if (imageUrl && !imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
    imageUrl = `${domain}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
  }

  const title = `Phim ${movie.title} ${movie.original_title ? `(${movie.original_title})` : ''} - Xem Phim Hay | Tô Phim`;
  const cleanDescription = movie.description
    ? movie.description.replace(/<[^>]*>/g, '').substring(0, 160) + '...'
    : `Xem phim ${movie.title} chất lượng cao, vietsub, thuyết minh mới nhất tại Tô Phim.`;

  return {
    title,
    description: cleanDescription,
    openGraph: {
      title: `Phim ${movie.title} ${movie.original_title ? `(${movie.original_title})` : ''}`,
      description: cleanDescription,
      url: `${domain}/phim/${slug}`,
      siteName: 'Tô Phim',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: movie.title,
        },
      ],
      type: 'video.movie',
    },
    twitter: {
      card: 'summary_large_image',
      title: `Phim ${movie.title} ${movie.original_title ? `(${movie.original_title})` : ''}`,
      description: cleanDescription,
      images: [imageUrl],
    },
  };
}

export default async function MovieDetailPage({ params }: PageProps) {
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
  if (!slug) {
    redirect('/');
  }

  // Fetch movie details by slug
  const movie = await prisma.movies.findUnique({
    where: { slug },
  });

  if (!movie) {
    notFound();
  }

  const movieId = movie.id;

  // Fetch genres and countries
  const movieCategories = await prisma.movie_category.findMany({
    where: { movie_id: movieId },
    include: { categories: true }
  });

  const genres = movieCategories
    .filter(mc => mc.categories.type === 'genre')
    .map(mc => mc.categories);

  const countries = movieCategories
    .filter(mc => mc.categories.type === 'country')
    .map(mc => mc.categories);

  // Fetch actors
  const movieActors = await prisma.movie_actor.findMany({
    where: { movie_id: movieId },
    include: { actors: true }
  });
  const actors = movieActors.map(ma => ma.actors);

  // Fetch episodes
  const rawEpisodes = await prisma.episodes.findMany({
    where: { movie_id: movieId },
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
      if (idx !== -1) return idx - 1000;
    }

    const foundGlobal = globalServers.find(s =>
      name.includes(s.name.toLowerCase()) ||
      (s.display_name && name.includes(s.display_name.toLowerCase()))
    );
    if (foundGlobal) {
      return -foundGlobal.priority;
    }

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
          gender: true,
        }
      }
    },
    orderBy: { created_at: 'desc' }
  });

  const isAdmin = currentUser?.role === 'admin';

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

  // Safe types normalization
  const serializedMovie = {
    ...movie,
    imdb_rating: movie.imdb_rating ? Number(movie.imdb_rating) : null,
    tmdb_total_episodes: tmdbTotalEpisodes,
    created_at: movie.created_at.toISOString(),
    updated_at: movie.updated_at.toISOString()
  };

  const serializedEpisodes = episodes.map(ep => ({
    ...ep,
    created_at: ep.created_at.toISOString()
  }));

  const serializedComments = comments.map(c => {
    const displayUser = { ...c.users, role: c.users.role ?? 'user' as const, user_labels: c.users.user_labels };
    return {
      id: c.id,
      content: c.content,
      gif_url: c.gif_url,
      is_spoiler: c.is_spoiler,
      created_at: c.created_at.toISOString(),
      users: displayUser,
      real_user: isAdmin ? { id: c.users.id, name: c.users.name, avatar: c.users.avatar } : null,
    };
  });

  // Fetch GIPHY API KEY
  const giphyKeySetting = await prisma.settings.findUnique({
    where: { key: 'giphy_api_key' }
  });
  const giphyApiKey = giphyKeySetting?.value || 'dc6zaTOxFJmzC';

  // Fetch Ads settings
  const adsSettings = await prisma.settings.findMany({
    where: { key: { startsWith: 'ads_' } }
  });
  const adsConfig = adsSettings.reduce((acc, curr) => {
    acc[curr.key] = curr.value || '';
    return acc;
  }, {} as Record<string, string>);

  // Fetch TMDB settings and movie gallery
  const tmdbKeySetting = await prisma.settings.findUnique({
    where: { key: 'tmdb_api_key' }
  });
  const tmdbApiKey = tmdbKeySetting?.value || '';

  // Fetch recommended movies
  const recommendations = await prisma.movies.findMany({
    where: { type: movie.type, id: { not: movieId } },
    orderBy: { created_at: 'desc' },
    take: 12
  });

  const serializedRecommendations = recommendations.map(m => ({
    ...m,
    imdb_rating: m.imdb_rating ? Number(m.imdb_rating) : null,
    created_at: m.created_at.toISOString(),
    updated_at: m.updated_at.toISOString()
  }));

  let gallery: string[] = [];
  if (tmdbApiKey) {
    gallery = await getMovieGallery(movie, tmdbApiKey);
  } else {
    if (movie.thumb_url) gallery.push(movie.thumb_url);
  }

  return (
    <div className="min-h-screen bg-[#0f111a] text-white">
      {/* JSON-LD Structured Data for Google Rich Results */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': movie.type === 'phimbo' ? 'TVSeries' : 'Movie',
            name: movie.title,
            alternateName: movie.original_title || undefined,
            description: movie.description
              ? movie.description.replace(/<[^>]*>/g, '').substring(0, 500)
              : undefined,
            image: movie.poster_url || movie.thumb_url || undefined,
            datePublished: movie.year ? String(movie.year) : undefined,
            inLanguage: 'vi',
            aggregateRating: movie.imdb_rating
              ? {
                '@type': 'AggregateRating',
                ratingValue: Number(movie.imdb_rating),
                bestRating: 10,
                worstRating: 0,
                ratingCount: movie.views || 1,
              }
              : undefined,
            genre: genres.map((g: any) => g.name),
            countryOfOrigin: countries.map((c: any) => ({ '@type': 'Country', name: c.name })),
            url: `https://tophim.com/phim/${movie.slug}`,
          }),
        }}
      />
      <MovieDetailClient
        movie={normalizeNFC(serializedMovie)}
        genres={normalizeNFC(genres)}
        countries={normalizeNFC(countries)}
        actors={normalizeNFC(actors)}
        episodes={normalizeNFC(serializedEpisodes)}
        comments={normalizeNFC(serializedComments)}
        currentUser={currentUser}
        giphyApiKey={giphyApiKey}
        adsConfig={adsConfig}
        gallery={gallery}
        recommendations={normalizeNFC(serializedRecommendations)}
      />
    </div>
  );
}
