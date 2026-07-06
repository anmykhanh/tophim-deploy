'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { getProxyImageUrl, getPosterUrl } from '@/lib/image';

export default function SchedulePage() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [datesList, setDatesList] = useState<Date[]>([]);
  const [movies, setMovies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);

  // Generate 15 dates: 3 days before to 11 days after today
  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(today.getDate() - 3);

    const list = [];
    for (let i = 0; i <= 14; i++) {
      const cur = new Date(start);
      cur.setDate(start.getDate() + i);
      list.push(cur);
    }
    setDatesList(list);
    setSelectedDate(today);
  }, []);

  // Fetch movies when selectedDate changes
  useEffect(() => {
    if (!selectedDate) return;

    const fetchMovies = async () => {
      setLoading(true);
      try {
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        const dateQuery = `${year}-${month}-${day}`;

        const res = await fetch(`/api/schedule?date=${dateQuery}`);
        if (res.ok) {
          const data = await res.json();
          setMovies(data);
        }
      } catch (err) {
        console.error('Error fetching schedule movies:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMovies();

    // Scroll active tab to center
    if (activeTabRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [selectedDate]);

  const daysOfWeek = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

  const getDayLabel = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    if (checkDate.getTime() === today.getTime()) {
      return 'Hôm nay';
    }
    return daysOfWeek[date.getDay()];
  };

  const formatDateStr = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
  };

  const handleScrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const handleScrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  return (
    <main className="flex-1 pt-16">
      <div className="min-h-screen pt-20 md:pt-24 pb-16">
        <div className="max-w-[1400px] mx-auto px-4">
          
          <div className="flex items-center gap-3 mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-calendar-clock w-6 h-6 text-white/90" aria-hidden="true">
              <path d="M16 14v2.2l1.6 1"></path>
              <path d="M16 2v4"></path>
              <path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5"></path>
              <path d="M3 10h5"></path>
              <path d="M8 2v4"></path>
              <circle cx="16" cy="16" r="6"></circle>
            </svg>
            <h1 className="text-xl md:text-2xl font-bold text-white/90">Lịch chiếu</h1>
          </div>

          <div className="relative mb-8 flex items-stretch gap-2 h-[90px]">
            <button 
              type="button" 
              onClick={handleScrollLeft}
              className="hidden md:flex shrink-0 w-12 sm:w-16 items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.04] transition-all duration-300 rounded-lg opacity-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-left w-8 h-8" aria-hidden="true">
                <path d="m15 18-6-6 6-6"></path>
              </svg>
            </button>
            
            <div 
              ref={scrollContainerRef}
              className="relative flex gap-2 overflow-x-auto scrollbar-hide flex-1 select-none cursor-grab active:cursor-grabbing snap-x snap-mandatory" 
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <div className="flex min-w-full gap-2">
                {datesList.map((date, idx) => {
                  const isSelected = selectedDate && date.getDate() === selectedDate.getDate() && date.getMonth() === selectedDate.getMonth();
                  const dateStr = formatDateStr(date);
                  const dayLabel = getDayLabel(date);
                  
                  return (
                    <button
                      key={idx}
                      ref={isSelected ? activeTabRef : null}
                      type="button"
                      data-date-tab="true"
                      data-active={isSelected ? 'true' : 'false'}
                      onClick={() => setSelectedDate(date)}
                      className={`relative flex flex-col justify-center px-5 shrink-0 transition-all duration-300 w-[calc((100vw_-_48px)/3)] sm:w-[calc((100vw_-_56px)/4)] md:w-[calc((100%_-_48px)/7)] lg:w-[calc((100%_-_48px)/7)] min-w-[120px] max-w-[200px] snap-start ${
                        isSelected 
                          ? 'bg-white/[0.06] shadow-inner' 
                          : 'bg-white/[0.03] hover:bg-white/[0.045]'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#FFD166] shadow-[0_0_8px_rgba(255,209,102,0.4)]"></div>
                      )}
                      <span className="text-[12px] md:text-[13px] text-white/40 text-left mb-1 font-medium tracking-wide">
                        {dateStr}
                      </span>
                      <span className={`text-[14px] md:text-[15px] font-bold text-left tracking-tight ${isSelected ? 'text-[#FFD166]' : 'text-white/80 group-hover:text-white/90'}`}>
                        {dayLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button 
              type="button" 
              onClick={handleScrollRight}
              className="hidden md:flex shrink-0 w-12 sm:w-16 items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.04] transition-all duration-300 rounded-lg opacity-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right w-8 h-8" aria-hidden="true">
                <path d="m9 18 6-6-6-6"></path>
              </svg>
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-24">
              <div className="w-8 h-8 border-4 border-[#FFD166] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : movies.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {movies.map((movie: any) => {
                const eps = movie.eps_on_date || [];
                return (
                  <Link
                    key={movie.id}
                    href={`/phim/${movie.slug}`}
                    className="group flex items-center gap-4 p-3 rounded-xl bg-[#1b1d26] border border-white/[0.05] hover:border-[#FFD166]/80 hover:bg-[#232633] transition-all duration-200"
                  >
                    <div className="relative w-[60px] h-[85px] rounded-md overflow-hidden bg-white/5 shrink-0 shadow-md">
                      <img
                        alt={movie.title}
                        loading="lazy"
                        className="object-cover w-full h-full"
                        src={getProxyImageUrl(getPosterUrl(movie), 128)}
                      />
                    </div>
                    <div className="flex-1 min-w-0 py-1">
                      <h3 className="text-[14px] font-semibold text-white/90 group-hover:text-white transition-colors line-clamp-2 leading-snug mb-1.5">
                        {movie.title}
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {eps.length > 0 ? (
                          eps.map((epLabel: string, i: number) => (
                            <span key={i} className="text-[12px] text-white/50 font-medium px-2 py-0.5 rounded group-hover:text-white/70 transition-colors">
                              {epLabel.includes('Tập') ? epLabel : `Tập ${epLabel}`}
                            </span>
                          ))
                        ) : (
                          <span className="text-[12px] text-white/50 font-medium px-2 py-0.5 rounded group-hover:text-white/70 transition-colors">
                            {movie.quality}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-24 text-zinc-500 border border-dashed border-zinc-950 rounded-2xl">
              <p className="text-sm">Không có lịch chiếu nào cho ngày này.</p>
            </div>
          )}

        </div>
      </div>
    </main>
  );
}
