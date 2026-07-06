'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { getPosterUrl, getBackdropUrl, getProxyImageUrl } from '@/lib/image';

interface Top10SectionProps {
  title: string;
  movies: any[];
}

export default function Top10Section({ title, movies }: Top10SectionProps) {
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
    }, 400); // 400ms delay to prevent accidental popups
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    leaveTimeoutRef.current = setTimeout(() => {
      setHoveredMovie(null);
    }, 150); // delay before closing to allow cursor to enter the popup
  };

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  const getEditionBadges = (movie: any) => {
    const statusStr = movie.status || '';
    const langStr = movie.language || '';
    
    let epNum = '';
    const match = statusStr.match(/(\d+)/);
    if (match) {
      epNum = match[1];
    } else if (statusStr.toLowerCase().includes('full') || statusStr.toLowerCase().includes('completed') || statusStr.toLowerCase().includes('hoàn')) {
      epNum = 'Full';
    }

    const badges: { prefix: string; value: string; bg: string }[] = [];

    if (langStr.toLowerCase().includes('thuyết minh') || langStr.toLowerCase().includes('lồng tiếng')) {
      badges.push({ prefix: 'TM.', value: ` ${epNum || 'Full'}`, bg: 'bg-[#2CA35D]/95' });
    }

    if (langStr.toLowerCase().includes('vietsub') || badges.length === 0) {
      badges.push({ prefix: 'PĐ.', value: ` ${epNum || 'Full'}`, bg: 'bg-[#5E6070]/95' });
    }

    const isSongNgu = langStr.toLowerCase().includes('song ngữ') || langStr.toLowerCase().includes('songngữ');

    // if (isSongNgu) {
    //   badges.push({ prefix: 'Song Ngữ', value: '', bg: 'bg-gradient-to-r from-[#d9b8ff] to-[#9888ff] !text-[#1c1c1c]' });
    // }

    return { badges, isSongNgu };
  };

  return (
    <div className="mb-12 relative w-full overflow-hidden group/section">
      <h2 className="text-xl md:text-2xl font-bold text-white mb-6">{title}</h2>
      
      <button 
        onClick={scrollLeft}
        className="absolute left-2 top-[50%] -translate-y-1/2 z-20 w-8 h-8 md:w-10 md:h-10 bg-white/90 text-[#0f1115] hover:scale-110 shadow-xl rounded-full items-center justify-center transition-all opacity-0 group-hover/section:opacity-100 hidden md:flex"
      >
        <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
      </button>
      
      <button 
        onClick={scrollRight}
        className="absolute right-2 top-[50%] -translate-y-1/2 z-20 w-8 h-8 md:w-10 md:h-10 bg-white/90 text-[#0f1115] hover:scale-110 shadow-xl rounded-full items-center justify-center transition-all opacity-0 group-hover/section:opacity-100 hidden md:flex"
      >
        <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
      </button>

      <div 
        ref={scrollContainerRef}
        className="flex gap-4 overflow-x-auto overflow-y-hidden scrollbar-hide snap-x pb-4 cursor-grab select-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" 
        style={{ scrollBehavior: 'smooth', scrollSnapType: 'x mandatory' }}
      >
        {movies.map((movie, index) => {
          const rank = index + 1;
          const imageUrl = getProxyImageUrl(getPosterUrl(movie), 384);
          const badgeData = getEditionBadges(movie);
          const badges = badgeData.badges;
          const isSongNgu = badgeData.isSongNgu;
          
          // Alternate skew direction
          const skewOuter = rank % 2 === 1 ? 'skewY(6deg)' : 'skewY(-6deg)';
          const skewInner = rank % 2 === 1 ? 'skewY(-6deg)' : 'skewY(6deg)';
          const transformOrigin = rank % 2 === 1 ? 'left top' : 'right top';

          return (
            <div
              key={movie.id}
              className="group flex-shrink-0 w-[185px] sm:w-[230px] md:w-[260px] lg:w-[290px] snap-start"
              style={{ contain: 'layout style paint' }}
              onMouseEnter={(e) => handleMouseEnter(movie, e)}
              onMouseLeave={handleMouseLeave}
            >
              <Link 
                className="block w-full h-full"
                draggable="false" 
                href={`/phim/${movie.slug}`} 
              >
              <div className="relative aspect-[2/3] rounded-b-2xl sm:rounded-b-[22px] overflow-hidden mb-3 pointer-events-none group">
                <div 
                  className="absolute left-0 top-0 w-full h-[115%] overflow-hidden rounded-t-2xl sm:rounded-t-[22px]" 
                  style={{ transform: skewOuter, transformOrigin }}
                >
                  <div 
                    className="absolute left-0 top-0 w-full aspect-[2/3] transition-all duration-300 ease-out p-0 group-hover:p-1" 
                    style={{ transform: skewInner, transformOrigin }}
                  >
                    <div className="relative w-full h-full rounded-b-[18px] sm:rounded-b-[18px] rounded-t-[18px] sm:rounded-t-[18px] overflow-hidden">
                      <img 
                        alt={movie.title} 
                        loading="lazy" 
                        decoding="async" 
                        className="object-cover w-full h-full" 
                        src={imageUrl} 
                      />
                      <div className="absolute inset-0 bg-[#FFD778]/0 group-hover:bg-[#ffde8a]/25 transition-colors duration-300 ease-out pointer-events-none z-10"></div>
                      

                    </div>
                  </div>
                </div>
                
                <div 
                  className="absolute left-0 top-0 w-full h-[115%] rounded-t-2xl sm:rounded-t-[22px] border-[4px] border-b-0 border-transparent group-hover:border-[#FCCB56] transition-colors duration-300 ease-out pointer-events-none z-30" 
                  style={{ transform: skewOuter, transformOrigin }}
                ></div>
                
                <div className="absolute inset-x-0 bottom-0 h-10 rounded-b-2xl sm:rounded-b-[22px] border-[4px] border-t-0 border-transparent group-hover:border-[#FCCB56] transition-colors duration-300 ease-out pointer-events-none z-30"></div>
                
                <div className="absolute inset-x-0 bottom-0 flex items-end pb-1.5 md:pb-0 pointer-events-none justify-center z-40">
                  <div className="flex z-10 w-full flex-col md:flex-row md:flex-nowrap gap-1 md:gap-0 items-start md:items-end justify-start pl-1 sm:pl-2 md:pl-0 md:justify-center">
                    {badges.map((badge, idx) => (
                      <span 
                        key={idx} 
                        className={`text-[9px] md:text-[10.5px] px-1.5 md:px-2.5 py-[1px] md:py-[3px] rounded-full text-white backdrop-blur-sm shadow-sm md:rounded-none whitespace-nowrap md:first:rounded-tl-md md:last:rounded-tr-md ${badge.bg}`}
                      >
                        <span className="font-normal md:font-bold">{badge.prefix}</span>
                        <span className="font-bold">{badge.value}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2.5 px-1 mt-1">
                <div 
                  className="text-4xl sm:text-[2.5rem] md:text-[3.5rem] lg:text-5xl font-black italic shrink-0 pr-1 md:pr-2" 
                  style={{ backgroundImage: 'linear-gradient(39deg, rgb(254, 207, 89), rgb(255, 241, 204))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', filter: 'drop-shadow(rgba(0, 0, 0, 0.5) 0px 2px 4px)', lineHeight: 0.8, paddingTop: '4px' }}
                >
                  {rank}
                </div>
                <div className="flex flex-col flex-1 min-w-0 justify-start pt-1">
                  <h3 className="text-[13px] md:text-sm font-semibold text-white line-clamp-1 group-hover:text-yellow-400 transition-colors">
                    {movie.title}
                  </h3>
                  {movie.original_title && (
                    <p className="text-[10px] md:text-[11px] text-zinc-400 mt-0.5 line-clamp-1">
                      {movie.original_title}
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className="text-[9px] font-medium text-zinc-500">{movie.quality || 'HD'}</span>
                    <span className="w-1 h-1 rounded-full bg-zinc-600"></span>
                    <span className="text-[10px] font-medium text-zinc-500">{movie.status ? movie.status.replace(/completed/i, 'Hoàn tất').replace(/ongoing/i, 'Đang phát') : `Hoàn tất`}</span>
                  </div>
                </div>
              </div>
            </Link>
            </div>
          );
        })}
      </div>

      {/* Hover Popup Overlay */}
      {hoveredMovie && (
        <div 
          className="movie-hover-popup fixed z-[9999] pointer-events-auto" 
          style={popupStyle}
          onMouseEnter={() => {
            if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
            if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
          }}
          onMouseLeave={handleMouseLeave}
        >
          <div className="bg-[#1f2129] rounded-xl overflow-hidden shadow-2xl shadow-black/60 border border-white/10">
            <div className="relative aspect-video w-full overflow-hidden flex items-center justify-center">
              <svg className="absolute w-12 h-12 text-white/10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"></path></svg>
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
                <button className="group/fav flex-1 flex items-center justify-center gap-1.5 px-2 rounded-lg border transition-all active:scale-95 border-white/20 hover:border-white/40 bg-transparent hover:bg-white/5" title="Yêu thích">
                  <svg className="transition-all duration-500 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] w-3.5 h-3.5 group-hover/fav:scale-110 text-white/90 scale-100" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path></svg>
                  <span className="text-[13px] font-semibold transition-colors text-white">Thích</span>
                </button>
                <Link href={`/phim/${hoveredMovie.slug}`} className="flex-1 flex items-center justify-center gap-1.5 px-2 rounded-lg border border-white/20 bg-transparent hover:bg-white/5 hover:border-white/40 transition-all active:scale-95 group">
                  <svg className="w-4 h-4 text-white/90 group-hover:scale-110 transition-transform duration-500 ease-[cubic-bezier(0.175,0.885,0.32,1.275)]" fill="currentColor" viewBox="0 0 24 24"><path d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"></path></svg>
                  <span className="text-[13px] font-semibold text-white">Chi tiết</span>
                </Link>
              </div>
              
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <div className="flex items-center text-[10px] font-bold rounded overflow-hidden border border-solid border-[rgba(1,180,228,0.5)]">
                  <span className="bg-[#01B4E4] text-white px-1.5 py-0.5">TMDb</span>
                  <span className="bg-[rgba(1,180,228,0.1)] text-white px-1.5 py-0.5">{Number(hoveredMovie.imdb_rating || 8.0).toFixed(1)}</span>
                </div>
                <span className="text-xs text-zinc-400 px-2 py-0.5 bg-white/5 rounded">{hoveredMovie.year || 2026}</span>
                <span className="inline-flex items-center justify-center rounded-[4px] text-[#141414] font-black leading-none tracking-normal h-[21px] px-2 text-xs" style={{backgroundColor: "rgb(255, 216, 117)", backgroundImage: "linear-gradient(220deg, rgb(255, 216, 117) 0%, rgb(255, 231, 168) 45%, rgb(255, 255, 255) 100%)"}}>
                  {hoveredMovie.quality || 'FHD'}
                </span>
                <span className="text-xs text-zinc-400 px-2 py-0.5 bg-white/5 rounded">
                  {hoveredMovie.status ? hoveredMovie.status.replace(/completed/i, 'Hoàn tất').replace(/ongoing/i, 'Đang phát') : 'Tập 1'}
                </span>
                <span className="text-xs text-zinc-400 px-2 py-0.5 bg-white/5 rounded">{hoveredMovie.language || 'Vietsub'}</span>
              </div>
              
              <p className="text-xs text-zinc-500 mt-2.5 line-clamp-1">{hoveredMovie.content ? hoveredMovie.content.replace(/<[^>]*>?/gm, '') : 'Khoa Học • Hành động'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
