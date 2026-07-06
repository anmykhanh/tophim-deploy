'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface FilterPanelProps {
  genres: Category[];
  countries: Category[];
  currentFilters: {
    category?: string;
    country?: string;
    type?: string;
    year?: string;
    sort?: string;
    language?: string;
    search?: string;
  };
  basePath: string;
  hideTypeFilter?: boolean;
}

export default function FilterPanel({
  genres,
  countries,
  currentFilters,
  basePath,
  hideTypeFilter = false,
}: FilterPanelProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  // States for filter selection
  const [selectedCategory, setSelectedCategory] = useState(currentFilters.category || '');
  const [selectedCountry, setSelectedCountry] = useState(currentFilters.country || '');
  const [selectedType, setSelectedType] = useState(currentFilters.type || '');
  const [selectedYear, setSelectedYear] = useState(currentFilters.year || '');
  const [selectedSort, setSelectedSort] = useState(currentFilters.sort || '');
  const [selectedLanguage, setSelectedLanguage] = useState(currentFilters.language || '');

  // Only display up to 23 countries/genres to keep UI clean and matching design
  const displayedCountries = countries.slice(0, 23);
  const displayedGenres = genres.slice(0, 23);

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    const queryParams: Record<string, string> = {};

    if (currentFilters.search) queryParams.search = currentFilters.search;
    if (selectedCategory) queryParams.category = selectedCategory;
    if (selectedCountry) queryParams.country = selectedCountry;
    if (selectedType && !hideTypeFilter) queryParams.type = selectedType;
    if (selectedYear) queryParams.year = selectedYear;
    if (selectedSort) queryParams.sort = selectedSort;
    if (selectedLanguage) queryParams.language = selectedLanguage;

    const queryString = new URLSearchParams(queryParams).toString();
    router.push(`${basePath}${queryString ? `?${queryString}` : ''}`);
    setIsOpen(false);
  };

  const handleClearFilters = () => {
    setSelectedCategory('');
    setSelectedCountry('');
    setSelectedType('');
    setSelectedYear('');
    setSelectedSort('');
    router.push(basePath);
    setIsOpen(false);
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 7 }, (_, i) => String(currentYear - i));

  return (
    <div className="mb-8 font-sans text-left">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-[15px] font-semibold text-white/95 hover:text-white transition-colors mb-4 focus:outline-none"
      >
        <svg
          className={`w-4 h-4 transition-transform duration-300 text-[#FFD166] ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
          />
        </svg>
        <span className="text-[#FFD166]">Bộ lọc</span>
      </button>

      {isOpen && (
        <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-4 md:p-6 text-sm animate-in fade-in slide-in-from-top-4 shadow-2xl overflow-hidden">
          <form onSubmit={handleApplyFilters} className="space-y-4 md:space-y-6">

            {/* Quốc gia */}
            <div className="flex flex-col md:flex-row md:items-start gap-2 md:gap-4 border-b border-white/5 border-dashed pb-4">
              <span className="text-white/90 font-medium md:w-32 shrink-0 md:pt-1 text-sm mb-1 md:mb-0">Quốc gia:</span>
              <div className="grid grid-cols-3 gap-y-4 gap-x-2 w-full md:flex md:flex-wrap md:gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCountry('')}
                  className={`px-3 py-1 rounded-md transition-all text-[13px] md:text-sm whitespace-nowrap ${selectedCountry === ''
                    ? 'border border-white/40 text-[#FFD166] bg-transparent'
                    : 'text-zinc-400 hover:text-[#FFD166] border border-transparent'
                    }`}
                >
                  Tất cả
                </button>
                {displayedCountries.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCountry(String(c.id))}
                    className={`px-3 py-1 rounded-md transition-all text-[13px] md:text-sm whitespace-nowrap ${selectedCountry === String(c.id)
                      ? 'border border-white/40 text-[#FFD166] bg-transparent'
                      : 'text-zinc-400 hover:text-[#FFD166] border border-transparent'
                      }`}
                  >
                    {c.name.replace('&#039;', "'")}
                  </button>
                ))}
              </div>
            </div>

            {/* Loại phim */}
            {!hideTypeFilter && (
              <div className="flex flex-col md:flex-row md:items-start gap-2 md:gap-4 border-b border-white/5 border-dashed pb-4">
                <span className="text-white/90 font-medium md:w-32 shrink-0 md:pt-1 text-sm mb-1 md:mb-0">Loại phim:</span>
                <div className="grid grid-cols-3 gap-y-4 gap-x-2 w-full md:flex md:flex-wrap md:gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedType('')}
                    className={`px-3 py-1 rounded-md transition-all text-[13px] md:text-sm whitespace-nowrap ${selectedType === ''
                      ? 'border border-white/40 text-[#FFD166] bg-transparent'
                      : 'text-zinc-400 hover:text-[#FFD166] border border-transparent'
                      }`}
                  >
                    Tất cả
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedType('phimle')}
                    className={`px-3 py-1 rounded-md transition-all text-[13px] md:text-sm whitespace-nowrap ${selectedType === 'phimle'
                      ? 'border border-white/40 text-[#FFD166] bg-transparent'
                      : 'text-zinc-400 hover:text-[#FFD166] border border-transparent'
                      }`}
                  >
                    Phim lẻ
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedType('phimbo')}
                    className={`px-3 py-1 rounded-md transition-all text-[13px] md:text-sm whitespace-nowrap ${selectedType === 'phimbo'
                      ? 'border border-white/40 text-[#FFD166] bg-transparent'
                      : 'text-zinc-400 hover:text-[#FFD166] border border-transparent'
                      }`}
                  >
                    Phim bộ
                  </button>
                </div>
              </div>
            )}

            {/* Thể loại */}
            <div className="flex flex-col md:flex-row md:items-start gap-2 md:gap-4 border-b border-white/5 border-dashed pb-4">
              <div className="md:w-32 shrink-0 flex items-center gap-2 md:pt-1 mb-1 md:mb-0">
                <span className="text-white/90 font-medium text-sm">Thể loại:</span>
              </div>
              <div className="grid grid-cols-3 gap-y-4 gap-x-2 w-full md:flex md:flex-wrap md:gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('')}
                  className={`px-3 py-1 rounded-md transition-all text-[13px] md:text-sm whitespace-nowrap ${selectedCategory === ''
                    ? 'border border-white/40 text-[#FFD166] bg-transparent'
                    : 'text-zinc-400 hover:text-[#FFD166] border border-transparent'
                    }`}
                >
                  Tất cả
                </button>
                {displayedGenres.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setSelectedCategory(String(g.id))}
                    className={`px-3 py-1 rounded-md transition-all text-[13px] md:text-sm whitespace-nowrap ${selectedCategory === String(g.id)
                      ? 'border border-[#FFD166]/50 text-[#FFD166] bg-[#FFD166]/10'
                      : 'text-zinc-400 hover:text-white border border-transparent'
                      }`}
                  >
                    {selectedCategory === String(g.id) && (
                      <span className="text-[#FFD166] mr-1.5 font-bold">✓</span>
                    )}
                    {g.name.replace('&#039;', "'")}
                  </button>
                ))}
              </div>
            </div>

            {/* Ngôn ngữ */}
            <div className="flex flex-col md:flex-row md:items-start gap-2 md:gap-4 border-b border-white/5 border-dashed pb-4">
              <span className="text-white/90 font-medium md:w-32 shrink-0 md:pt-1 text-sm mb-1 md:mb-0">Ngôn ngữ:</span>
              <div className="grid grid-cols-3 gap-y-4 gap-x-2 w-full md:flex md:flex-wrap md:gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedLanguage('')}
                  className={`px-3 py-1 rounded-md transition-all text-[13px] md:text-sm whitespace-nowrap ${selectedLanguage === ''
                    ? 'border border-white/40 text-[#FFD166] bg-transparent'
                    : 'text-zinc-400 hover:text-[#FFD166] border border-transparent'
                    }`}
                >
                  Tất cả
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedLanguage('phude')}
                  className={`px-3 py-1 rounded-md transition-all text-[13px] md:text-sm whitespace-nowrap ${selectedLanguage === 'phude'
                    ? 'border border-white/40 text-[#FFD166] bg-transparent'
                    : 'text-zinc-400 hover:text-[#FFD166] border border-transparent'
                    }`}
                >
                  Phụ đề
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedLanguage('thuyetminh')}
                  className={`px-3 py-1 rounded-md transition-all text-[13px] md:text-sm whitespace-nowrap ${selectedLanguage === 'thuyetminh'
                    ? 'border border-white/40 text-[#FFD166] bg-transparent'
                    : 'text-zinc-400 hover:text-[#FFD166] border border-transparent'
                    }`}
                >
                  Thuyết minh
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedLanguage('longtieng')}
                  className={`px-3 py-1 rounded-md transition-all text-[13px] md:text-sm whitespace-nowrap ${selectedLanguage === 'longtieng'
                    ? 'border border-white/40 text-[#FFD166] bg-transparent'
                    : 'text-zinc-400 hover:text-[#FFD166] border border-transparent'
                    }`}
                >
                  Lồng tiếng
                </button>
              </div>
            </div>

            {/* Năm sản xuất */}
            <div className="flex flex-col md:flex-row md:items-start gap-2 md:gap-4 border-b border-white/5 border-dashed pb-4">
              <span className="text-white/90 font-medium md:w-32 shrink-0 md:pt-1 text-sm mb-1 md:mb-0">Năm sản xuất:</span>
              <div className="grid grid-cols-3 gap-y-4 gap-x-2 w-full md:flex md:flex-wrap md:gap-2 md:items-center">
                <button
                  type="button"
                  onClick={() => setSelectedYear('')}
                  className={`px-3 py-1 rounded-md transition-all text-[13px] md:text-sm whitespace-nowrap ${selectedYear === ''
                    ? 'border border-white/40 text-[#FFD166] bg-transparent'
                    : 'text-zinc-400 hover:text-[#FFD166] border border-transparent'
                    }`}
                >
                  Tất cả
                </button>
                {years.map((y) => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => setSelectedYear(y)}
                    className={`px-3 py-1 rounded-md transition-all text-[13px] md:text-sm whitespace-nowrap ${selectedYear === y
                      ? 'border border-white/40 text-[#FFD166] bg-transparent'
                      : 'text-zinc-400 hover:text-[#FFD166] border border-transparent'
                      }`}
                  >
                    {y}
                  </button>
                ))}

                <div className="relative flex-none">
                  <svg
                    className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <input
                    placeholder="Nhập năm"
                    className="bg-white/5 border border-white/10 rounded-full py-1 pl-9 pr-4 w-full md:w-32 focus:outline-none focus:border-white/40 focus:bg-white/10 text-white placeholder-white/30 transition-all text-sm"
                    type="number"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Sắp xếp */}
            <div className="flex flex-col md:flex-row md:items-start gap-2 md:gap-4 border-b border-white/5 border-dashed pb-4">
              <span className="text-white/90 font-medium md:w-32 shrink-0 md:pt-1 text-sm mb-1 md:mb-0">Sắp xếp:</span>
              <div className="grid grid-cols-3 gap-y-4 gap-x-2 w-full md:flex md:flex-wrap md:gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedSort('new')}
                  className={`px-3 py-1 rounded-md transition-all text-[13px] md:text-sm whitespace-nowrap ${(selectedSort === '' || selectedSort === 'new')
                    ? 'border border-white/40 text-[#FFD166] bg-transparent'
                    : 'text-zinc-400 hover:text-[#FFD166] border border-transparent'
                    }`}
                >
                  Mới cập nhật
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSort('views')}
                  className={`px-3 py-1 rounded-md transition-all text-[13px] md:text-sm whitespace-nowrap ${selectedSort === 'views'
                    ? 'border border-white/40 text-[#FFD166] bg-transparent'
                    : 'text-zinc-400 hover:text-[#FFD166] border border-transparent'
                    }`}
                >
                  Xem nhiều nhất
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 md:gap-4 mt-8 pt-6">
              <button
                type="submit"
                className="bg-[#FFD166] bg-gradient-to-r from-[#FFD166] to-[#ffb347] text-[#1c1c1c] hover:opacity-90 font-bold py-2.5 px-6 rounded-full transition-all flex items-center justify-center gap-2 flex-1 md:flex-none active:scale-[0.98]"
              >
                Lọc kết quả
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="bg-transparent border border-white/10 hover:bg-white/5 text-white/50 hover:text-white font-medium py-2.5 px-6 rounded-full transition-colors flex-1 md:flex-none"
              >
                Đóng
              </button>
            </div>

          </form>
        </div>
      )}
    </div>
  );
}
