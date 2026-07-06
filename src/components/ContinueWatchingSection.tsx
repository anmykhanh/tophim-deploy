'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';

interface ContinueWatchingItem {
  id: number; // Movie ID
  title: string;
  slug: string;
  original_title: string | null;
  imageUrl: string;
  episode_id: number | null;
  episode_name: string;
  watch_time: number;
  duration: number;
  progressPercent: number;
}

interface ContinueWatchingSectionProps {
  initialItems: ContinueWatchingItem[];
}

export default function ContinueWatchingSection({ initialItems }: ContinueWatchingSectionProps) {
  const [items, setItems] = useState<ContinueWatchingItem[]>(initialItems);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Drag-to-scroll state
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftVal, setScrollLeftVal] = useState(0);

  if (items.length === 0) return null;

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

  // Drag-to-scroll handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeftVal(scrollContainerRef.current.scrollLeft);
  };

  const handleMouseLeaveOrUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5; // Drag speed multiplier
    scrollContainerRef.current.scrollLeft = scrollLeftVal - walk;
  };

  // Remove from watch history
  const handleRemove = async (e: React.MouseEvent, movieId: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Bạn có chắc chắn muốn xóa phim này khỏi danh sách Xem Tiếp?')) return;

    try {
      const res = await fetch('/api/user/watch-history', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movieId }),
      });
      if (res.ok) {
        setItems((prev) => prev.filter((item) => item.id !== movieId));
      } else {
        alert('Có lỗi xảy ra khi xóa phim khỏi danh sách.');
      }
    } catch (err) {
      console.error('Error removing from watch history:', err);
      alert('Không thể kết nối đến máy chủ.');
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds) return '0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <section className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          Xem Tiếp
        </h2>
      </div>
      <div className="relative group/slider">
        {/* Left Arrow */}
        <button
          onClick={scrollLeft}
          className="absolute left-2 top-[40%] -translate-y-1/2 z-20 w-8 h-8 md:w-10 md:h-10 bg-white/90 text-zinc-950 hover:scale-110 shadow-xl rounded-full items-center justify-center transition-all opacity-0 group-hover/slider:opacity-100 hidden md:flex cursor-pointer"
          aria-label="Cuộn trái"
        >
          <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Right Arrow */}
        <button
          onClick={scrollRight}
          className="absolute right-2 top-[40%] -translate-y-1/2 z-20 w-8 h-8 md:w-10 md:h-10 bg-white/90 text-zinc-950 hover:scale-110 shadow-xl rounded-full items-center justify-center transition-all opacity-0 group-hover/slider:opacity-100 hidden md:flex cursor-pointer"
          aria-label="Cuộn phải"
        >
          <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Slider Container */}
        <div
          ref={scrollContainerRef}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeaveOrUp}
          onMouseUp={handleMouseLeaveOrUp}
          onMouseMove={handleMouseMove}
          className={`scroll-container flex gap-2 md:gap-3 overflow-x-auto pb-4 select-none ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          } [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]`}
        >
          {items.map((item) => {
            const watchLink = item.episode_id
              ? `/xem/${item.slug}?ep=${item.episode_id}`
              : `/xem/${item.slug}`;

            return (
              <div
                key={item.id}
                className="shrink-0 w-[130px] sm:w-[185px] relative group pointer-events-auto bg-transparent"
              >
                <div className="relative">
                  <Link href={watchLink} draggable={false} className="block">
                    <div className="relative flex items-center justify-center overflow-hidden rounded-2xl aspect-[2/3] bg-zinc-900/60 mb-3 border border-white/5 shadow-lg group-hover:border-white/10 transition-colors">
                      <svg
                        className="absolute w-10 h-10 text-white/10"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.5"
                          d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
                        />
                      </svg>
                      {item.imageUrl && (
                        <img
                          alt={item.title}
                          draggable={false}
                          loading="lazy"
                          className="object-cover pointer-events-none transition-opacity duration-300 absolute inset-0 w-full h-full"
                          src={item.imageUrl}
                        />
                      )}
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"></div>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-[85%] mx-auto h-[3px] rounded-full bg-white/10 mb-3 overflow-hidden">
                      <div
                        className="h-full bg-white/60"
                        style={{ width: `${item.progressPercent}%` }}
                      ></div>
                    </div>
                  </Link>

                  {/* Remove Button */}
                  <button
                    onClick={(e) => handleRemove(e, item.id)}
                    className="watch-remove-button absolute top-2 right-2 w-6 h-6 rounded-lg bg-white shadow-sm flex items-center justify-center transition-opacity opacity-0 group-hover:opacity-100 hover:bg-gray-100 z-20 cursor-pointer"
                    title="Xóa khỏi danh sách"
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
                      className="w-3.5 h-3.5 text-black"
                      aria-hidden="true"
                    >
                      <path d="M18 6 6 18"></path>
                      <path d="m6 6 12 12"></path>
                    </svg>
                  </button>

                  {/* Details */}
                  <div className="flex flex-col">
                    <p className="text-[11px] sm:text-[12px] text-white/50 mb-1.5 flex items-center justify-center gap-1 font-medium tracking-wide">
                      <span>{item.episode_name || 'Tập 1'}</span>
                      <span className="w-1 h-1 bg-white/30 rounded-full"></span>
                      <span>
                        {formatTime(item.watch_time)} <span className="text-white/20">/</span>{' '}
                        {formatTime(item.duration)}
                      </span>
                    </p>
                    <h3 className="text-[13px] sm:text-[14px] font-semibold text-white/90 line-clamp-1 group-hover:text-white transition-colors text-center px-1 tracking-wide">
                      <Link href={watchLink} className="hover:underline underline-offset-2">
                        {item.title}
                      </Link>
                    </h3>
                    {item.original_title && (
                      <p className="text-[11px] sm:text-[12px] text-white/40 mt-1 line-clamp-1 text-center px-1 font-medium tracking-wide">
                        {item.original_title}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
