'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { getPosterUrl, getBackdropUrl, getProxyImageUrl } from '@/lib/image';

interface OngoingMoviesSliderProps {
  title: string;
  movies: any[];
  viewAllLink?: string;
}

export default function OngoingMoviesSlider({ title, movies, viewAllLink }: OngoingMoviesSliderProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [hoveredMovie, setHoveredMovie] = useState<any | null>(null);
  const [popupStyle, setPopupStyle] = useState<React.CSSProperties>({});

  const handleMouseEnter = (movie: any, e: React.MouseEvent) => {
    if (window.matchMedia('(hover: none)').matches) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const popupWidth = Math.min(420, window.innerWidth - 32);
    let left = rect.left - (popupWidth - rect.width) / 2;
    let top = rect.top - 20;

    if (left < 16) left = 16;
    if (left + popupWidth > window.innerWidth - 16) left = window.innerWidth - 16 - popupWidth;

    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredMovie(movie);
      setPopupStyle({ top, left, width: popupWidth });
    }, 400);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    leaveTimeoutRef.current = setTimeout(() => {
      setHoveredMovie(null);
    }, 150);
  };

  const getBadgeText = (movie: any) => {
    const statusStr = movie.episode_current || movie.status || '';
    const langStr = movie.language || '';
    
    let epNum = '';
    const slashMatch = statusStr.match(/(\d+\/\d+)/);
    if (slashMatch) {
      epNum = slashMatch[1];
    } else {
      const match = statusStr.match(/(\d+)/);
      if (match) {
        epNum = match[1];
      } else if (statusStr.toLowerCase().includes('full') || statusStr.toLowerCase().includes('completed') || statusStr.toLowerCase().includes('hoàn')) {
        epNum = 'Full';
      }
    }

    const isTM = langStr.toLowerCase().includes('thuyết minh') || langStr.toLowerCase().includes('lồng tiếng');
    const prefix = isTM ? 'TM.' : 'PĐ.';
    return `${prefix} ${epNum || 'Full'}`;
  };

  if (!movies || movies.length === 0) return null;

  return (
    <section className="my-8">
      <div className="flex items-center justify-between mb-4 px-1" suppressHydrationWarning={true}>
        <h2 className="font-bold text-white text-xl sm:text-2xl">
          {title}
        </h2>
        {viewAllLink && (
          <Link href={viewAllLink} className="text-xs md:text-sm text-yellow-400 hover:text-yellow-300 transition-colors">
            Xem tất cả
          </Link>
        )}
      </div>
      
      <div className="relative group/slider">
        <div 
          ref={scrollContainerRef}
          className="flex gap-3 md:gap-4 overflow-x-auto pb-4 snap-x snap-mandatory md:snap-none [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-white/5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20 hover:[&::-webkit-scrollbar-thumb]:bg-white/30"
        >
          {movies.map((movie) => {
            const imageUrl = getProxyImageUrl(getPosterUrl(movie), 384);
            const badgeText = getBadgeText(movie);

            return (
              <div key={movie.id} className="shrink-0 w-[140px] sm:w-[160px] md:w-[180px] snap-start md:snap-align-none scroll-ml-2 mb-2">
                <div 
                  className="relative group cursor-pointer"
                  onMouseEnter={(e) => handleMouseEnter(movie, e)}
                  onMouseLeave={handleMouseLeave}
                >
                  <Link className="block" href={`/phim/${movie.slug}`}>
                    <div className="relative rounded-lg overflow-hidden bg-[#1f2129] aspect-[2/3] ring-1 ring-white/5 shadow-md flex items-center justify-center transition-transform duration-300 group-hover:scale-[1.02]" suppressHydrationWarning={true}>
                      <svg className="absolute w-10 h-10 text-white/10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                      </svg>
                      {imageUrl && (
                        <img 
                          alt={movie.title} 
                          loading="lazy" 
                          decoding="async" 
                          className="object-cover relative z-10 w-full h-full" 
                          src={imageUrl} 
                        />
                      )}
                      
                      {movie.sub_docquyen && (
                        <div className="absolute top-2 left-2 z-20 drop-shadow-md">
                          <svg className="w-5 h-5 text-[#F5C518]" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498a4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd"></path></svg>
                        </div>
                      )}

                      {/* Bottom Center Badge */}
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20">
                        <div className="bg-[#1a1c23]/90 backdrop-blur-md px-3 py-[2px] rounded-full border border-white/10 shadow-lg whitespace-nowrap">
                          <span className="text-[10px] md:text-[11px] font-bold text-white/95">{badgeText}</span>
                        </div>
                      </div>
                      
                      <div className="overlay absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10"></div>
                      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent pointer-events-none z-10"></div>
                    </div>
                    
                    <div className="text-center mt-2.5">
                      <h3 className="text-[13px] md:text-[14px] font-bold text-white/95 truncate group-hover:text-yellow-400 transition-colors">
                        {movie.title}
                      </h3>
                      {movie.original_title && (
                        <p className="text-[11px] md:text-[12px] text-white/50 mt-0.5 truncate font-medium">
                          {movie.original_title}
                        </p>
                      )}
                    </div>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hover Popup Overlay */}
      {hoveredMovie && (
        <div 
          className="movie-hover-popup fixed z-[9999] pointer-events-auto hidden md:block" 
          style={popupStyle}
          onMouseEnter={() => {
            if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
            if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
          }}
          onMouseLeave={handleMouseLeave}
        >
          <div className="bg-[#1f2129] rounded-xl overflow-hidden shadow-2xl shadow-black/60 border border-white/10">
            <div className="relative aspect-video w-full overflow-hidden flex items-center justify-center">
              <img alt={hoveredMovie.title} className="object-cover relative z-10 w-full h-full" src={getProxyImageUrl(getBackdropUrl(hoveredMovie), 640)} />
              <div className="absolute bottom-0 left-0 right-0 h-1/4 bg-gradient-to-t from-[#1f2129] to-transparent z-20"></div>
            </div>
            <div className="p-4 pt-2">
              <h4 className="text-base font-semibold text-white line-clamp-1">{hoveredMovie.title}</h4>
              <p className="text-sm text-yellow-400 mt-0.5 line-clamp-1">{hoveredMovie.original_title || hoveredMovie.title}</p>
              
              <div className="flex items-stretch gap-2 mt-3 h-[36px]">
                <Link href={`/phim/${hoveredMovie.slug}`} className="flex-[1.2] flex items-center justify-center gap-1.5 px-0 text-[#1c1c1c] bg-[#FFD166] hover:bg-[#ffdf8f] rounded-lg text-[13px] font-bold transition-all shadow-md shadow-[rgba(254,207,89,0.2)] active:scale-95">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5c0-.8.9-1.3 1.6-.9l9 6c.6.4.6 1.4 0 1.8l-9 6c-.7.4-1.6-.1-1.6-.9V5z"></path></svg>
                  Xem ngay
                </Link>
                <Link href={`/phim/${hoveredMovie.slug}`} className="flex-1 flex items-center justify-center gap-1.5 px-2 rounded-lg border border-white/20 bg-transparent hover:bg-white/5 hover:border-white/40 transition-all active:scale-95 group">
                  <svg className="w-4 h-4 text-white/90 group-hover:scale-110 transition-transform duration-500 ease-[cubic-bezier(0.175,0.885,0.32,1.275)]" fill="currentColor" viewBox="0 0 24 24"><path d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"></path></svg>
                  <span className="text-[13px] font-semibold text-white">Chi tiết</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
