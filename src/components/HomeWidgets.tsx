'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Calendar, TrendingUp, Star, Play, Flame } from 'lucide-react';
import { getPosterUrl, getProxyImageUrl } from '@/lib/image';

interface HomeWidgetsProps {
  trendingMovies: any[];
  upcomingMovies: any[];
}

export default function HomeWidgets({ trendingMovies, upcomingMovies }: HomeWidgetsProps) {
  const [activeDay, setActiveDay] = useState<number>(1); // Default to Monday for SSR

  useEffect(() => {
    setActiveDay(new Date().getDay() || 7);
  }, []);

  const days = [
    { label: 'Thứ 2', val: 1 },
    { label: 'Thứ 3', val: 2 },
    { label: 'Thứ 4', val: 3 },
    { label: 'Thứ 5', val: 4 },
    { label: 'Thứ 6', val: 5 },
    { label: 'Thứ 7', val: 6 },
    { label: 'Chủ Nhật', val: 7 }
  ];

  // Distribute trending movies to schedules mock-data for demo
  const scheduleMoviesByDay: Record<number, any[]> = {
    1: trendingMovies.slice(0, 3),
    2: trendingMovies.slice(1, 4),
    3: trendingMovies.slice(2, 5),
    4: trendingMovies.slice(3, 6),
    5: trendingMovies.slice(4, 7),
    6: trendingMovies.slice(5, 8),
    7: trendingMovies.slice(0, 4),
  };

  const currentSchedule = scheduleMoviesByDay[activeDay] || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start py-8 border-t border-zinc-900/50">
      
      {/* 1. Lịch Chiếu Phim Widget */}
      <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-zinc-800/80">
          <Calendar className="h-5 w-5 text-amber-400" />
          <h3 className="font-extrabold text-base text-white">Lịch Chiếu Phim</h3>
        </div>

        {/* Days selector tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
          {days.map((day) => {
            const isActive = activeDay === day.val;
            return (
              <button
                key={day.val}
                onClick={() => setActiveDay(day.val)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${isActive ? 'bg-amber-400 text-zinc-950' : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'}`}
              >
                {day.label}
              </button>
            );
          })}
        </div>

        {/* Schedule movie list */}
        <div className="space-y-2">
          {currentSchedule.length > 0 ? (
            currentSchedule.map((movie, idx) => (
              <Link
                key={movie.id}
                href={`/phim/${movie.slug}`}
                className="group flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/40 hover:bg-zinc-900 border border-zinc-900/30 hover:border-zinc-800 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-900 shrink-0">
                    <img
                      src={getProxyImageUrl(getPosterUrl(movie), 80)}
                      alt={movie.title}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <div className="text-left">
                    <h4 className="text-xs font-bold text-zinc-200 group-hover:text-amber-400 transition-colors line-clamp-1">
                      {movie.title}
                    </h4>
                    <p className="text-[10px] text-zinc-500 mt-0.5">
                      Phát sóng: 20:00 tối
                    </p>
                  </div>
                </div>
                <span className="text-[9px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded">
                  {movie.status || 'Tập mới'}
                </span>
              </Link>
            ))
          ) : (
            <p className="text-xs text-zinc-500 text-center py-6">Không có lịch chiếu hôm nay.</p>
          )}
        </div>
      </div>

      {/* 2. Bảng Xếp Hạng Tuần */}
      <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-zinc-800/80">
          <TrendingUp className="h-5 w-5 text-amber-400" />
          <h3 className="font-extrabold text-base text-white">Bảng Xếp Hạng Tuần</h3>
        </div>

        {/* Chart List */}
        <div className="space-y-3">
          {trendingMovies.slice(0, 5).map((movie, idx) => {
            const rank = idx + 1;
            const isTop3 = rank <= 3;
            return (
              <Link
                key={movie.id}
                href={`/phim/${movie.slug}`}
                className="group flex items-center justify-between p-2 rounded-xl bg-zinc-950/20 hover:bg-zinc-950/60 border border-transparent hover:border-zinc-800/50 transition-all"
              >
                <div className="flex items-center gap-3">
                  {/* Rank Badge */}
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${isTop3 ? 'bg-amber-400 text-zinc-950' : 'bg-zinc-800 text-zinc-400'}`}>
                    {rank}
                  </span>

                  <div className="w-10 h-14 rounded-lg overflow-hidden bg-zinc-900 shrink-0">
                    <img
                      src={getProxyImageUrl(getPosterUrl(movie), 80)}
                      alt={movie.title}
                      className="object-cover w-full h-full"
                    />
                  </div>

                  <div className="text-left">
                    <h4 className="text-xs font-bold text-zinc-200 group-hover:text-amber-400 transition-colors line-clamp-1">
                      {movie.title}
                    </h4>
                    <p className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0" />
                      <span>{movie.imdb_rating ? Number(movie.imdb_rating).toFixed(1) : '8.5'}</span>
                      <span className="text-zinc-700">|</span>
                      <span>{movie.views ? formatViews(movie.views) : '12K'} lượt xem</span>
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 3. Phim Sắp Chiếu Widget */}
      <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-zinc-800/80">
          <Flame className="h-5 w-5 text-amber-400" />
          <h3 className="font-extrabold text-base text-white">Phim Sắp Chiếu Hot</h3>
        </div>

        {/* Upcoming List */}
        <div className="space-y-3.5">
          {upcomingMovies.slice(0, 4).map((movie) => (
            <Link
              key={movie.id}
              href={`/phim/${movie.slug}`}
              className="group flex gap-3 text-left"
            >
              <div className="w-12 h-16 rounded-xl overflow-hidden bg-zinc-900 shrink-0 border border-zinc-850 shadow-md">
                <img
                  src={getProxyImageUrl(getPosterUrl(movie), 120)}
                  alt={movie.title}
                  className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h4 className="text-xs font-extrabold text-zinc-200 group-hover:text-amber-400 transition-colors truncate">
                  {movie.title}
                </h4>
                <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                  {movie.original_title || movie.title}
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="text-[9px] font-bold bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded border border-zinc-750">
                    Khởi chiếu {movie.year || '2026'}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}

function formatViews(views: number) {
  if (views >= 1000000) return (views / 1000000).toFixed(1) + 'M';
  if (views >= 1000) return (views / 1000).toFixed(1) + 'K';
  return views.toString();
}
