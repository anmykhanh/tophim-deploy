'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface PaginationPanelProps {
  currentPage: number;
  totalPages: number;
  basePath: string;
  currentFilters: Record<string, any>;
}

export default function PaginationPanel({
  currentPage,
  totalPages,
  basePath,
  currentFilters,
}: PaginationPanelProps) {
  const router = useRouter();
  const [inputVal, setInputVal] = useState(String(currentPage));

  useEffect(() => {
    setInputVal(String(currentPage));
  }, [currentPage]);

  const navigateToPage = (p: number) => {
    if (p < 1 || p > totalPages) return;
    const combined = { ...currentFilters, page: p };
    const query = Object.entries(combined)
      .filter(([_, v]) => v !== undefined && String(v) !== '')
      .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
      .join('&');
    router.push(`${basePath}${query ? `?${query}` : ''}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const p = parseInt(inputVal, 10);
      if (!isNaN(p) && p >= 1 && p <= totalPages) {
        navigateToPage(p);
      } else {
        setInputVal(String(currentPage));
      }
    }
  };

  const handleBlur = () => {
    const p = parseInt(inputVal, 10);
    if (!isNaN(p) && p >= 1 && p <= totalPages) {
      navigateToPage(p);
    } else {
      setInputVal(String(currentPage));
    }
  };

  return (
    <div className="flex items-center justify-center gap-3 md:gap-4 mt-12 mb-8">
      {/* Nút lùi trang */}
      {currentPage > 1 ? (
        <button
          onClick={() => navigateToPage(currentPage - 1)}
          className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-colors bg-[#27293E] hover:bg-[#31344E] text-white shadow-lg focus:outline-none"
        >
          <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      ) : (
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-colors bg-[#27293E] text-[#8A8D9F] opacity-70 cursor-not-allowed select-none">
          <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
        </div>
      )}

      {/* Pill chọn trang */}
      <div className="h-10 md:h-12 rounded-full bg-[#27293E] px-5 md:px-6 shadow-lg flex items-center gap-2 md:gap-3 text-white transition-colors">
        <span className="font-medium text-[14px] md:text-[15px] select-none">Trang</span>
        <input
          type="number"
          min={1}
          max={totalPages}
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className="h-7 md:h-8 w-10 md:w-12 rounded-md bg-transparent border border-white/20 flex items-center justify-center text-center font-semibold text-[14px] md:text-[15px] focus:outline-none focus:border-white focus:bg-white/5 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <span className="font-medium text-[14px] md:text-[15px] text-white/90 select-none">/ {totalPages}</span>
      </div>

      {/* Nút tiến trang */}
      {currentPage < totalPages ? (
        <button
          onClick={() => navigateToPage(currentPage + 1)}
          className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-colors bg-[#27293E] hover:bg-[#31344E] text-white shadow-lg focus:outline-none"
        >
          <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      ) : (
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-colors bg-[#27293E] text-[#8A8D9F] opacity-70 cursor-not-allowed select-none">
          <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      )}
    </div>
  );
}
