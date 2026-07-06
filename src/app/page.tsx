import Link from 'next/link';
import prisma from '@/lib/db';
import HeroSlider from '@/components/HeroSlider';
import MovieCardLandscape from '@/components/MovieCardLandscape';
import MovieCardNumbered from '@/components/MovieCardNumbered';
import HomeWidgets from '@/components/HomeWidgets';
import AnimeFeatured from '@/components/AnimeFeatured';
import CategorySection from '@/components/CategorySection';
import CommunitySection from '@/components/CommunitySection';
import MovieSliderSection from '@/components/MovieSliderSection';
import TheaterSliderSection from '@/components/TheaterSliderSection';
import Top10Section from '@/components/Top10Section';
import { Star, Play, Calendar, Film } from 'lucide-react';
import { getPosterUrl, getProxyImageUrl } from '@/lib/image';
import { getCollectionTheme } from '@/lib/theme';
import { getSession } from '@/lib/auth';
import ContinueWatchingSection from '@/components/ContinueWatchingSection';
import HomeLoader from '@/components/HomeLoader';
import HomepagePopup from '@/components/HomepagePopup';

export const dynamic = 'force-dynamic';


export const revalidate = 60; // Revalidate page every 60 seconds

// Safe serialization helper
function serializeMovies(moviesList: any[]) {
  return moviesList.map(movie => ({
    ...movie,
    imdb_rating: movie.imdb_rating ? Number(movie.imdb_rating) : null,
    created_at: movie.created_at ? movie.created_at.toISOString() : null,
    updated_at: movie.updated_at ? movie.updated_at.toISOString() : null,
  }));
}

export default async function HomePage() {
  const session = await getSession();
  const userId = session?.userId;
  let continueWatchingItems: any[] = [];

  const logoSetting = await prisma.settings.findUnique({
    where: { key: 'logo_url' }
  });
  const logoUrl = logoSetting?.value || '/branding/logo.png';

  const todayLocalStr = new Date().toLocaleDateString('sv-SE');
  const today = new Date(todayLocalStr + 'T00:00:00Z');
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    rawSliderMovies, rawRecentMovies, rawKoreaMovies, rawChinaMovies, rawAuMyMovies,
    rawTrending, rawUpcoming, rawHotSingle, rawTop10Single, rawMaybeLike,
    rawHotSeries, rawNewSeries, rawTop10Series, rawNewSingle, rawTopYear,
    rawAnime, rawComments, rawSoiNoi, rawYeuThich, rawHomeCollections, rawHotGenres,
    rawOngoingMovies, rawChieuRapMovies, rawGhostMovies
  ] = await Promise.all([
    prisma.movies.findMany({ where: { is_hot: true, episodes: { some: {} } }, take: 8, orderBy: [{ hot_priority: 'desc' }, { updated_at: 'desc' }] }),
    prisma.movies.findMany({ where: { episodes: { some: {} } }, take: 15, orderBy: [{ year: 'desc' }, { created_at: 'desc' }] }),
    prisma.movies.findMany({ where: { episodes: { some: {} }, movie_category: { some: { categories: { slug: 'han-quoc' } } } }, take: 8, orderBy: [{ year: 'desc' }, { created_at: 'desc' }] }),
    prisma.movies.findMany({ where: { episodes: { some: {} }, movie_category: { some: { categories: { slug: 'trung-quoc' } } } }, take: 8, orderBy: [{ year: 'desc' }, { created_at: 'desc' }] }),
    prisma.movies.findMany({ where: { episodes: { some: {} }, movie_category: { some: { categories: { slug: 'au-my' } } } }, take: 8, orderBy: [{ year: 'desc' }, { created_at: 'desc' }] }),

    // rawTrending ranked by views (yesterday + today)
    prisma.movie_views_stats.findMany({
      where: { view_date: { gte: yesterday }, movies: { episodes: { some: {} } } },
      include: { movies: true }
    }).then(async (stats) => {
      const movieViewsMap: Record<number, { movie: any, views: number }> = {};
      for (const stat of stats) {
        if (!stat.movies) continue;
        if (!movieViewsMap[stat.movie_id]) {
          movieViewsMap[stat.movie_id] = { movie: stat.movies, views: 0 };
        }
        movieViewsMap[stat.movie_id].views += stat.views || 0;
      }
      let sortedMovies = Object.values(movieViewsMap)
        .sort((a, b) => b.views - a.views)
        .map(x => x.movie);
      if (sortedMovies.length < 8) {
        const fallbacks = await prisma.movies.findMany({
          where: { episodes: { some: {} }, id: { notIn: sortedMovies.map(m => m.id) } },
          orderBy: { views: 'desc' },
          take: 8 - sortedMovies.length
        });
        sortedMovies = [...sortedMovies, ...fallbacks];
      }
      return sortedMovies.slice(0, 8);
    }),

    prisma.movies.findMany({ where: { year: 2026, episodes: { some: {} } }, take: 6, orderBy: [{ year: 'desc' }, { created_at: 'desc' }] }),
    prisma.movies.findMany({ where: { type: 'phimle', is_hot: true, episodes: { some: {} } }, take: 8, orderBy: [{ hot_priority: 'desc' }, { updated_at: 'desc' }] }),

    // rawTop10Single ranked by views (yesterday + today)
    prisma.movie_views_stats.findMany({
      where: { view_date: { gte: yesterday }, movies: { type: 'phimle', episodes: { some: {} } } },
      include: { movies: true }
    }).then(async (stats) => {
      const movieViewsMap: Record<number, { movie: any, views: number }> = {};
      for (const stat of stats) {
        if (!stat.movies) continue;
        if (!movieViewsMap[stat.movie_id]) {
          movieViewsMap[stat.movie_id] = { movie: stat.movies, views: 0 };
        }
        movieViewsMap[stat.movie_id].views += stat.views || 0;
      }
      let sortedMovies = Object.values(movieViewsMap)
        .sort((a, b) => b.views - a.views)
        .map(x => x.movie);
      if (sortedMovies.length < 10) {
        const fallbacks = await prisma.movies.findMany({
          where: { type: 'phimle', episodes: { some: {} }, id: { notIn: sortedMovies.map(m => m.id) } },
          orderBy: { views: 'desc' },
          take: 10 - sortedMovies.length
        });
        sortedMovies = [...sortedMovies, ...fallbacks];
      }
      return sortedMovies.slice(0, 10);
    }),

    prisma.movies.findMany({ where: { episodes: { some: {} } }, take: 8, orderBy: { views: 'asc' } }),
    prisma.movies.findMany({ where: { type: 'phimbo', is_hot: true, episodes: { some: {} } }, take: 8, orderBy: [{ hot_priority: 'desc' }, { updated_at: 'desc' }] }),
    prisma.movies.findMany({ where: { type: 'phimbo', episodes: { some: {} } }, take: 8, orderBy: [{ year: 'desc' }, { created_at: 'desc' }] }),

    // rawTop10Series ranked by views (yesterday + today)
    prisma.movie_views_stats.findMany({
      where: { view_date: { gte: yesterday }, movies: { type: 'phimbo', episodes: { some: {} } } },
      include: { movies: true }
    }).then(async (stats) => {
      const movieViewsMap: Record<number, { movie: any, views: number }> = {};
      for (const stat of stats) {
        if (!stat.movies) continue;
        if (!movieViewsMap[stat.movie_id]) {
          movieViewsMap[stat.movie_id] = { movie: stat.movies, views: 0 };
        }
        movieViewsMap[stat.movie_id].views += stat.views || 0;
      }
      let sortedMovies = Object.values(movieViewsMap)
        .sort((a, b) => b.views - a.views)
        .map(x => x.movie);
      if (sortedMovies.length < 10) {
        const fallbacks = await prisma.movies.findMany({
          where: { type: 'phimbo', episodes: { some: {} }, id: { notIn: sortedMovies.map(m => m.id) } },
          orderBy: { views: 'desc' },
          take: 10 - sortedMovies.length
        });
        sortedMovies = [...sortedMovies, ...fallbacks];
      }
      return sortedMovies.slice(0, 10);
    }),

    prisma.movies.findMany({ where: { type: 'phimle', episodes: { some: {} } }, take: 8, orderBy: [{ year: 'desc' }, { created_at: 'desc' }] }),
    prisma.movie_views_stats.findMany({
      where: {
        view_date: {
          gte: oneWeekAgo
        },
        movies: {
          type: 'phimle',
          episodes: { some: {} }
        }
      },
      include: {
        movies: true
      }
    }).then(async (stats) => {
      const movieViewsMap: Record<number, { movie: any, views: number }> = {};
      for (const stat of stats) {
        if (!stat.movies) continue;
        if (!movieViewsMap[stat.movie_id]) {
          movieViewsMap[stat.movie_id] = { movie: stat.movies, views: 0 };
        }
        movieViewsMap[stat.movie_id].views += stat.views || 0;
      }
      let sortedMovies = Object.values(movieViewsMap)
        .sort((a, b) => b.views - a.views)
        .map(x => x.movie);
      if (sortedMovies.length < 10) {
        const fallbacks = await prisma.movies.findMany({
          where: {
            type: 'phimle',
            episodes: { some: {} },
            id: { notIn: sortedMovies.map(m => m.id) }
          },
          orderBy: { views: 'desc' },
          take: 10 - sortedMovies.length
        });
        sortedMovies = [...sortedMovies, ...fallbacks];
      }
      return sortedMovies.slice(0, 10);
    }),
    prisma.movies.findMany({ where: { type: 'hoathinh', episodes: { some: {} } }, include: { movie_category: { include: { categories: true } } }, take: 12, orderBy: [{ year: 'desc' }, { created_at: 'desc' }] }),
    prisma.comments.findMany({ where: { status: true }, take: 10, orderBy: { created_at: 'desc' }, include: { users: { select: { name: true, avatar: true, role: true } }, movies: { select: { id: true, title: true, slug: true, poster_url: true, thumb_url: true } } } }),

    // rawSoiNoi ranked by views (yesterday + today)
    prisma.movie_views_stats.findMany({
      where: { view_date: { gte: yesterday }, movies: { episodes: { some: {} } } },
      include: { movies: { select: { id: true, title: true, slug: true, thumb_url: true, poster_url: true } } }
    }).then(async (stats) => {
      const movieViewsMap: Record<number, { movie: any, views: number }> = {};
      for (const stat of stats) {
        if (!stat.movies) continue;
        if (!movieViewsMap[stat.movie_id]) {
          movieViewsMap[stat.movie_id] = { movie: stat.movies, views: 0 };
        }
        movieViewsMap[stat.movie_id].views += stat.views || 0;
      }
      let sortedMovies = Object.values(movieViewsMap)
        .sort((a, b) => b.views - a.views)
        .map(x => x.movie);
      if (sortedMovies.length < 5) {
        const fallbacks = await prisma.movies.findMany({
          where: { episodes: { some: {} }, id: { notIn: sortedMovies.map(m => m.id) } },
          orderBy: { views: 'desc' },
          take: 5 - sortedMovies.length,
          select: { id: true, title: true, slug: true, thumb_url: true, poster_url: true }
        });
        sortedMovies = [...sortedMovies, ...fallbacks];
      }
      return sortedMovies.slice(0, 5);
    }),

    prisma.movies.findMany({ where: { episodes: { some: {} } }, take: 5, orderBy: [{ favorites: { _count: 'desc' } }, { imdb_rating: 'desc' }, { views: 'desc' }], select: { id: true, title: true, slug: true, thumb_url: true, poster_url: true } }),
    prisma.categories.findMany({ where: { type: 'collection', status: true }, orderBy: [{ order_num: 'asc' }, { id: 'desc' }] }),
    prisma.categories.findMany({ where: { type: 'genre', status: true }, take: 5, orderBy: { movie_category: { _count: 'desc' } }, select: { id: true, name: true, slug: true, color: true } }),
    prisma.movies.findMany({ where: { status: 'ongoing', episodes: { some: {} } }, take: 10, orderBy: { updated_at: 'desc' } }),
    prisma.movies.findMany({ where: { episodes: { some: {} }, movie_category: { some: { categories: { slug: 'phim-chieu-rap' } } } }, take: 8, orderBy: [{ year: 'desc' }, { created_at: 'desc' }] }),
    prisma.movies.findMany({ where: { episodes: { some: {} }, movie_category: { some: { categories: { slug: 'kinh-di' } } } }, take: 12, orderBy: [{ year: 'desc' }, { created_at: 'desc' }] })
  ]);

  const sliderMovies = serializeMovies(rawSliderMovies);
  const recentMovies = serializeMovies(rawRecentMovies);
  const koreaMovies = serializeMovies(rawKoreaMovies);
  const chinaMovies = serializeMovies(rawChinaMovies);
  const auMyMovies = serializeMovies(rawAuMyMovies);
  const trendingMovies = serializeMovies(rawTrending);
  const upcomingMovies = serializeMovies(rawUpcoming);
  const hotSingleMovies = serializeMovies(rawHotSingle);
  const top10SingleMovies = serializeMovies(rawTop10Single);
  const maybeLikeMovies = serializeMovies(rawMaybeLike);
  const hotSeriesMovies = serializeMovies(rawHotSeries);
  const newSeriesMovies = serializeMovies(rawNewSeries);
  const top10SeriesMovies = serializeMovies(rawTop10Series);
  const newSingleMovies = serializeMovies(rawNewSingle);
  const topYearMovies = serializeMovies(rawTopYear);
  const animeMovies = serializeMovies(rawAnime);
  const ongoingMovies = serializeMovies(rawOngoingMovies);
  const chieuRapMovies = serializeMovies(rawChieuRapMovies);
  const ghostMovies = serializeMovies(rawGhostMovies);
  const soiNoiMovies = rawSoiNoi;
  const yeuThichMovies = rawYeuThich;
  const hotGenres = rawHotGenres;

  const comments = rawComments
    .filter((c: any) => c.movies && c.users)
    .map((c: any) => ({
      id: c.id,
      content: c.content,
      created_at: c.created_at.toISOString(),
      user: c.users.name,
      avatar: c.users.avatar,
      role: c.users.role,
      movie: c.movies.title,
      movie_id: c.movies.id,
      movie_slug: c.movies.slug,
      movie_poster: c.movies.poster_url,
      movie_thumb: c.movies.thumb_url,
    }));

  const allHomeCollections = JSON.parse(JSON.stringify(rawHomeCollections));
  const homeCollections = allHomeCollections.slice(0, 5);
  const remainingCollectionsCount = Math.max(0, allHomeCollections.length - 5);

  if (userId) {
    const historyItems = await prisma.watch_history.findMany({
      where: { user_id: userId },
      orderBy: { last_watched_at: 'desc' },
      take: 15,
    });
    if (historyItems.length > 0) {
      const movieIds = historyItems.map((item) => item.movie_id);
      const dbMovies = await prisma.movies.findMany({
        where: { id: { in: movieIds } },
        include: {
          episodes: {
            select: { id: true, name: true }
          }
        }
      });

      continueWatchingItems = historyItems
        .map((item) => {
          const m = dbMovies.find((dbm) => dbm.id === item.movie_id);
          if (!m) return null;

          const watchedEpisode = m.episodes.find((ep) => ep.id === item.episode_id);
          const lastWatchedEpisodeName = watchedEpisode ? watchedEpisode.name : '';

          const progressPercent = item.duration && item.duration > 0
            ? Math.min(Math.round((item.watch_time || 0) / item.duration * 100), 100)
            : 0;

          return {
            id: m.id,
            title: m.title,
            slug: m.slug,
            original_title: m.original_title,
            imageUrl: getProxyImageUrl(getPosterUrl(m), 384),
            episode_id: item.episode_id,
            episode_name: lastWatchedEpisodeName ? `Tập ${lastWatchedEpisodeName}` : (m.episodes[0] ? `Tập ${m.episodes[0].name}` : 'Tập 1'),
            watch_time: item.watch_time || 0,
            duration: item.duration || 0,
            progressPercent,
          };
        })
        .filter(Boolean);
    }
  }

  // Vertical card renderer matching design specs
  const MovieCard = ({ movie }: { movie: any }) => {
    const detailLink = `/phim/${movie.slug}`;
    return (
      <Link
        href={detailLink}
        className="group relative block rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 transition-all duration-300 shadow-lg"
      >
        <div className="aspect-[2/3] w-full relative overflow-hidden">
          <img
            src={getProxyImageUrl(getPosterUrl(movie), 384)}
            alt={movie.title}
            className="object-cover w-full h-full transition-transform duration-500"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent opacity-90 group-hover:opacity-100 transition-opacity" />

          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="bg-amber-400 text-[#0f1115] p-3 rounded-full shadow-lg scale-75 group-hover:scale-100 transition-all duration-300">
              <Play className="h-6 w-6 fill-current" />
            </div>
          </div>

          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {movie.quality && (
              <span className="text-[10px] font-bold bg-amber-400 text-zinc-950 px-2 py-0.5 rounded uppercase tracking-wider shadow">
                {movie.quality}
              </span>
            )}
          </div>

          {movie.status && (
            <div className="absolute bottom-2 right-2 bg-black/80 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-400/20 shadow">
              {movie.status}
            </div>
          )}
        </div>

        <div className="p-3 text-left">
          <h3 className="font-bold text-sm text-zinc-100 line-clamp-1 group-hover:text-amber-400 transition-colors" title={movie.title}>
            {movie.title}
          </h3>
          <p className="text-[11px] text-zinc-500 line-clamp-1 mt-0.5">
            {movie.original_title || movie.title}
          </p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-800/50 text-[10px] text-zinc-500">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {movie.year || '2026'}
            </span>
            <span className="flex items-center gap-1 font-bold text-amber-400">
              <Star className="h-3 w-3 fill-amber-400 stroke-none" />
              {movie.imdb_rating ? Number(movie.imdb_rating).toFixed(1) : '8.5'}
            </span>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div className="pb-16 bg-[#0f111a] text-white" suppressHydrationWarning>
      <HomepagePopup />
      <HomeLoader logoUrl={logoUrl} />
      {/* Hero Slider Section */}
      <HeroSlider movies={sliderMovies} />


      <div className="container mx-auto px-4 sm:px-6 mt-12 space-y-14">

        {/* Topics Carousel */}
        {homeCollections.length > 0 && (
          <section className="w-full">
            <h2 className="mb-4 text-[22px] font-bold leading-tight text-white sm:text-[26px] lg:text-[30px]">
              Bạn đang quan tâm gì?
            </h2>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 scroll-pl-4 pb-2 sm:-mx-6 sm:px-6 sm:scroll-pl-6 lg:mx-0 lg:grid lg:grid-cols-5 lg:gap-4 lg:overflow-visible lg:px-0 lg:scroll-pl-0 lg:pb-0 after:w-[1px] after:shrink-0 lg:after:hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {(() => {
                return (
                  <>
                    {homeCollections.map((c: any, index: number) => {
                      const color = getCollectionTheme(c.slug, c.name, index);
                      return (
                        <Link
                          key={c.id}
                          className="group relative h-[86px] min-w-[140px] overflow-hidden rounded-[14px_30px_14px_30px] text-white shadow-lg min-[430px]:min-w-[146px] sm:h-[126px] sm:min-w-[240px] sm:rounded-[20px_45px_20px_45px] lg:h-[138px] lg:min-w-0 transition-transform duration-300 hover:-translate-y-0.5 flex flex-col justify-between p-3.5 sm:p-6"
                          style={{ background: color.gradient || color.hex }}
                          href={`/chu-de/${c.slug}`}
                        >
                          {/* Capsule curve overlay on the right */}
                          <div className="absolute right-0 top-0 bottom-0 w-[35%] rounded-l-full bg-black/15 transition-transform duration-500 group-hover:scale-x-105 origin-right"></div>

                          {/* Subtle glass glow reflection */}
                          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0)_58%)]"></div>

                          <div className="relative z-10 flex flex-col justify-between h-full w-full">
                            <h3 className="text-[14px] sm:text-[19px] lg:text-[20px] font-bold leading-tight line-clamp-2 pr-[28%] select-none">
                              {c.name}
                            </h3>

                            <span className="inline-flex items-center gap-0.5 text-[10px] sm:text-[13px] font-semibold text-white/95 select-none mt-auto">
                              Xem toàn bộ
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="lucide lucide-chevron-right h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 transition-transform duration-300 group-hover:translate-x-1"
                              >
                                <path d="m9 18 6-6-6-6"></path>
                              </svg>
                            </span>
                          </div>
                        </Link>
                      );
                    })}

                    {/* All topics button card for mobile if more topics exist */}
                    {remainingCollectionsCount > 0 && (
                      <Link
                        className="group relative h-[86px] min-w-[140px] overflow-hidden rounded-[14px_30px_14px_30px] text-white shadow-lg min-[430px]:min-w-[146px] sm:h-[126px] sm:min-w-[240px] sm:rounded-[20px_45px_20px_45px] lg:h-[138px] lg:min-w-0 transition-transform duration-300 hover:-translate-y-0.5 flex flex-col justify-between p-3.5 sm:p-6 bg-[#303443] lg:hidden"
                        href="/chu-de"
                      >
                        {/* Capsule curve overlay on the right */}
                        <div className="absolute right-0 top-0 bottom-0 w-[35%] rounded-l-full bg-black/15 transition-transform duration-500 group-hover:scale-x-105 origin-right"></div>

                        {/* Subtle glass glow reflection */}
                        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0)_58%)]"></div>

                        <div className="relative z-10 flex flex-col justify-between h-full w-full">
                          <h3 className="text-[14px] sm:text-[19px] lg:text-[20px] font-bold leading-tight line-clamp-2 pr-[28%] select-none">
                            +{remainingCollectionsCount} chủ đề
                          </h3>

                          <span className="inline-flex items-center gap-0.5 text-[10px] sm:text-[13px] font-semibold text-white/95 select-none mt-auto">
                            Khám phá
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="24"
                              height="24"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="lucide lucide-chevron-right h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 transition-transform duration-300 group-hover:translate-x-1"
                            >
                              <path d="m9 18 6-6-6-6"></path>
                            </svg>
                          </span>
                        </div>
                      </Link>
                    )}
                  </>
                );
              })()}
            </div>

            {/* View All Topics Button (Desktop) */}
            {allHomeCollections.length > 5 && (
              <Link
                className="mt-2 hidden h-[48px] w-full items-center justify-center gap-2 rounded-[18px] bg-[#303443] text-[16px] font-extrabold text-white shadow-lg transition-colors hover:bg-[#3b4052] sm:mt-3 sm:w-[220px] lg:flex lg:h-[60px] lg:w-[260px] lg:text-[20px]"
                href="/chu-de"
              >
                <span>Tất cả chủ đề</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right h-4 w-4"><path d="m9 18 6-6-6-6"></path></svg>
              </Link>
            )}
          </section>
        )}

        {/* Continue Watching Section */}
        {userId ? (
          continueWatchingItems.length > 0 && (
            <ContinueWatchingSection initialItems={continueWatchingItems} />
          )
        ) : (
          <section className="mb-6 mt-2">
            <div className="relative rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgb(42, 35, 24) 0%, rgb(46, 37, 21) 50%, rgb(48, 34, 16) 100%)' }}>
              <div className="flex min-h-[170px] flex-wrap items-stretch sm:pr-[clamp(120px,15vw,200px)] lg:flex-nowrap">
                <div className="z-10 flex w-full min-w-0 flex-col justify-center px-5 py-6 sm:w-auto sm:shrink-0 sm:px-8 sm:py-7">
                  <h2 className="max-w-full text-[16px] font-bold leading-snug text-[#FFD166] sm:max-w-none sm:text-lg">Đăng nhập để lưu phim xem tiếp</h2>
                  <p className="mt-1.5 max-w-full text-[13px] leading-relaxed text-white/50 sm:max-w-xs">Lưu phim đang xem, đồng bộ trên nhiều thiết bị, tạo danh sách riêng — hoàn toàn miễn phí.</p>
                  <Link href="/pages/login" className="mt-4 inline-flex h-9 w-fit items-center gap-2 rounded-lg bg-[#FFD166] px-5 text-[13px] font-bold text-[#171717] hover:bg-[#FFE099] active:scale-[0.97] transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-log-in h-4 w-4" aria-hidden="true">
                      <path d="m10 17 5-5-5-5"></path>
                      <path d="M15 12H3"></path>
                      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                    </svg>
                    Đăng nhập
                  </Link>
                </div>
                <div className="order-3 hidden w-full items-center px-8 pb-6 sm:flex lg:order-none lg:w-auto lg:flex-1 lg:justify-center lg:px-4 lg:pb-0 z-10">
                  <div className="grid grid-flow-col grid-rows-2 gap-x-6 gap-y-3.5 xl:gap-x-10">
                    <div className="flex items-center gap-2.5 whitespace-nowrap">
                      <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#FFD166]/10">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-history w-3.5 h-3.5 text-[#FFD166]" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><path d="M12 7v5l4 2"></path></svg>
                      </div>
                      <span className="text-[13px] text-white/60 font-medium">Lưu tiến trình xem</span>
                    </div>
                    <div className="flex items-center gap-2.5 whitespace-nowrap">
                      <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#FFD166]/10">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-monitor w-3.5 h-3.5 text-[#FFD166]" aria-hidden="true"><rect width="20" height="14" x="2" y="3" rx="2"></rect><line x1="8" x2="16" y1="21" y2="21"></line><line x1="12" x2="12" y1="17" y2="21"></line></svg>
                      </div>
                      <span className="text-[13px] text-white/60 font-medium">Đồng bộ đa thiết bị</span>
                    </div>
                    <div className="flex items-center gap-2.5 whitespace-nowrap">
                      <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#FFD166]/10">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-heart w-3.5 h-3.5 text-[#FFD166]" aria-hidden="true"><path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5"></path></svg>
                      </div>
                      <span className="text-[13px] text-white/60 font-medium">Thêm phim yêu thích</span>
                    </div>
                    <div className="flex items-center gap-2.5 whitespace-nowrap">
                      <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#FFD166]/10">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-list-plus w-3.5 h-3.5 text-[#FFD166]" aria-hidden="true"><path d="M16 5H3"></path><path d="M11 12H3"></path><path d="M16 19H3"></path><path d="M18 9v6"></path><path d="M21 12h-6"></path></svg>
                      </div>
                      <span className="text-[13px] text-white/60 font-medium">Tạo danh sách riêng</span>
                    </div>
                  </div>
                </div>
              </div>
              <img alt="Xem tiếp phim" width="200" height="240" decoding="async" data-nimg="1" className="pointer-events-none absolute bottom-0 right-3 hidden h-full max-h-full w-auto object-contain object-bottom drop-shadow-[0_2px_16px_rgba(255,209,102,0.15)] sm:block lg:right-6" src="/images/xem-tiep.webp" style={{ color: 'transparent' }} />
            </div>
          </section>
        )}

        {/* 2. Phim Hàn Quốc mới (Widescreen Landscape scroll) */}
        {koreaMovies.length > 0 && (
          <CategorySection
            titleLine1="Phim Hàn"
            titleLine2="Quốc mới"
            gradientTo="#C084FC"
            viewAllLink="/filter?category=han-quoc"
            movies={koreaMovies}
          />
        )}

        {/* 3. Phim Trung Quốc mới (Widescreen Landscape scroll) */}
        {chinaMovies.length > 0 && (
          <CategorySection
            titleLine1="Phim Trung"
            titleLine2="Quốc mới"
            gradientTo="#FDE047"
            viewAllLink="/filter?category=trung-quoc"
            movies={chinaMovies}
          />
        )}

        {/* 4. Phim Âu Mỹ mới (Widescreen Landscape scroll) */}
        {auMyMovies.length > 0 && (
          <CategorySection
            titleLine1="Phim Âu"
            titleLine2="Mỹ mới"
            gradientTo="#38BDF8"
            viewAllLink="/filter?category=au-my"
            movies={auMyMovies}
          />
        )}

        {/* Ongoing / Theaters Section (Widescreen Landscape scroll) */}
        {(ongoingMovies.length > 0 || newSeriesMovies.length > 0) && (
          <TheaterSliderSection
            title="Mãn Nhãn với Phim Chiếu Rạp"
            viewAllLink="/danh-sach/phim-dang-chieu"
            movies={ongoingMovies.length > 0 ? ongoingMovies : newSeriesMovies.slice(0, 10)}
          />
        )}

        {/* Community Section (Recent Comments & Stats Dashboard) */}
        <CommunitySection
          comments={comments}
          soiNoiMovies={soiNoiMovies}
          yeuThichMovies={yeuThichMovies}
          hotGenres={hotGenres}
        />

        {/* Phim Mới Cập Nhật Section */}
        {recentMovies.length > 0 && (
          <MovieSliderSection
            title="Phim Mới Cập Nhật"
            movies={recentMovies}
          />
        )}


        {/* 10b. Top 10 phim bộ hôm nay (Skewed Top 10 Slider) */}
        {top10SeriesMovies.length > 0 && (
          <Top10Section title="Top 10 phim bộ hôm nay" movies={top10SeriesMovies} />
        )}

        {/* 6. Phim Lẻ Cực Hot */}
        {hotSingleMovies.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <span className="w-1.5 h-6 bg-amber-400 rounded-full" />
                Phim Lẻ Cực Hot
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-4">
              {hotSingleMovies.map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </div>
          </section>
        )}

        {/* 8. Có thể bạn muốn xem */}
        {maybeLikeMovies.length > 0 && (
          <MovieSliderSection
            title="Có thể bạn muốn xem"
            movies={maybeLikeMovies}
          />
        )}

        {/* 7. Top 10 phim lẻ hot nhất (Skewed Top 10 Slider) */}
        {top10SingleMovies.length > 0 && (
          <Top10Section title="Top 10 phim lẻ hôm nay" movies={top10SingleMovies} />
        )}

        {/* 9. Phim Bộ Hot */}
        {hotSeriesMovies.length > 0 && (
          <MovieSliderSection
            title="Phim Bộ Hot"
            movies={hotSeriesMovies}
          />
        )}

        {/* 9.5. Phim Ma */}
        {ghostMovies.length > 0 && (
          <MovieSliderSection
            title="Tôi Sợ Con Người Em Rồi Đó, Nhưng Không Bằng Sợ Ma"
            movies={ghostMovies}
            viewAllLink="/the-loai/kinh-di"
          />
        )}

        {/* 10. Phim Bộ mới cập nhật */}
        {newSeriesMovies.length > 0 && (
          <MovieSliderSection
            title="Phim Bộ Mới Nhất"
            movies={newSeriesMovies}
            viewAllLink="/filter?type=phimbo"
          />
        )}



        {/* 11. Phim Lẻ mới cập nhật */}
        {newSingleMovies.length > 0 && (
          <MovieSliderSection
            title="Phim Lẻ Mới Nhất"
            movies={newSingleMovies}
            viewAllLink="/filter?type=phimle"
          />
        )}

        {/* 12. TOP 10 Phim lẻ tuần nay (Skewed Top 10 Slider) */}
        {topYearMovies.length > 0 && (
          <Top10Section title="TOP 10 Phim lẻ tuần nay" movies={topYearMovies} />
        )}

        {/* 13. Thế giới Anime (Custom Featured Anime Slider) */}
        <AnimeFeatured animeList={animeMovies} />

      </div>
    </div>
  );
}
