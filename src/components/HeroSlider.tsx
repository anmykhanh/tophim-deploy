'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Star, Play, Heart, Info, Calendar } from 'lucide-react';
import { getBackdropUrl, getProxyImageUrl } from '@/lib/image';

interface HeroSliderProps {
  movies: any[];
}

export default function HeroSlider({ movies }: HeroSliderProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const [favoritedMap, setFavoritedMap] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (!movies || movies.length === 0) return;
    const checkFavorites = async () => {
      try {
        const statuses: Record<number, boolean> = {};
        await Promise.all(
          movies.map(async (movie) => {
            try {
              const res = await fetch(`/api/user/favorite?movie_id=${movie.id}`);
              if (res.ok) {
                const data = await res.json();
                statuses[movie.id] = data.favorited;
              }
            } catch (e) {
              // ignore error
            }
          })
        );
        setFavoritedMap(statuses);
      } catch (err) {
        console.error(err);
      }
    };
    checkFavorites();
  }, [movies]);

  const handleToggleFavorite = async (movieId: number) => {
    try {
      const res = await fetch('/api/user/favorite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movie_id: movieId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFavoritedMap(prev => ({ ...prev, [movieId]: data.favorited }));
        alert(data.message);
      } else {
        alert(data.message || 'Bạn cần đăng nhập để yêu thích phim!');
      }
    } catch (err) {
      console.error(err);
      alert('Có lỗi xảy ra, vui lòng thử lại sau.');
    }
  };

  // Autoplay functionality
  useEffect(() => {
    if (movies.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % movies.length);
    }, 10000);
    return () => clearInterval(interval);
  }, [movies.length]);

  if (!movies || movies.length === 0) return null;

  return (
    <div className="relative w-full aspect-[390/240] sm:aspect-[390/240] md:aspect-video lg:aspect-[21/10] bg-[#0f1115] overflow-visible md:overflow-hidden group mb-24 md:mb-0 mt-[68px] lg:mt-0 lg:-mt-16" style={{ isolation: 'isolate', zIndex: 0 }}>

      {/* Slides Container */}
      <div className="absolute inset-0 w-full h-full z-10 overflow-hidden">
        {movies.map((movie, index) => {
          const isActive = index === activeIndex;
          const isFav = !!favoritedMap[movie.id];
          return (
            <div
              key={movie.id}
              className={`absolute inset-0 w-full h-full transition-opacity duration-[1200ms] ease-in-out ${isActive ? 'opacity-100 z-20 pointer-events-auto' : 'opacity-0 z-10 pointer-events-none'}`}
            >
              <div className="w-full h-full relative">

                {/* Backdrop Image */}
                <div
                  className={`absolute inset-0 bg-[#0f1115] transition-transform duration-[1800ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] ${isActive ? 'translate-x-0 scale-100' : 'translate-x-[4%] scale-[1.03]'}`}
                >
                  {(() => {
                    const backdropUrl = getBackdropUrl(movie);
                    const imageUrl = getProxyImageUrl(backdropUrl, 1920);
                    return (
                      <img
                        alt={movie.title}
                        src={imageUrl}
                        className="object-cover object-top w-full h-full"
                        style={{ position: 'absolute', height: '100%', width: '100%', inset: '0px', color: 'transparent' }}
                        loading="eager"
                      />
                    );
                  })()}
                </div>

                {/* Dot/Grainy Pattern Overlay */}
                <div
                  className="absolute inset-0 pointer-events-none opacity-30 hidden md:block"
                  style={{
                    backgroundImage: 'radial-gradient(rgba(0, 0, 0, 0.4) 0.4px, transparent 1px)',
                    backgroundSize: '3px 3px',
                  }}
                />

                {/* Mobile Gradient Overlay */}
                <div
                  className="absolute inset-0 pointer-events-none md:hidden"
                  style={{
                    background: 'linear-gradient(to top, rgb(15, 17, 26) 5%, rgba(15, 17, 21, 0.6) 30%, transparent 60%), radial-gradient(transparent 60%, rgba(15, 17, 26, 0.7) 100%)',
                  }}
                />

                {/* Desktop/Tablet Gradient Overlay */}
                <div
                  className="absolute inset-0 pointer-events-none hidden md:block"
                  style={{
                    background: `
                      linear-gradient(to right, rgba(15, 17, 26, 0.6) 0%, rgba(15, 17, 26, 0.1) 30%, transparent 60%),
                      linear-gradient(to top, rgb(15, 17, 26) 0%, transparent 40%),
                      radial-gradient(transparent 65%, rgba(15, 17, 26, 0.8) 100%)
                    `,
                  }}
                />

                {/* Content Overlay */}
                <div className="absolute inset-0 z-20 flex items-end pb-0 md:pb-[6vw] lg:pb-[5vw] xl:pb-32 pointer-events-none">
                  <div className="max-w-[1400px] w-full mx-auto px-4 md:px-8 pointer-events-auto">
                    <div
                      className={`max-w-xl mx-auto md:mx-0 md:max-w-[50vw] lg:max-w-2xl flex flex-col items-center md:items-start text-center md:text-left relative top-0 md:top-0 transition-all duration-[1200ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] ${isActive ? 'translate-x-0 opacity-100 delay-[200ms]' : '-translate-x-[15%] opacity-0 delay-0'}`}
                    >

                      {/* Logo / Title */}
                      <div className="mb-1 md:mb-4 lg:mb-6">
                        {/* Always show title on mobile */}
                        <h2 className="md:hidden text-lg font-bold text-white drop-shadow-md">
                          {movie.title}
                        </h2>

                        {/* Show logo on desktop if exists, otherwise title text */}
                        <div className="hidden md:block relative -ml-2">
                          {movie.logo_url ? (
                            <img
                              alt={movie.title}
                              className="object-contain object-left-bottom drop-shadow-[0_0_15px_rgba(0,0,0,0.5)]"
                              style={{
                                width: 'clamp(210px, 25vw, 350px)',
                                height: 'clamp(74px, 9vw, 124px)',
                              }}
                              src={movie.logo_url}
                            />
                          ) : (
                            <h2 className="text-3xl lg:text-4xl font-extrabold text-white drop-shadow-[0_0_15px_rgba(0,0,0,0.5)] leading-tight">
                              {movie.title}
                            </h2>
                          )}
                        </div>
                      </div>

                      {/* Original / Sub Title */}
                      {movie.original_title && (
                        <p className="text-[#FECF59] text-xs md:text-xs lg:text-sm mb-2 md:mb-3 lg:mb-4 font-medium drop-shadow">
                          {movie.original_title}
                        </p>
                      )}

                      {/* Quality & Year Badges */}
                      <div className="flex justify-center md:justify-start items-center flex-wrap gap-2 mb-3 md:mb-4 text-[10px] md:text-xs text-white/90">
                        {movie.quality && (
                          <span
                            className="inline-flex items-center justify-center rounded-[4px] text-[#141414] font-black leading-none tracking-normal h-[22px] px-2 text-[11px]"
                            style={{
                              backgroundColor: 'rgb(255, 216, 117)',
                              backgroundImage: 'linear-gradient(220deg, rgb(255, 216, 117) 0%, rgb(255, 231, 168) 45%, rgb(255, 255, 255) 100%)',
                            }}
                          >
                            {movie.quality}
                          </span>
                        )}
                        {movie.year && (
                          <span className="px-2 py-[3px] rounded border border-white/20 bg-black/40">
                            {movie.year}
                          </span>
                        )}
                        {(movie.episode_current || movie.status) && (
                          <span className="px-2 py-[3px] rounded border border-white bg-black/40">
                            {movie.episode_current || movie.status.replace(/completed/i, 'Hoàn tất').replace(/ongoing/i, 'Đang phát')}
                          </span>
                        )}
                        {movie.imdb_rating && (
                          <div className="flex items-center text-[10px] md:text-[11px] font-bold rounded overflow-hidden border border-solid border-[rgba(1,180,228,0.5)]">
                            <span className="bg-[#01B4E4] text-white px-1.5 py-0.5">TMDb</span>
                            <span className="bg-[rgba(1,180,228,0.1)] text-white px-1.5 py-0.5">{Number(movie.imdb_rating).toFixed(1)}</span>
                          </div>
                        )}
                      </div>

                      {/* Brief Description */}
                      <div className="hidden md:block mb-4 lg:mb-8 max-w-sm lg:max-w-lg">
                        <p className="text-xs lg:text-sm text-white/90 font-light leading-relaxed line-clamp-2 lg:line-clamp-3">
                          {movie.description || 'Chưa có tóm tắt nội dung cho phim này.'}
                        </p>
                      </div>

                      {/* Buttons */}
                      <div className="hidden md:flex justify-center md:justify-start items-center gap-4">
                        {/* Play Action */}
                        <Link
                          href={`/xem/${movie.slug}`}
                          className="w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 text-[#0f1115] rounded-full flex items-center justify-center transition-transform hover:scale-105 shadow-[0_0_15px_rgba(254,207,89,0.5)] shrink-0"
                          title="Xem Ngay"
                          style={{
                            background: 'linear-gradient(39deg, rgb(254, 207, 89), rgb(255, 241, 204))',
                          }}
                        >
                          <Play className="relative w-6 h-6 md:w-8 md:h-8 text-[#0f1115] fill-current translate-x-0.5" />
                        </Link>

                        {/* Heart & Info actions */}
                        <div className="flex bg-white/5 border border-white/20 rounded-full backdrop-blur-md h-10 md:h-12 lg:h-14 items-center overflow-hidden">
                          <button
                            onClick={() => handleToggleFavorite(movie.id)}
                            className="group/btn w-16 md:w-20 h-full flex items-center justify-center transition-all text-white active:scale-75"
                            title="Yêu thích"
                          >
                            <Heart className={`w-5 h-5 md:w-6 md:h-6 transition-all duration-500 ease-in-out group-hover/btn:scale-110 ${isFav ? 'fill-red-500 stroke-red-500' : 'fill-transparent stroke-current'}`} />
                          </button>

                          <div className="w-[1px] h-3/5 bg-white/20" />

                          <Link
                            href={`/phim/${movie.slug}`}
                            className="group/link w-16 md:w-20 h-full flex items-center justify-center transition-colors text-white"
                            title="Chi tiết phim"
                          >
                            <Info className="w-5 h-5 md:w-6 md:h-6 text-white group-hover/link:text-[#FECF59] transition-colors" />
                          </Link>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>

                {/* Mobile full click support */}
                <Link
                  href={`/phim/${movie.slug}`}
                  className="absolute inset-0 z-30 md:hidden"
                  title="Chi tiết phim"
                />

              </div>
            </div>
          );
        })}
      </div>

      {/* Slide Navigation Thumbnails */}
      <div
        className="absolute -bottom-16 md:bottom-8 left-1/2 -translate-x-1/2 md:left-auto md:right-8 md:translate-x-0 z-30 flex gap-2 md:gap-2 overflow-x-auto max-w-[calc(100%-2rem)] md:max-w-md lg:max-w-lg pb-2 md:pb-0 snap-x px-2 pointer-events-auto scroll-smooth [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {movies.map((movie, index) => {
          const isActive = index === activeIndex;
          const thumbUrl = getProxyImageUrl(getBackdropUrl(movie), 128);
          return (
            <button
              key={movie.id}
              onClick={() => setActiveIndex(index)}
              aria-label={`Go to slide ${index + 1}`}
              className={`relative shrink-0 w-[14vw] sm:w-[10vw] md:w-[7vw] lg:w-[6vw] xl:w-[5vw] max-w-[40px] md:max-w-[75px] lg:max-w-[85px] aspect-square md:aspect-[16/9] transition-all duration-300 rounded-full md:rounded-lg overflow-hidden snap-center transform-gpu border-2 md:border-2 ${isActive ? 'border-white/90 opacity-100 scale-100 shadow-md' : 'border-transparent opacity-80 scale-95 hover:scale-100 hover:opacity-100'}`}
              style={{ WebkitMaskImage: '-webkit-radial-gradient(white, black)' }}
            >
              <img
                alt={movie.title}
                className="object-cover w-full h-full"
                src={thumbUrl}
              />
            </button>
          );
        })}
      </div>

    </div>
  );
}
