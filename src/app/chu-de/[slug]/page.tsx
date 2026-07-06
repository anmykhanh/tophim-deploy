import { notFound } from 'next/navigation';
import Link from 'next/link';
import prisma from '@/lib/db';
import MovieGridClient from '@/components/MovieGridClient';
import FilterPanel from '@/components/FilterPanel';
import PaginationPanel from '@/components/PaginationPanel';
import { getCollectionTheme } from '@/lib/theme';
import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const category = await prisma.categories.findFirst({ where: { slug, type: 'collection' } });
  if (!category) return {};

  const title = `Chủ đề ${category.name} - Tải đị Phim Online | Tô Phim`;
  const description = category.description
    ? category.description.substring(0, 160)
    : `Khám phá bộ sưu tập phim ${category.name} chất lượng cao tại Tô Phim.`;

  return {
    title,
    description,
    openGraph: { title, description, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    page?: string;
    category?: string;
    country?: string;
    type?: string;
    year?: string;
    sort?: string;
    language?: string;
  }>;
}

export default async function TopicDetailPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const slug = resolvedParams.slug;

  const page = resolvedSearchParams.page ? parseInt(resolvedSearchParams.page, 10) : 1;
  const categoryId = resolvedSearchParams.category ? parseInt(resolvedSearchParams.category, 10) : undefined;
  const countryId = resolvedSearchParams.country ? parseInt(resolvedSearchParams.country, 10) : undefined;
  const typeFilter = resolvedSearchParams.type || undefined;
  const year = resolvedSearchParams.year ? parseInt(resolvedSearchParams.year, 10) : undefined;
  const sort = resolvedSearchParams.sort || '';
  const language = resolvedSearchParams.language || '';

  // Query category details
  const category = await prisma.categories.findFirst({
    where: {
      slug,
      type: 'collection'
    }
  });

  if (!category) {
    notFound();
  }

  // Build query
  const whereClause: any = {
    movie_category: {
      some: { category_id: category.id }
    }
  };

  if (typeFilter && ['phimle', 'phimbo'].includes(typeFilter)) {
    whereClause.type = typeFilter;
  }
  if (year && !isNaN(year)) {
    whereClause.year = year;
  }

  if (language) {
    const langCondition: any = [];
    if (language === 'phude') {
      langCondition.push({ language: { contains: 'phụ đề' } }, { language: { contains: 'vietsub' } }, { episodes: { some: { server_name: { contains: 'phụ đề' } } } }, { episodes: { some: { server_name: { contains: 'sub' } } } });
    } else if (language === 'thuyetminh') {
      langCondition.push({ language: { contains: 'thuyết minh' } }, { episodes: { some: { server_name: { contains: 'thuyết minh' } } } });
    } else if (language === 'longtieng') {
      langCondition.push({ language: { contains: 'lồng tiếng' } }, { episodes: { some: { server_name: { contains: 'lồng tiếng' } } } });
    }
    if (langCondition.length > 0) {
      if (!whereClause.AND) whereClause.AND = [];
      whereClause.AND.push({ OR: langCondition });
    }
  }

  if (categoryId || countryId) {
    const categoryFilters = [{ category_id: category.id }];
    if (categoryId && !isNaN(categoryId)) {
      categoryFilters.push({ category_id: categoryId });
    }
    if (countryId && !isNaN(countryId)) {
      categoryFilters.push({ category_id: countryId });
    }

    if (!whereClause.AND) whereClause.AND = [];
    whereClause.AND.push(...categoryFilters.map(f => ({
      movie_category: {
        some: f
      }
    })));
    delete whereClause.movie_category; // Replaced by AND
  }

  // Count total movies in this collection
  const totalCount = await prisma.movies.count({
    where: whereClause
  });

  const limit = 24;
  const totalPages = Math.ceil(totalCount / limit) || 1;
  const skip = (page - 1) * limit;

  // Sort logic
  let orderByClause: any = { updated_at: 'desc' };
  if (sort === 'views') {
    orderByClause = { views: 'desc' };
  } else if (sort === 'new') {
    orderByClause = [{ year: 'desc' }, { created_at: 'desc' }];
  }

  // Fetch paginated movies in this category/collection
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

  const theme = getCollectionTheme(category.slug, category.name);

  // Fetch genres and countries for the filter panel
  const genres = await prisma.categories.findMany({
    where: { type: 'genre', status: true },
    orderBy: { order_num: 'asc' }
  });

  const countries = await prisma.categories.findMany({
    where: { type: 'country', status: true },
    orderBy: { order_num: 'asc' }
  });

  return (
    <div className="w-full bg-[#0a0a0f] text-white min-h-screen">

      {/* Hero Banner Section */}
      <div
        className="w-full pt-[120px] pb-12 border-b border-white/5 relative overflow-hidden"
        style={{ background: theme.gradient }}
      >
        {/* Decorative background shapes mimicking the card details for seamless continuity */}
        <div className={`absolute -left-[10%] -top-[30%] h-[180%] w-[50%] rounded-full opacity-35 blur-3xl ${theme.shape}`} />
        <div className="absolute -bottom-[20%] right-[-10%] h-[150%] w-[40%] rounded-full bg-black/20 blur-2xl" />

        {/* Decorative Radial fade */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent pointer-events-none z-0" />

        <div className="max-w-[1400px] mx-auto px-4 relative z-10 flex items-center justify-between gap-8">
          <div className="flex-1 min-w-0 pr-12 md:pr-64">
            <Link
              href="/chu-de"
              className="inline-flex items-center gap-2 text-sm text-zinc-300 hover:text-white transition-colors mb-4 group"
            >
              <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Tất cả chủ đề
            </Link>

            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-4 leading-tight">
              Chủ đề <span style={{ color: theme.text }}>{category.name}</span>
            </h1>
            {category.description && (
              <p className="text-zinc-300 md:text-lg max-w-2xl leading-relaxed mb-6 font-medium">
                {category.description}
              </p>
            )}

            {/* Filter Panel */}
            <div className="w-full max-w-[1000px] mt-4 relative z-20 bg-[#161722]/50 p-4 rounded-xl border border-white/5 shadow-2xl backdrop-blur-xl">
              <FilterPanel
                genres={genres}
                countries={countries}
                currentFilters={{
                  category: categoryId?.toString(),
                  country: countryId?.toString(),
                  type: typeFilter,
                  year: year?.toString(),
                  sort: sort,
                  language: language
                }}
                basePath={`/chu-de/${slug}`}
              />
            </div>
          </div>

          {/* Floating Onflix Character Graphic */}
          {theme.char && (
            <div className="absolute bottom-0 right-4 md:right-16 h-[110%] w-[180px] md:w-[240px] pointer-events-none z-10 hidden sm:block">
              <img
                src={theme.char}
                alt="Character"
                className="object-contain object-bottom w-full h-full transform translate-y-4 hover:scale-105 transition-transform duration-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* Movies Grid Section */}
      <div className="max-w-[1400px] mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <span>Danh sách phim</span>
            <span className="text-xs bg-white/10 text-zinc-400 px-2 py-0.5 rounded-full font-medium">{totalCount}</span>
          </h2>
        </div>

        {movies.length > 0 ? (
          <>
            <MovieGridClient movies={movies} />

            {totalPages > 1 && (
              <PaginationPanel
                currentPage={page}
                totalPages={totalPages}
                basePath={`/chu-de/${slug}`}
                currentFilters={{
                  category: categoryId?.toString(),
                  country: countryId?.toString(),
                  type: typeFilter,
                  year: year?.toString(),
                  sort: sort,
                  language: language
                }}
              />
            )}
          </>
        ) : (
          <div className="text-center py-24 text-zinc-500 border border-dashed border-zinc-900 rounded-2xl">
            <p className="text-sm">Chưa có bộ phim nào thuộc chủ đề này.</p>
          </div>
        )}
      </div>

    </div>
  );
}
