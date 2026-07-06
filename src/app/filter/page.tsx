import Link from 'next/link';
import prisma from '@/lib/db';
import { getPosterUrl, getProxyImageUrl } from '@/lib/image';
import FilterPanel from '@/components/FilterPanel';
import PaginationPanel from '@/components/PaginationPanel';
import MovieGridClient from '@/components/MovieGridClient';

interface PageProps {
  searchParams: Promise<{
    search?: string;
    category?: string;
    country?: string;
    type?: string;
    year?: string;
    sort?: string;
    page?: string;
  }>;
}

function getEpisodeBadges(movie: any) {
  const episodes = movie.episodes || [];
  if (episodes.length > 0) {
    const subEpisodes = episodes.filter((ep: any) => 
      ep.server_name.toLowerCase().includes('sub') || 
      ep.server_name.toLowerCase().includes('phụ đề') ||
      !ep.server_name.toLowerCase().includes('thuyết minh')
    );
    const dubEpisodes = episodes.filter((ep: any) => 
      ep.server_name.toLowerCase().includes('thuyết minh') || 
      ep.server_name.toLowerCase().includes('lồng tiếng')
    );

    const badges = [];
    if (subEpisodes.length > 0) {
      const maxEp = Math.max(...subEpisodes.map((ep: any) => {
        const match = ep.name.match(/\d+/);
        return match ? parseInt(match[0], 10) : 1;
      }), subEpisodes.length);
      badges.push({ label: 'PĐ.', count: maxEp, bg: 'bg-[#5E6070]/95' });
    }
    if (dubEpisodes.length > 0) {
      const maxEp = Math.max(...dubEpisodes.map((ep: any) => {
        const match = ep.name.match(/\d+/);
        return match ? parseInt(match[0], 10) : 1;
      }), dubEpisodes.length);
      badges.push({ label: 'TM.', count: maxEp, bg: 'bg-[#2CA35D]/95' });
    }

    if (badges.length > 0) return badges;
  }

  // Fallback parsing movie.status or language
  const badges = [];
  const status = (movie.status || '').toLowerCase();
  const language = (movie.language || '').toLowerCase();

  const epMatch = status.match(/tập\s+(\d+)/i) || status.match(/(\d+)\/(\d+)/) || status.match(/(\d+)/);
  const count = epMatch ? parseInt(epMatch[1], 10) : null;

  if (count !== null) {
    if (status.includes('thuyết minh') || language.includes('thuyết minh')) {
      badges.push({ label: 'TM.', count, bg: 'bg-[#2CA35D]/95' });
    } else {
      badges.push({ label: 'PĐ.', count, bg: 'bg-[#5E6070]/95' });
    }
  } else {
    badges.push({ label: movie.quality || 'HD', count: null, bg: 'bg-[#5E6070]/95' });
  }
  return badges;
}

export default async function FilterPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const search = params.search || '';
  const categoryId = params.category ? parseInt(params.category, 10) : undefined;
  const countryId = params.country ? parseInt(params.country, 10) : undefined;
  const type = params.type || '';
  const year = params.year ? parseInt(params.year, 10) : undefined;
  const sort = params.sort || '';
  const page = params.page ? parseInt(params.page, 10) : 1;
  const limit = 16;
  const skip = (page - 1) * limit;

  // Build query
  const whereClause: any = {};
  if (search) {
    whereClause.OR = [
      { title: { contains: search } },
      { original_title: { contains: search } },
      { description: { contains: search } }
    ];
  }
  if (type) {
    whereClause.type = type;
  }
  if (year && !isNaN(year)) {
    whereClause.year = year;
  }
  if (categoryId || countryId) {
    const categoryFilters = [];
    if (categoryId && !isNaN(categoryId)) {
      categoryFilters.push({ category_id: categoryId });
    }
    if (countryId && !isNaN(countryId)) {
      categoryFilters.push({ category_id: countryId });
    }

    if (categoryFilters.length === 1) {
      whereClause.movie_category = {
        some: categoryFilters[0]
      };
    } else if (categoryFilters.length > 1) {
      whereClause.AND = categoryFilters.map(f => ({
        movie_category: {
          some: f
        }
      }));
    }
  }

  const totalCount = await prisma.movies.count({ where: whereClause });
  const totalPages = Math.ceil(totalCount / limit) || 1;

  // Sort logic
  let orderByClause: any = { updated_at: 'desc' };
  if (sort === 'views') {
    orderByClause = { views: 'desc' };
  } else if (sort === 'new') {
    orderByClause = [ { year: 'desc' }, { created_at: 'desc' } ];
  }

  const rawMovies = await prisma.movies.findMany({
    where: whereClause,
    include: {
      episodes: true
    },
    orderBy: orderByClause,
    skip,
    take: limit
  });
  const movies = JSON.parse(JSON.stringify(rawMovies));

  const genres = await prisma.categories.findMany({
    where: { type: 'genre', status: true },
    orderBy: { order_num: 'asc' }
  });

  const countries = await prisma.categories.findMany({
    where: { type: 'country', status: true },
    orderBy: { order_num: 'asc' }
  });

  const currentCategory = categoryId 
    ? [...genres, ...countries].find(c => c.id === categoryId)
    : null;

  // Compute title
  let pageTitle = 'Tất cả phim';
  if (type === 'phimbo') pageTitle = 'Phim Bộ';
  else if (type === 'phimle') pageTitle = 'Phim Lẻ';
  else if (type === 'hoathinh') pageTitle = 'Hoạt Hình';
  else if (currentCategory) pageTitle = currentCategory.name;
  else if (search) pageTitle = `Kết quả tìm kiếm: "${search}"`;

  // Build helper to generate links keeping other filters
  const getFilterUrl = (newParams: Record<string, string | number | undefined>) => {
    const combined = {
      search: search || undefined,
      category: categoryId || undefined,
      type: type || undefined,
      year: year || undefined,
      sort: sort || undefined,
      page: 1, // Reset page when filtering
      ...newParams
    };
    const query = Object.entries(combined)
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
      .join('&');
    return `/filter?${query}`;
  };

  const getPageUrl = (pageNumber: number) => {
    return getFilterUrl({ page: pageNumber });
  };

  return (
    <div className="w-full bg-[#0a0a0f] text-white min-h-screen pt-[90px] lg:pt-[110px]">
      <div className="max-w-[1400px] mx-auto px-4 py-8">
        
        {/* Header Title */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-white flex items-center gap-2 text-xl sm:text-2xl text-left">
            {pageTitle}
          </h2>
        </div>

        {/* Filter Panel Component */}
        <FilterPanel
          genres={genres}
          countries={countries}
          currentFilters={{
            category: categoryId ? String(categoryId) : '',
            country: countryId ? String(countryId) : '',
            type,
            year: year ? String(year) : '',
            sort,
            search
          }}
          basePath="/filter"
        />

        {/* Movies Grid */}
        {movies.length > 0 ? (
          <MovieGridClient movies={movies} />
        ) : (
          <div className="text-center py-24 text-zinc-500 border border-dashed border-zinc-900 rounded-2xl">
            <h3 className="font-bold text-base text-zinc-300">Không tìm thấy kết quả</h3>
            <p className="text-xs mt-1">Vui lòng thử lại với bộ lọc khác.</p>
          </div>
        )}

        {/* Footer Pagination */}
        {totalPages > 1 && (
          <PaginationPanel
            currentPage={page}
            totalPages={totalPages}
            basePath="/filter"
            currentFilters={{
              search: search || undefined,
              category: categoryId || undefined,
              country: countryId || undefined,
              type: type || undefined,
              year: year || undefined,
              sort: sort || undefined,
            }}
          />
        )}

      </div>
    </div>
  );
}
