'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getProxyImageUrl } from '@/lib/image';

interface ActorMoviesClientProps {
  movies: any[];
}

export default function ActorMoviesClient({ movies }: ActorMoviesClientProps) {
  const [viewMode, setViewMode] = useState<'all' | 'timeline'>('all');

  // Group movies by year for timeline view
  const moviesByYear = movies.reduce((acc, movie) => {
    const year = movie.year || 'Chưa rõ';
    if (!acc[year]) acc[year] = [];
    acc[year].push(movie);
    return acc;
  }, {} as Record<string, any[]>);

  // Sort years descending (numbers first, then string 'Chưa rõ')
  const sortedYears = Object.keys(moviesByYear).sort((a, b) => {
    if (a === 'Chưa rõ') return 1;
    if (b === 'Chưa rõ') return -1;
    return parseInt(b) - parseInt(a);
  });

  const getEpisodeBadges = (movie: any) => {
    const status = (movie.status || movie.episode_current || '').toLowerCase();
    const language = (movie.language || '').toLowerCase();
    
    // Check if it's upcoming
    if (status.includes('trailer') || status.includes('sắp chiếu') || status === '0' || status === 'đang cập nhật') {
      return { badges: [{ label: '', count: 'Sắp chiếu', bg: 'bg-white !text-black font-bold border border-zinc-200' }], isSongNgu: language.includes('song ngữ') || language.includes('songngữ') };
    }

    const badges = [];
    const epMatch = status.match(/tập\s+(\d+)/i) || status.match(/(\d+)\/(\d+)/) || status.match(/(\d+)/);
    const count = epMatch ? parseInt(epMatch[1], 10) : null;
    
    // If episodes array is empty, we check if language explicitly says "song ngữ"
    const isSongNgu = language.includes('song ngữ') || language.includes('songngữ');

    if (count !== null) {
      if (status.includes('thuyết minh') || language.includes('thuyết minh')) {
        badges.push({ label: 'TM.', count, bg: 'bg-[#2CA35D]/95' });
      } else {
        badges.push({ label: 'PĐ.', count, bg: 'bg-[#5E6070]/95' });
      }
    } else {
      badges.push({ label: movie.quality || 'FHD', count: null, bg: 'bg-[#5E6070]/95' });
    }

    return { badges, isSongNgu };
  };

  const renderMovieCard = (movie: any) => {
    const badgeData = getEpisodeBadges(movie);
    const badges = badgeData.badges;
    const isSongNgu = badgeData.isSongNgu;
    const imageUrl = getProxyImageUrl(movie.poster_url || movie.thumb_url || '', 300);

    return (
      <div key={movie.id} className="relative group w-[140px] md:w-[160px] shrink-0 snap-start">
        <Link href={`/phim/${movie.slug}`} className="block">
          <div className="relative rounded-xl overflow-hidden bg-[#1f2129] aspect-[2/3] ring-1 ring-white/5 shadow-md flex items-center justify-center" suppressHydrationWarning={true}>
            <svg className="absolute w-12 h-12 text-white/10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
            </svg>
            {imageUrl && (
              <img 
                alt={movie.title} 
                loading="lazy" 
                className="object-cover transition-transform duration-500 group-hover:scale-105 relative z-10 w-full h-full" 
                src={imageUrl} 
              />
            )}
            
            {movie.sub_docquyen && !isSongNgu && (
              <div className="absolute top-2 left-2 z-20 drop-shadow-md">
                <svg className="w-5 h-5 md:w-6 md:h-6 text-[#F5C518]" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498a4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd"></path></svg>
              </div>
            )}

            {isSongNgu && (
              <div className="absolute top-2 right-2 z-20 bg-gradient-to-r from-[#d9b8ff] to-[#9888ff] text-[#0f1115] text-[9px] md:text-[10px] font-bold px-1.5 md:px-2 py-0.5 md:py-1 rounded shadow-lg flex items-center gap-1">
                <svg className="w-3 h-3 md:w-3.5 md:h-3.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>
                Song Ngữ
              </div>
            )}

            <div className="absolute inset-x-0 bottom-0 flex items-end pb-1.5 md:pb-0 pointer-events-none justify-center">
              <div className="flex z-10 w-full flex-col md:flex-row md:flex-nowrap gap-1 md:gap-0 items-start md:items-end justify-start pl-1 sm:pl-2 md:pl-0 md:justify-center">
                {badges.map((badge, idx) => (
                  <span 
                    key={idx} 
                    className={`text-[9px] md:text-[10.5px] px-1.5 md:px-2.5 py-[1px] md:py-[3px] rounded-full text-white backdrop-blur-sm shadow-sm md:rounded-none whitespace-nowrap md:first:rounded-tl-md md:last:rounded-tr-md ${badge.bg}`}
                  >
                    <span className="font-bold flex items-center gap-0.5 md:gap-1 tracking-tight">
                      {badge.label && <span className="opacity-90">{badge.label}</span>}
                      {badge.count !== null ? badge.count : ''}
                    </span>
                  </span>
                ))}
              </div>
            </div>
            
            <div className="absolute inset-0 bg-gradient-to-t from-[#1f2129] via-transparent to-transparent opacity-80 z-0"></div>
          </div>
          <div className="mt-2 text-center">
            <h3 className="text-xs font-bold text-white line-clamp-1 group-hover:text-[#FFD166] transition-colors">{movie.title}</h3>
            <p className="text-[10px] text-zinc-500 line-clamp-1">{movie.original_title}</p>
          </div>
        </Link>
      </div>
    );
  };

  return (
    <div className="flex-1 min-w-0">
      {/* Header with Toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 pb-4 border-b border-white/5 gap-4">
        <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">Các phim đã tham gia</h2>
        <div className="flex items-center bg-[#161722]/80 border border-white/5 p-1 rounded-lg shrink-0">
          <button 
            onClick={() => setViewMode('all')}
            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'all' ? 'bg-white text-black shadow-md' : 'text-zinc-400 hover:text-white'}`}
          >
            Tất cả
          </button>
          <button 
            onClick={() => setViewMode('timeline')}
            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'timeline' ? 'bg-white text-black shadow-md' : 'text-zinc-400 hover:text-white'}`}
          >
            Thời gian
          </button>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'all' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-6 justify-items-center sm:justify-items-start">
          {movies.map(movie => renderMovieCard(movie))}
        </div>
      )}

      {/* Timeline View */}
      {viewMode === 'timeline' && (
        <div className="relative pl-12 md:pl-24 space-y-12 pb-8">
          {/* Vertical Line */}
          <div className="absolute top-0 bottom-0 left-6 md:left-12 w-px bg-white/10 z-0"></div>
          
          {sortedYears.map((year, idx) => (
            <div key={year} className="relative z-10 flex flex-col items-start gap-4 mt-4">
              {/* Year Marker (Dot and Label) */}
              <div className="absolute -left-6 md:-left-12 top-0 flex flex-col items-center w-12 md:w-24 -ml-6 md:-ml-12">
                <div className="w-3 h-3 rounded-full bg-[#FFD166] shadow-[0_0_10px_rgba(255,209,102,0.5)] border-[3px] border-[#0a0a0f] shrink-0"></div>
                <div className="mt-12 md:mt-16 -rotate-90 text-3xl md:text-5xl font-black text-white/10 tracking-widest leading-none pointer-events-none">
                  {year}
                </div>
              </div>
              
              {/* Movies in this year */}
              <div className="flex flex-wrap gap-4 pl-2 md:pl-4">
                {moviesByYear[year].map((movie: any) => renderMovieCard(movie))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
