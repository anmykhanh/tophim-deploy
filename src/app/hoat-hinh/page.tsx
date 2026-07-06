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
    year?: string;
    sort?: string;
    page?: string;
  }>;
}

export default async function HoatHinhPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const search = params.search || '';
  const categoryId = params.category ? parseInt(params.category, 10) : undefined;
  const countryId = params.country ? parseInt(params.country, 10) : undefined;
  const year = params.year ? parseInt(params.year, 10) : undefined;
  const sort = params.sort || '';
  const page = params.page ? parseInt(params.page, 10) : 1;
  const limit = 16;
  const skip = (page - 1) * limit;

  // Build query
  const whereClause: any = {
    type: 'hoathinh'
  };
  
  if (search) {
    whereClause.OR = [
      { title: { contains: search } },
      { original_title: { contains: search } },
      { description: { contains: search } }
    ];
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
  let pageTitle = 'Hoạt Hình';
  if (currentCategory) {
    pageTitle = `Hoạt Hình - ${currentCategory.name}`;
  } else if (search) {
    pageTitle = `Hoạt Hình - Tìm kiếm: "${search}"`;
  }

  // Build helper to generate links keeping other filters
  const getFilterUrl = (newParams: Record<string, string | number | undefined>) => {
    const combined = {
      search: search || undefined,
      category: categoryId || undefined,
      year: year || undefined,
      sort: sort || undefined,
      page: 1, // Reset page when filtering
      ...newParams
    };
    const query = Object.entries(combined)
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
      .join('&');
    return `/hoat-hinh?${query}`;
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
            year: year ? String(year) : '',
            sort,
            search
          }}
          basePath="/hoat-hinh"
          hideTypeFilter={true}
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
            basePath="/hoat-hinh"
            currentFilters={{
              search: search || undefined,
              category: categoryId || undefined,
              country: countryId || undefined,
              year: year || undefined,
              sort: sort || undefined,
            }}
          />
        )}

      </div>
    </div>
  );
}
