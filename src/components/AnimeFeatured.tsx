'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getBackdropUrl, getProxyImageUrl, getPosterUrl } from '@/lib/image';

interface AnimeFeaturedProps {
  animeList: any[];
}

export default function AnimeFeatured({ animeList }: AnimeFeaturedProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (!animeList || animeList.length === 0) return null;

  return (
    <div className="w-full mt-6 mb-12" suppressHydrationWarning>
      {/* Title Header */}
      <a className="inline-flex items-center gap-2 mb-6 group cursor-pointer" href="/hoat-hinh">
        <h2 className="text-2xl md:text-3xl font-bold text-white group-hover:text-[#FECF59] transition-colors">
          Thế giới Anime
        </h2>
        <span className="w-6 h-6 rounded-full border border-white/20 flex items-center justify-center group-hover:border-[#FECF59] transition-colors">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lucide lucide-chevron-right w-4 h-4 text-white group-hover:text-[#FECF59] transition-colors"
            aria-hidden="true"
          >
            <path d="m9 18 6-6-6-6"></path>
          </svg>
        </span>
      </a>

      {/* Desktop Wrapper */}
      <div className="hidden md:block relative w-full">
        <div className="w-full rounded-[20px] md:rounded-[24px] overflow-hidden bg-[#12121a] relative aspect-video lg:aspect-[2.5/1]">
          
          {/* Active Slides rendering with Fade effect */}
          {animeList.map((anime, index) => {
            const isActive = index === activeIndex;
            const backdropUrl = getBackdropUrl(anime);
            const imageUrl = getProxyImageUrl(backdropUrl, 1280);
            
            // Extract genres
            const genres = anime.movie_category
              ? anime.movie_category
                  .map((mc: any) => mc.categories)
                  .filter((cat: any) => cat && cat.type === 'genre')
                  .map((cat: any) => cat.name)
              : ['Hành Động', 'Phiêu Lưu'];

            return (
              <div
                key={anime.id}
                className={`absolute inset-0 w-full h-full transition-all duration-700 ease-in-out ${
                  isActive ? 'opacity-100 z-10 scale-100 pointer-events-auto' : 'opacity-0 z-0 scale-95 pointer-events-none'
                }`}
              >
                {/* Background layout */}
                <div className="absolute inset-0 w-[30%] bg-[#171a26] pointer-events-none" suppressHydrationWarning></div>
                <div className="absolute inset-0 left-[30%]">
                  <img
                    alt={anime.title}
                    src={imageUrl}
                    className="object-cover object-top w-full h-full"
                    style={{ position: 'absolute', height: '100%', width: '100%', inset: 0, color: 'transparent' }}
                  />
                </div>

                {/* Overlays */}
                <div 
                  className="absolute inset-0 pointer-events-none opacity-30"
                  style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)', backgroundSize: '4px 4px' }}
                ></div>
                <div 
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: 'linear-gradient(90deg, #171a26 0%, #171a26 25%, rgba(23, 26, 38, 0.95) 35%, rgba(23, 26, 38, 0) 65%)' }}
                ></div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#12121a] via-transparent to-transparent pointer-events-none"></div>

                {/* Details card content */}
                <div className="absolute inset-0 z-20 flex flex-col justify-center p-10 lg:p-12 pointer-events-none w-[50%] lg:w-[35%]">
                  <div className="w-full max-w-xl flex flex-col pointer-events-auto text-left">
                    <h3 className="text-2xl lg:text-3xl font-bold text-white mb-1.5 leading-tight drop-shadow-lg truncate w-full">
                      {anime.title}
                    </h3>
                    <p className="text-[#FECF59] text-sm mb-3 font-medium drop-shadow-md truncate w-full">
                      {anime.original_title || anime.title}
                    </p>

                    {/* Meta info */}
                    <div className="flex items-center flex-wrap gap-1.5 mb-3 h-[30px] overflow-hidden shrink-0">
                      <div className="flex items-center text-[11px] font-bold rounded overflow-hidden border border-solid border-[rgba(245,197,24,0.5)]">
                        <span className="bg-[#F5C518] text-black px-1.5 py-0.5">IMDb</span>
                        <span className="bg-[rgba(245,197,24,0.1)] text-white px-1.5 py-0.5">
                          {anime.imdb_rating ? Number(anime.imdb_rating).toFixed(1) : '8.2'}
                        </span>
                      </div>
                      <div className="flex items-center text-[11px] font-bold rounded overflow-hidden border border-solid border-[rgba(1,180,228,0.5)]">
                        <span className="bg-[#01B4E4] text-white px-1.5 py-0.5">TMDb</span>
                        <span className="bg-[rgba(1,180,228,0.1)] text-white px-1.5 py-0.5">
                          {(Number(anime.imdb_rating || 8.2) - 0.2).toFixed(1)}
                        </span>
                      </div>
                      <span className="px-2 py-[4.5px] rounded-md border border-white bg-black/40 backdrop-blur-sm shadow-sm text-[11px] text-white/90">
                        {anime.year || '2026'}
                      </span>
                      <span className="px-2 py-[4.5px] rounded-md border border-white bg-black/40 backdrop-blur-sm shadow-sm text-[11px] text-white/90">
                        {anime.status || 'Full'}
                      </span>
                    </div>

                    {/* Genres */}
                    <div className="flex items-center gap-1.5 mb-5 h-[26px] overflow-hidden shrink-0 whitespace-nowrap">
                      {genres.slice(0, 4).map((genreName: string, i: number) => (
                        <span key={i} className="text-[11px] text-white/50 bg-white/10 px-2 py-[3px] rounded-md backdrop-blur-sm shrink-0">
                          {genreName}
                        </span>
                      ))}
                    </div>

                    {/* Description */}
                    <div className="mb-6 lg:mb-8 w-full max-w-lg shrink-0 hidden md:block">
                      <p className="text-xs lg:text-sm text-white/80 font-normal leading-relaxed line-clamp-3 h-[54px] lg:h-[63px] overflow-hidden">
                        {anime.description || 'Đang cập nhật nội dung...'}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-4">
                      <Link
                        className="w-16 h-16 bg-[#FECF59] hover:bg-[#F5C518] text-[#0f1115] rounded-full flex items-center justify-center transition-transform hover:scale-105 shadow-[0_0_15px_rgba(254,207,89,0.5)] shrink-0"
                        title="Xem Ngay"
                        href={`/xem/${anime.slug}`}
                      >
                        <svg className="relative w-12 h-12 text-[#0f1115]" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8 5c0-.8.9-1.3 1.6-.9l9 6c.6.4.6 1.4 0 1.8l-9 6c-.7.4-1.6-.1-1.6-.9V5z"></path>
                        </svg>
                      </Link>

                      <div className="flex bg-white/5 border border-white/20 rounded-full backdrop-blur-md h-14 items-center overflow-hidden shrink-0">
                        <button
                          className="group/btn w-20 h-full flex items-center justify-center transition-all text-white active:scale-75"
                          title="Yêu thích"
                        >
                          <svg
                            className="w-6 h-6 transition-all duration-500 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] group-hover/btn:scale-110 text-white scale-100"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path>
                          </svg>
                        </button>
                        <div className="w-[1px] h-3/5 bg-white/20"></div>
                        <Link
                          className="group/link w-20 h-full flex items-center justify-center transition-colors text-white"
                          title="Chi tiết phim"
                          href={`/phim/${anime.slug}`}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="lucide lucide-info w-7 h-7 text-[#0f1115] fill-white group-hover/link:fill-[#FECF59] [&>circle]:stroke-white group-hover/link:[&>circle]:stroke-[#FECF59] transition-all"
                            aria-hidden="true"
                          >
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M12 16v-4"></path>
                            <path d="M12 8h.01"></path>
                          </svg>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Mini-posters thumbnail row at the bottom center */}
          <div className="absolute bottom-2 left-0 right-0 z-30 flex justify-center gap-3 overflow-x-auto scrollbar-none px-4 py-6">
            {animeList.map((anime, idx) => {
              const isActive = idx === activeIndex;
              const posterImg = getProxyImageUrl(getPosterUrl(anime), 120);
              return (
                <button
                  key={anime.id}
                  onClick={() => setActiveIndex(idx)}
                  className={`relative rounded-lg overflow-hidden transition-all duration-300 shrink-0 ${
                    isActive
                      ? 'scale-[1.15] -translate-y-2 shadow-[0_8px_20px_rgba(0,0,0,0.6)] z-20'
                      : 'opacity-80 scale-95 hover:opacity-100 hover:scale-100 z-10 hover:-translate-y-1'
                  }`}
                  style={{ width: '64px', height: '96px' }}
                  title={anime.title}
                >
                  <img
                    src={posterImg}
                    alt={anime.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {/* Border overlay */}
                  <div className={`absolute inset-0 rounded-lg pointer-events-none transition-all duration-300 ${
                    isActive ? 'border-[3px] border-white' : 'border border-white/20'
                  }`} />
                </button>
              );
            })}
          </div>

        </div>
      </div>

      {/* Mobile Wrapper */}
      <div className="block md:hidden relative w-full">
        <div className="w-full rounded-[20px] overflow-hidden bg-[#171a26]">
          {animeList.map((anime, index) => {
            if (index !== activeIndex) return null;
            
            const backdropUrl = getBackdropUrl(anime);
            const imageUrl = getProxyImageUrl(backdropUrl, 768);
            
            // Extract genres
            const genres = anime.movie_category
              ? anime.movie_category
                  .map((mc: any) => mc.categories)
                  .filter((cat: any) => cat && cat.type === 'genre')
                  .map((cat: any) => cat.name)
              : ['Hành Động', 'Phiêu Lưu'];

            return (
              <div key={anime.id} className="w-full relative animate-in fade-in duration-300">
                <div className="bg-[#171a26] flex flex-col w-full relative">
                  
                  {/* Aspect 16/10 Backdrop Image */}
                  <div className="relative w-full aspect-[16/10] overflow-hidden">
                    <img 
                      alt={anime.title} 
                      src={imageUrl} 
                      className="object-cover object-top w-full h-full absolute inset-0"
                    />
                    <div 
                      className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none z-20"
                      style={{
                        background: 'linear-gradient(to top, #171a26 0%, rgba(23, 26, 38, 0.8) 50%, transparent 100%)'
                      }}
                    />
                  </div>

                  {/* Info details */}
                  <div className="px-5 pb-5 -mt-14 relative z-20 w-full text-left">
                    <div className="w-full flex flex-col pb-2">
                      <div className="mb-2">
                        <h3 className="text-base font-bold text-white mb-1 leading-tight truncate">{anime.title}</h3>
                        {anime.original_title && (
                          <p className="text-[#FECF59] text-[11px] mb-2.5 font-medium truncate">{anime.original_title}</p>
                        )}
                        
                        {/* Badges */}
                        <div className="flex items-center flex-wrap gap-1.5 mb-2 text-[10px] text-white/90 max-h-[26px] overflow-hidden">
                          <div className="flex items-center text-[10px] font-bold rounded overflow-hidden border border-solid border-[rgba(245,197,24,0.5)]">
                            <span className="bg-[#F5C518] text-black px-1 py-0.5">IMDb</span>
                            <span className="bg-[rgba(245,197,24,0.1)] text-white px-1 py-0.5">
                              {anime.imdb_rating ? Number(anime.imdb_rating).toFixed(1) : '8.2'}
                            </span>
                          </div>
                          
                          <div className="flex items-center text-[10px] font-bold rounded overflow-hidden border border-solid border-[rgba(1,180,228,0.5)]">
                            <span className="bg-[#01B4E4] text-white px-1 py-0.5">TMDb</span>
                            <span className="bg-[rgba(1,180,228,0.1)] text-white px-1 py-0.5">
                              {(Number(anime.imdb_rating || 8.2) - 0.2).toFixed(1)}
                            </span>
                          </div>

                          <span className="px-2 py-[3px] rounded-md border border-white bg-black/30 shrink-0">
                            {anime.year || '2026'}
                          </span>
                          <span className="px-2 py-[3px] rounded-md border border-white bg-black/30 shrink-0">
                            {anime.status || 'Full'}
                          </span>
                        </div>

                        {/* Genres */}
                        <div className="flex items-center flex-wrap gap-1.5 mb-2 max-h-[24px] overflow-hidden">
                          {genres.slice(0, 3).map((genreName: string, i: number) => (
                            <span key={i} className="text-[10px] text-white/50 bg-white/10 px-2 py-[3px] rounded-md shrink-0">
                              {genreName}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-[13px] text-white/70 leading-relaxed line-clamp-3 overflow-hidden">
                        {anime.description || 'Chưa có tóm tắt nội dung cho phim này.'}
                      </p>
                    </div>
                    
                    {/* Link overlay */}
                    <Link 
                      className="absolute inset-0 z-50 pointer-events-auto" 
                      title="Chi tiết phim" 
                      href={`/phim/${anime.slug}`}
                    />
                  </div>

                </div>
              </div>
            );
          })}
        </div>

        {/* Paging Dots */}
        <div className="flex justify-center gap-1.5 mt-4">
          {animeList.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIndex(idx)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                idx === activeIndex ? 'bg-[#FECF59]' : 'bg-white/20 hover:bg-white/40'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
