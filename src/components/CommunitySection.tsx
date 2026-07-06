'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { getPosterUrl, getProxyImageUrl } from '@/lib/image';

interface CommentData {
  id: number;
  content: string;
  created_at: string;
  user: string;
  avatar: string | null;
  role?: string;
  movie: string;
  movie_id: number;
  movie_slug: string;
  movie_poster: string | null;
  movie_thumb: string | null;
}

interface MovieData {
  id: number;
  title: string;
  slug: string;
  thumb_url: string | null;
  poster_url: string | null;
}

interface GenreData {
  id: number;
  name: string;
  slug: string;
  color: string | null;
}

interface CommunitySectionProps {
  comments: CommentData[];
  soiNoiMovies: MovieData[];
  yeuThichMovies: MovieData[];
  hotGenres: GenreData[];
}

const genreColors = [
  'bg-yellow-500 hover:bg-yellow-400 text-yellow-950',
  'bg-green-500 hover:bg-green-400 text-green-950',
  'bg-purple-500 hover:bg-purple-400 text-white',
  'bg-teal-500 hover:bg-teal-400 text-teal-950',
  'bg-orange-500 hover:bg-orange-400 text-orange-950',
  'bg-blue-500 hover:bg-blue-400 text-white',
  'bg-pink-500 hover:bg-pink-400 text-white',
  'bg-red-500 hover:bg-red-400 text-white',
  'bg-indigo-500 hover:bg-indigo-400 text-white',
];

export default function CommunitySection({
  comments,
  soiNoiMovies,
  yeuThichMovies,
  hotGenres
}: CommunitySectionProps) {
  const sliderRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  return (
    <section className="rounded-2xl border border-white/[0.09] bg-transparent flex flex-col">
      {/* Top: Bình Luận Mới */}
      <div className="relative px-5 py-6 sm:px-7 lg:px-10">
        <div className="mb-4 flex items-center gap-2.5">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-[22px] w-[22px] fill-[#ffd875] text-[#ffd875]">
            <path d="M320.3 192L235.7 51.1C229.2 40.3 215.6 36.4 204.4 42L117.8 85.3C105.9 91.2 101.1 105.6 107 117.5L176.6 256.6C146.5 290.5 128.3 335.1 128.3 384C128.3 490 214.3 576 320.3 576C426.3 576 512.3 490 512.3 384C512.3 335.1 494 290.5 464 256.6L533.6 117.5C539.5 105.6 534.7 91.2 522.9 85.3L436.2 41.9C425 36.3 411.3 40.3 404.9 51L320.3 192zM351.1 334.5C352.5 337.3 355.1 339.2 358.1 339.6L408.2 346.9C415.9 348 418.9 357.4 413.4 362.9L377.1 398.3C374.9 400.5 373.9 403.5 374.4 406.6L383 456.5C384.3 464.1 376.3 470 369.4 466.4L324.6 442.8C321.9 441.4 318.6 441.4 315.9 442.8L271.1 466.4C264.2 470 256.2 464.2 257.5 456.5L266.1 406.6C266.6 403.6 265.6 400.5 263.4 398.3L227.1 362.9C221.5 357.5 224.6 348.1 232.3 346.9L282.4 339.6C285.4 339.2 288.1 337.2 289.4 334.5L311.8 289.1C315.2 282.1 325.1 282.1 328.6 289.1L351 334.5z" />
          </svg>
          <h2 className="text-[14px] sm:text-[15px] font-bold uppercase tracking-wide text-white">Bình Luận Mới</h2>
        </div>

        <div className="-mx-1 px-1 pb-1">
          <div className="overflow-x-auto scrollbar-none pb-2 flex gap-4 snap-x">
            {comments.map((cmt) => {
              const avatarUrl = cmt.avatar || `/avatars/viet-nam/${(cmt.id % 20) + 1}.jpg`;
              const moviePoster = cmt.movie_poster || '';
              const movieThumb = cmt.movie_thumb || moviePoster;
              const detailLink = `/phim/${cmt.movie_slug}#comment-${cmt.id}`;

              return (
                <div key={cmt.id} className="snap-start shrink-0 !w-[260px] sm:!w-[280px] lg:!w-[290px]">
                  <Link
                    href={detailLink}
                    className="group relative block h-[190px] w-full overflow-hidden rounded-lg bg-[#171821]/10 backdrop-blur-[6px] px-5 pt-5 pb-3 transition-colors duration-300"
                    aria-label={`Bình luận của ${cmt.user} trong ${cmt.movie}`}
                  >
                    {/* Background poster blur */}
                    {moviePoster && (
                      <img
                        alt=""
                        loading="lazy"
                        className="absolute inset-0 object-cover opacity-25 blur-[4px] scale-110 transition-opacity duration-300 group-hover:opacity-35 w-full h-full"
                        src={getProxyImageUrl(moviePoster, 320)}
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-r from-[#171821]/10 via-[#171821]/30 to-[#171821]/10 pointer-events-none"></div>
                    <div className="absolute inset-x-0 bottom-0 h-4/5 bg-gradient-to-t from-[#0f111a] via-[#0f111a]/50 to-transparent pointer-events-none"></div>

                    {/* Small thumbnail on the right */}
                    <div className="absolute right-5 top-5 h-[72px] w-[48px] overflow-hidden rounded-md bg-black/30 shadow-2xl ring-1 ring-white/10 z-10">
                      <img
                        alt={cmt.movie}
                        loading="lazy"
                        className="object-cover w-full h-full"
                        src={getProxyImageUrl(movieThumb, 80)}
                      />
                    </div>

                    <div className="relative z-10 flex h-full flex-col">
                      <div className="pr-16">
                        <div className="w-fit">
                          <div className="relative shrink-0">
                            <div className={cmt.role === 'admin' ? "avatar-ring-premium" : "ring-1 ring-white/15 rounded-full p-[2px] transition-colors group-hover:ring-white"}>
                              <img
                                alt=""
                                loading="lazy"
                                className="w-9 h-9 sm:w-11 sm:h-11 rounded-full object-cover relative z-10"
                                src={avatarUrl}
                              />
                            </div>
                            {cmt.role === 'admin' && (
                              <div className="absolute -top-[4px] -left-[4px] z-20 bg-[#FFD166] bg-gradient-to-tr from-[#FFD166] to-[#ff9800] rounded-full p-[2px] shadow-md border-[1.5px] border-[#12121a]">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-crown w-[7px] h-[7px] text-[#1c1c1c] fill-[#1c1c1c]" aria-hidden="true"><path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"></path><path d="M5 21h14"></path></svg>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="mt-3 flex min-w-0 items-center gap-1.5 flex-wrap">
                          {cmt.role === 'admin' && (
                            <span className="inline-flex items-center px-1.5 py-[0.5px] rounded bg-[#FFD166] text-[#0f111a] text-[8px] font-black tracking-wider shrink-0">ADMIN</span>
                          )}
                          <span className="truncate text-[14px] font-bold text-white" style={cmt.role === 'admin' ? { background: 'linear-gradient(rgb(255, 255, 255), rgb(255, 209, 102))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' } : undefined}>
                            {cmt.user}
                          </span>
                          {cmt.role === 'admin' && (
                            <img alt="emoji" loading="lazy" width="18" height="18" className="w-[16px] h-[16px] object-contain shrink-0" src="/gif/03.gif" />
                          )}
                          {cmt.role !== 'admin' && (
                            <span className="shrink-0 scale-90 origin-left">
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-infinity h-[18px] w-[18px] text-white/35" aria-hidden="true">
                                <path d="M6 16c5 0 7-8 12-8a4 4 0 0 1 0 8c-5 0-7-8-12-8a4 4 0 1 0 0 8"></path>
                              </svg>
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="mt-1.5 line-clamp-2 min-h-[40px] text-[13px] font-normal leading-[1.6] text-white/60" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                        {cmt.content}
                      </p>

                      <div className="mt-auto flex items-center gap-4 text-[12px] font-semibold text-white/58">
                        <span className="inline-flex items-center gap-1.5">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-circle-arrow-up h-4 w-4 fill-white/70 text-[#171821]" aria-hidden="true">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="m16 12-4-4-4 4"></path>
                            <path d="M12 16V8"></path>
                          </svg>
                          0
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-circle-arrow-down h-4 w-4 fill-white/70 text-[#171821]" aria-hidden="true">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M12 8v8"></path>
                            <path d="m8 12 4 4 4-4"></path>
                          </svg>
                          0
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-square h-4 w-4 fill-white/70 text-white/70" aria-hidden="true">
                            <path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"></path>
                          </svg>
                          0
                        </span>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
            {comments.length === 0 && (
              <div className="text-zinc-500 text-sm py-8 px-4 w-full text-center">Chưa có bình luận nào.</div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom: 3 Columns */}
      <div className="p-5 sm:p-7 lg:p-10 border-t border-white/[0.05]">
        <div className="flex md:grid md:grid-cols-3 gap-6 md:gap-8 lg:gap-12 overflow-x-auto md:overflow-visible snap-x scrollbar-none pb-4 md:pb-0">

          {/* Column 1: Sôi Nổi Nhất */}
          <div className="w-[85vw] sm:w-[280px] md:w-auto shrink-0 snap-start">
            <div className="mb-5 flex items-center gap-2.5 border-b border-white/[0.05] pb-3">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-[#ffd875]">
                <path fillRule="evenodd" d="M12.963 2.286a.75.75 0 00-1.071-.136 9.742 9.742 0 00-3.539 6.177A7.547 7.547 0 016.648 6.61a.75.75 0 00-1.152.082A9 9 0 1015.68 4.534a7.46 7.46 0 01-2.717-2.248zM15.75 14.25a3.75 3.75 0 11-7.313-1.172c.628.465 1.35.81 2.133 1a5.99 5.99 0 011.925-3.545 3.75 3.75 0 013.255 3.717z" clipRule="evenodd" />
              </svg>
              <h3 className="text-[14px] sm:text-[15px] font-bold uppercase tracking-wide text-white">Sôi Nổi Nhất</h3>
            </div>
            <div className="flex flex-col gap-4">
              {soiNoiMovies.map((movie, idx) => {
                const imgUrl = movie.poster_url || movie.thumb_url || '';
                return (
                  <Link
                    key={movie.id}
                    href={`/phim/${movie.slug}`}
                    className="flex items-center gap-2 group"
                  >
                    <span className="text-sm font-bold text-white/40 w-4 text-center">{idx + 1}.</span>
                    <span className="shrink-0 flex items-center justify-center w-5">
                      {idx === 0 || idx === 1 || idx === 3 ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trending-up w-3.5 h-3.5 text-[#2ca35d] shrink-0" aria-hidden="true">
                          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
                          <polyline points="16 7 22 7 22 13"></polyline>
                        </svg>
                      ) : idx === 4 ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trending-down w-3.5 h-3.5 text-[#e53e3e] shrink-0" aria-hidden="true">
                          <polyline points="22 17 13.5 8.5 8.5 13.5 2 7"></polyline>
                          <polyline points="16 17 22 17 22 11"></polyline>
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-minus w-3.5 h-3.5 text-white/35 shrink-0" aria-hidden="true">
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                      )}
                    </span>
                    <div className="w-[34px] h-[48px] rounded overflow-hidden shrink-0 bg-zinc-900 border border-zinc-800">
                      {imgUrl && (
                        <img
                          src={getProxyImageUrl(imgUrl, 80)}
                          alt={movie.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      )}
                    </div>
                    <h4 className="text-sm font-semibold text-white/80 group-hover:text-amber-400 line-clamp-1 transition-colors pl-1">{movie.title}</h4>
                  </Link>
                );
              })}
              {soiNoiMovies.length === 0 && (
                <div className="text-zinc-650 text-xs py-2">Không có dữ liệu.</div>
              )}
            </div>
            <Link href="/chu-de" className="inline-block mt-5 text-xs font-medium text-white/40 hover:text-white transition-colors">
              Xem thêm
            </Link>
          </div>

          {/* Column 2: Yêu Thích Nhất */}
          <div className="w-[85vw] sm:w-[280px] md:w-auto shrink-0 snap-start">
            <div className="mb-5 flex items-center gap-2.5 border-b border-white/[0.05] pb-3">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-[#ffd875]">
                <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
              </svg>
              <h3 className="text-[14px] sm:text-[15px] font-bold uppercase tracking-wide text-white">Yêu Thích Nhất</h3>
            </div>
            <div className="flex flex-col gap-4">
              {yeuThichMovies.map((movie, idx) => {
                const imgUrl = movie.poster_url || movie.thumb_url || '';
                return (
                  <Link
                    key={movie.id}
                    href={`/phim/${movie.slug}`}
                    className="flex items-center gap-2 group"
                  >
                    <span className="text-sm font-bold text-white/40 w-4 text-center">{idx + 1}.</span>
                    <span className="shrink-0 flex items-center justify-center w-5">
                      {idx === 0 || idx === 1 || idx === 3 ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trending-up w-3.5 h-3.5 text-[#2ca35d] shrink-0" aria-hidden="true">
                          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
                          <polyline points="16 7 22 7 22 13"></polyline>
                        </svg>
                      ) : idx === 4 ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trending-down w-3.5 h-3.5 text-[#e53e3e] shrink-0" aria-hidden="true">
                          <polyline points="22 17 13.5 8.5 8.5 13.5 2 7"></polyline>
                          <polyline points="16 17 22 17 22 11"></polyline>
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-minus w-3.5 h-3.5 text-white/35 shrink-0" aria-hidden="true">
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                      )}
                    </span>
                    <div className="w-[34px] h-[48px] rounded overflow-hidden shrink-0 bg-zinc-900 border border-zinc-800">
                      {imgUrl && (
                        <img
                          src={getProxyImageUrl(imgUrl, 80)}
                          alt={movie.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      )}
                    </div>
                    <h4 className="text-sm font-semibold text-white/80 group-hover:text-amber-400 line-clamp-1 transition-colors pl-1">{movie.title}</h4>
                  </Link>
                );
              })}
              {yeuThichMovies.length === 0 && (
                <div className="text-zinc-650 text-xs py-2">Không có dữ liệu.</div>
              )}
            </div>
            <Link href="/chu-de" className="inline-block mt-5 text-xs font-medium text-white/40 hover:text-white transition-colors">
              Xem thêm
            </Link>
          </div>

          {/* Column 3: Thể Loại Hot */}
          <div className="w-[85vw] sm:w-[280px] md:w-auto shrink-0 snap-start">
            <div className="mb-5 flex items-center gap-2.5 border-b border-white/[0.05] pb-3">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-[#ffd875]">
                <path fillRule="evenodd" d="M19.5 21a3 3 0 003-3V9a3 3 0 00-3-3h-5.379a.75.75 0 01-.53-.22L11.47 3.66A2.25 2.25 0 009.879 3H4.5a3 3 0 00-3 3v12a3 3 0 003 3h15zm-6.75-10.5a.75.75 0 00-1.5 0v2.25H9a.75.75 0 000 1.5h2.25v2.25a.75.75 0 001.5 0v-2.25H15a.75.75 0 000-1.5h-2.25V10.5z" clipRule="evenodd" />
              </svg>
              <h3 className="text-[14px] sm:text-[15px] font-bold uppercase tracking-wide text-white">Thể Loại Hot</h3>
            </div>
            <div className="flex flex-col gap-4">
              {hotGenres.map((genre, idx) => {
                const colorClass = genreColors[idx % genreColors.length];
                return (
                  <div
                    key={genre.id}
                    className="flex items-center gap-4 group"
                  >
                    <span className="text-sm font-bold text-white/40 w-4 text-center">{idx + 1}.</span>
                    <span className="shrink-0 flex items-center justify-center w-5">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-minus w-3.5 h-3.5 text-white/35 shrink-0" aria-hidden="true">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                    </span>
                    <Link
                      href={`/filter?category=${genre.slug}`}
                      className={`h-7 px-4 rounded-full flex items-center justify-center ${colorClass} shadow-lg shrink-0 transform group-hover:-translate-y-0.5 transition-all`}
                    >
                      <span className="text-xs font-bold whitespace-nowrap">{genre.name}</span>
                    </Link>
                  </div>
                );
              })}
              {hotGenres.length === 0 && (
                <div className="text-zinc-650 text-xs py-2">Không có dữ liệu.</div>
              )}
            </div>
            <Link href="/chu-de" className="inline-block mt-5 text-xs font-medium text-white/40 hover:text-white transition-colors">
              Xem thêm
            </Link>
          </div>

        </div>
      </div>
    </section>
  );
}
