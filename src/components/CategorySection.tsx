'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getBackdropUrl, getProxyImageUrl } from '@/lib/image';

interface CategorySectionProps {
  titleLine1: string;
  titleLine2: string;
  gradientTo: string; // e.g. '#C084FC', '#FDE047', '#38BDF8'
  viewAllLink: string;
  movies: any[];
}

export default function CategorySection({
  titleLine1,
  titleLine2,
  gradientTo,
  viewAllLink,
  movies,
}: CategorySectionProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const { scrollLeft, clientWidth } = scrollContainerRef.current;
      const scrollAmount = clientWidth * 0.75;
      scrollContainerRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  // Helper to resolve subtitles/badges
  const getEditionBadges = (movie: any) => {
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

    const badges: { label: string; bg: string }[] = [];

    // If language contains Thuyết Minh/Lồng Tiếng
    if (langStr.toLowerCase().includes('thuyết minh') || langStr.toLowerCase().includes('lồng tiếng')) {
      badges.push({
        label: `TM. ${epNum || 'Full'}`,
        bg: 'bg-[#2CA35D]/95',
      });
    }

    // Default to Phụ Đề (Vietsub) if it's Vietsub or no other badge is found
    if (langStr.toLowerCase().includes('vietsub') || badges.length === 0) {
      badges.push({
        label: `PĐ. ${epNum || 'Full'}`,
        bg: 'bg-[#5E6070]/95',
      });
    }

    return badges;
  };

  return (
    <section className="flex flex-col lg:flex-row gap-6 lg:gap-10 items-start relative w-full group/section">
      
      {/* Left Column: Title & Link */}
      <div className="lg:w-48 xl:w-56 shrink-0 flex flex-row lg:flex-col justify-between items-center lg:items-start w-full gap-2 text-left">
        <h2 
          className="text-xl md:text-2xl lg:text-3xl font-black mb-0 lg:mb-4 leading-tight flex flex-wrap items-baseline lg:flex-col lg:items-start transition-all duration-300 text-transparent bg-clip-text"
          style={{
            backgroundImage: `linear-gradient(to bottom right, #ffffff, ${gradientTo})`
          }}
        >
          <span className="inline-block pb-1 lg:pb-0">{titleLine1}</span>
          <span className="inline-block ml-1.5 lg:ml-0">{titleLine2}</span>
        </h2>
        <Link 
          className="text-xs md:text-sm font-medium text-zinc-400 hover:text-white transition-colors" 
          href={viewAllLink}
        >
          Xem toàn bộ &gt;
        </Link>
      </div>

      {/* Right Column: Scroll Container */}
      <div className="relative w-full lg:w-auto min-w-0 overflow-hidden flex-1">
        
        {/* Navigation Buttons */}
        <button 
          onClick={() => scroll('left')}
          className="absolute left-2 top-[35%] -translate-y-1/2 z-20 w-8 h-8 md:w-10 md:h-10 bg-white/95 text-zinc-950 hover:scale-110 shadow-xl rounded-full items-center justify-center transition-all opacity-0 group-hover/section:opacity-100 hidden md:flex"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
        </button>
        
        <button 
          onClick={() => scroll('right')}
          className="absolute right-2 top-[35%] -translate-y-1/2 z-20 w-8 h-8 md:w-10 md:h-10 bg-white/95 text-zinc-950 hover:scale-110 shadow-xl rounded-full items-center justify-center transition-all opacity-0 group-hover/section:opacity-100 hidden md:flex"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
        </button>

        {/* Horizontal Scroll Cards List */}
        <div 
          ref={scrollContainerRef}
          className="flex gap-2 md:gap-5 overflow-x-auto scroll-smooth snap-x md:snap-none pb-4 pr-10 custom-scrollbar"
        >
          {movies.map((movie) => {
            const backdropUrl = getBackdropUrl(movie);
            const imageUrl = getProxyImageUrl(backdropUrl, 640);
            const badges = getEditionBadges(movie);

            return (
              <Link 
                key={movie.id}
                className="shrink-0 w-44 md:w-72 lg:w-80 snap-start md:snap-align-none group relative block text-left" 
                href={`/phim/${movie.slug}`}
              >
                {/* Image Backdrop Container */}
                <div className="relative aspect-video rounded-xl overflow-hidden bg-zinc-900 mb-3 shadow-lg border border-zinc-900 transition-all duration-300">
                  <img 
                    alt={movie.title} 
                    className="object-cover w-full h-full transition-transform duration-500" 
                    src={imageUrl || '/placeholder.jpg'}
                    loading="lazy"
                  />
                  {movie.sub_docquyen && (
                    <div className="absolute top-2 left-2 z-20 drop-shadow-md">
                      <svg className="w-5 h-5 md:w-6 md:h-6 text-[#F5C518]" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498a4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd"></path></svg>
                    </div>
                  )}
                  {/* Badges Overlay at bottom-left */}
                  <div className="absolute inset-x-0 bottom-0 flex items-end pb-2 md:pb-0 justify-start pointer-events-none">
                    <div className="flex z-10 flex-col md:flex-row md:flex-nowrap gap-1 md:gap-0 items-start md:items-end justify-start pl-1 sm:pl-2 md:pl-2.5 lg:pl-3">
                      {badges.map((badge, bIdx) => (
                        <span 
                          key={bIdx}
                          className={`text-[9px] md:text-[10px] px-1.5 md:px-2 py-[1px] md:py-0.5 rounded-full md:rounded-none md:first:rounded-tl-sm md:last:rounded-tr-sm text-white backdrop-blur-sm shadow-sm whitespace-nowrap ${badge.bg}`}
                        >
                          <span className="font-bold">{badge.label}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                {/* Titles */}
                <h3 className="text-[13px] md:text-base font-bold text-white line-clamp-1 group-hover:text-amber-400 transition-colors">
                  {movie.title}
                </h3>
                {movie.original_title && (
                  <p className="text-[11px] md:text-sm text-zinc-500 line-clamp-1 mt-0.5">
                    {movie.original_title}
                  </p>
                )}
              </Link>
            );
          })}
        </div>

      </div>

    </section>
  );
}
