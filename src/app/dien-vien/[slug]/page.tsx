import { notFound } from 'next/navigation';
import Link from 'next/link';
import prisma from '@/lib/db';
import ActorMoviesClient from '@/components/ActorMoviesClient';
import FavoriteActorButton from '@/components/FavoriteActorButton';
import { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const actor = await prisma.actors.findFirst({ where: { slug } });
  if (!actor) return {};

  const title = `Diễn Viên ${actor.name} - Tiểu Sử & Phim 🎬 | Tô Phim`;
  const description = actor.bio
    ? actor.bio.substring(0, 160) + '...'
    : `Xem tiểu sử, phim nổi bật của diễn viên ${actor.name} tại Tô Phim.`;
  const imageUrl = actor.avatar || '';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'profile',
      images: imageUrl ? [{ url: imageUrl, width: 500, height: 750, alt: actor.name }] : [],
    },
    twitter: { card: 'summary_large_image', title, description, images: imageUrl ? [imageUrl] : [] },
  };
}

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

async function syncActorFromTmdb(actorId: number, name: string, currentTmdbId: number | null, tmdbApiKey: string) {
  try {
    let tmdbId = currentTmdbId;
    if (!tmdbId) {
      const searchUrl = `https://api.tmdb.org/3/search/person?api_key=${tmdbApiKey}&query=${encodeURIComponent(name)}&language=vi-VN`;
      const searchRes = await fetch(searchUrl, { cache: 'no-store' });
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const results = searchData.results || [];
        if (results.length > 0) {
          let bestCandidate = results[0];
          const actingCandidates = results.filter((r: any) => r.known_for_department === 'Acting');
          if (actingCandidates.length > 0) {
            actingCandidates.sort((a: any, b: any) => (b.popularity || 0) - (a.popularity || 0));
            bestCandidate = actingCandidates[0];
          } else {
            results.sort((a: any, b: any) => (b.popularity || 0) - (a.popularity || 0));
            bestCandidate = results[0];
          }
          tmdbId = bestCandidate.id;
        }
      }
    }

    if (!tmdbId) return null;

    const detailUrl = `https://api.tmdb.org/3/person/${tmdbId}?api_key=${tmdbApiKey}&language=vi-VN`;
    const detailRes = await fetch(detailUrl, { cache: 'no-store' });
    if (!detailRes.ok) return null;
    const detailData = await detailRes.json();

    let biography = detailData.biography || '';
    if (!biography.trim()) {
      const enDetailUrl = `https://api.tmdb.org/3/person/${tmdbId}?api_key=${tmdbApiKey}&language=en-US`;
      const enDetailRes = await fetch(enDetailUrl, { cache: 'no-store' });
      if (enDetailRes.ok) {
        const enDetailData = await enDetailRes.json();
        biography = enDetailData.biography || '';
      }
    }

    const genderMap: Record<number, string> = { 0: 'Chưa rõ', 1: 'Nữ', 2: 'Nam', 3: 'Khác' };
    const gender = genderMap[detailData.gender] || 'Chưa rõ';
    const avatar = detailData.profile_path ? `https://image.tmdb.org/t/p/w500${detailData.profile_path}` : null;

    const updateData: any = {
      tmdb_id: tmdbId,
      gender,
      birthday: detailData.birthday || null,
      place_of_birth: detailData.place_of_birth || null,
      deathday: detailData.deathday || null,
      imdb_synced_at: new Date()
    };

    if (avatar) {
      updateData.avatar = avatar;
    }
    if (biography) {
      updateData.bio = biography;
    }

    const updated = await prisma.actors.update({
      where: { id: actorId },
      data: updateData
    });

    return {
      ...updated,
      also_known_as: detailData.also_known_as || []
    };
  } catch (error) {
    console.error('Error syncing actor from TMDB:', error);
    return null;
  }
}

export default async function ActorDetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  const slug = decodeURIComponent(resolvedParams.slug);

  const rawActor = await prisma.actors.findUnique({
    where: { slug },
    include: {
      movie_actor: {
        include: {
          movies: {
            include: {
              episodes: true
            }
          }
        }
      }
    }
  });

  if (!rawActor) {
    notFound();
  }

  const actor = JSON.parse(JSON.stringify(rawActor));

  // Extract and sort movies by year desc, then updated_at desc
  const rawMovies = actor.movie_actor.map((ma: any) => ma.movies);
  rawMovies.sort((a: any, b: any) => {
    const yearDiff = (b.year || 0) - (a.year || 0);
    if (yearDiff !== 0) return yearDiff;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });
  
  // Live Sync / Live details from TMDB if API configured
  let currentActor = actor;
  let alsoKnownAs: string[] = [];

  const tmdbApiKeySetting = await prisma.settings.findFirst({ where: { key: 'tmdb_api_key' } });
  const tmdbApiKey = tmdbApiKeySetting?.value?.trim() || '';
  const tmdbAutoSyncSetting = await prisma.settings.findFirst({ where: { key: 'tmdb_auto_sync' } });
  const tmdbAutoSync = tmdbAutoSyncSetting?.value !== '0';

  // Fetch genuine vertical poster images from TMDB for movies participated if tmdb_id is present
  if (tmdbApiKey) {
    await Promise.all(
      rawMovies.map(async (m: any) => {
        if (m.tmdb_id) {
          try {
            const isTv = m.type === 'phimbo' || m.type === 'hoathinh' || m.type === 'tvshows';
            const tmdbType = isTv ? 'tv' : 'movie';
            const res = await fetch(`https://api.tmdb.org/3/${tmdbType}/${m.tmdb_id}?api_key=${tmdbApiKey}&language=vi-VN`, {
              next: { revalidate: 86400 } // Cache for 24 hours
            });
            if (res.ok) {
              const tmdbData = await res.json();
              if (tmdbData.poster_path) {
                m.poster_url = `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}`;
              }
            }
          } catch (e) {
            console.error('Error fetching TMDB poster path:', e);
          }
        }
      })
    );
  }

  const movies = JSON.parse(JSON.stringify(rawMovies));

  if (tmdbApiKey && tmdbAutoSync) {
    const needsSync = !actor.birthday || !actor.place_of_birth || !actor.tmdb_id || 
      (actor.imdb_synced_at && new Date().getTime() - new Date(actor.imdb_synced_at).getTime() > 7 * 24 * 60 * 60 * 1000);

    if (needsSync) {
      const synced = await syncActorFromTmdb(actor.id, actor.name, actor.tmdb_id, tmdbApiKey);
      if (synced) {
        currentActor = JSON.parse(JSON.stringify(synced));
        alsoKnownAs = synced.also_known_as || [];
      }
    } else if (actor.tmdb_id) {
      try {
        const detailRes = await fetch(`https://api.tmdb.org/3/person/${actor.tmdb_id}?api_key=${tmdbApiKey}&language=vi-VN`, { cache: 'no-store' });
        if (detailRes.ok) {
          const detailData = await detailRes.json();
          alsoKnownAs = detailData.also_known_as || [];
        }
      } catch (e) {
        console.error('Error fetching live actor details:', e);
      }
    }
  }

  const getActorAvatar = (act: any) => {
    if (act.avatar && act.avatar.trim() !== '') {
      return act.avatar;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(act.name || 'A')}&background=1a1a2e&color=ffc107&size=300`;
  };

  return (
    <div className="w-full bg-[#0a0a0f] text-white min-h-screen pt-[90px] lg:pt-[110px]">
      <div className="max-w-[1400px] mx-auto px-4 py-8">
        
        {/* Back Link */}
        <Link 
          href="/dien-vien"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-[#FFD166] transition-colors mb-6 group"
        >
          <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Danh sách diễn viên
        </Link>

        {/* Actor Profile Layout */}
        <div className="flex flex-col lg:grid lg:grid-cols-[280px_1fr] gap-8 items-start">
          
          {/* Sidebar */}
          <div className="w-full flex flex-col items-center lg:items-start text-center lg:text-left gap-4 lg:sticky lg:top-32">
            {/* Avatar */}
            <div className="w-40 h-40 md:w-48 md:h-48 rounded-full overflow-hidden shrink-0 border-2 border-white/10 shadow-2xl shadow-black/85 mb-2 mx-auto lg:mx-0">
              <img 
                src={getActorAvatar(currentActor)} 
                alt={currentActor.name} 
                className="object-cover w-full h-full"
              />
            </div>

            <h1 className="text-2xl md:text-3xl font-bold text-white w-full">{currentActor.name}</h1>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-3 w-full justify-center lg:justify-start mb-2">
              <FavoriteActorButton actorId={currentActor.id} />
              <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#161722]/80 hover:bg-[#161722] border border-white/5 text-xs font-bold transition-all text-white/90">
                <svg className="w-3.5 h-3.5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
                Chia sẻ
              </button>
            </div>

            {/* Info List */}
            <div className="w-full flex flex-col gap-2 mt-2 text-sm">
              <div className="flex items-center justify-between lg:justify-start lg:gap-4 border-b border-white/5 pb-2">
                <span className="text-zinc-500 font-bold shrink-0">Giới tính:</span>
                <span className="text-zinc-300 font-medium">{currentActor.gender || 'Chưa rõ'}</span>
              </div>
              <div className="flex items-center justify-between lg:justify-start lg:gap-4 border-b border-white/5 pb-2">
                <span className="text-zinc-500 font-bold shrink-0">Ngày sinh:</span>
                <span className="text-zinc-300 font-medium">{currentActor.birthday || 'Chưa rõ'}</span>
              </div>
              <div className="flex items-center justify-between lg:justify-start lg:gap-4 border-b border-white/5 pb-2">
                <span className="text-zinc-500 font-bold shrink-0">Nơi sinh:</span>
                <span className="text-zinc-300 font-medium text-right line-clamp-2" title={currentActor.place_of_birth}>{currentActor.place_of_birth || 'Chưa rõ'}</span>
              </div>
              {currentActor.deathday && (
                <div className="flex items-center justify-between lg:justify-start lg:gap-4 border-b border-white/5 pb-2">
                  <span className="text-zinc-500 font-bold shrink-0">Ngày mất:</span>
                  <span className="text-zinc-300 font-medium">{currentActor.deathday}</span>
                </div>
              )}
              {currentActor.tmdb_id && (
                <div className="flex items-center justify-between lg:justify-start lg:gap-4 pb-2">
                  <span className="text-zinc-500 font-bold shrink-0">TMDb:</span>
                  <a href={`https://www.themoviedb.org/person/${currentActor.tmdb_id}`} target="_blank" rel="noopener noreferrer" className="text-[#01b4e4] font-medium hover:underline">
                    Profile
                  </a>
                </div>
              )}
            </div>
            
            {currentActor.bio && (
              <div className="w-full text-left mt-4 text-sm text-zinc-400">
                <h3 className="text-white font-bold mb-1">Tiểu sử:</h3>
                <p className="line-clamp-6">{currentActor.bio}</p>
              </div>
            )}
          </div>

          {/* Main Content (Movies Grid & Timeline) */}
          <ActorMoviesClient movies={movies} />
        </div>
      </div>
    </div>
  );
}
