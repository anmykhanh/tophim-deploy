'use client';

import { usePathname } from 'next/navigation';

export default function Loading() {
  const pathname = usePathname();

  let loadingText = 'Đang tải...';
  if (pathname.includes('/movie-detail') || pathname.includes('/watch')) {
    loadingText = 'Đang tải phim...';
  } else if (pathname.includes('/filter') || pathname.includes('/dien-vien')) {
    loadingText = 'Đang tìm kiếm...';
  }

  return (
    <div className="w-full min-h-[70vh] flex flex-col items-center justify-center bg-transparent">
      <div className="flex flex-col items-center gap-4 py-12">
        {/* Spinning indicator */}
        <div className="relative w-16 h-16 flex items-center justify-center">
          {/* Pulsing glow ring */}
          <div className="absolute inset-0 rounded-full border-2 border-yellow-400/20 animate-ping opacity-75" />
          
          {/* Main rotating spinner */}
          <svg 
            className="animate-spin h-12 w-12 text-[#FFD166]" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="3.5"
            />
            <path 
              className="opacity-90" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
        
        {/* Muted Premium Text */}
        <p className="text-white/60 text-[13px] font-bold tracking-wider uppercase animate-pulse mt-2">
          {loadingText}
        </p>
      </div>
    </div>
  );
}
