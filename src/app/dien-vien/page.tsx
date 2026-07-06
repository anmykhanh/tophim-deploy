import Link from 'next/link';
import prisma from '@/lib/db';
import PaginationPanel from '@/components/PaginationPanel';

interface PageProps {
  searchParams: Promise<{
    q?: string;
    page?: string;
  }>;
}

export default async function ActorsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const q = params.q || '';
  const page = params.page ? parseInt(params.page, 10) : 1;
  const limit = 24;
  const skip = (page - 1) * limit;

  // Build query: only include actors that have associated movies
  const whereClause: any = {
    movie_actor: {
      some: {}
    }
  };

  if (q.trim() !== '') {
    whereClause.AND = [
      {
        OR: [
          { name: { contains: q } },
          { slug: { contains: q } }
        ]
      }
    ];
  }

  // Count total matches
  const totalCount = await prisma.actors.count({ where: whereClause });
  const totalPages = Math.ceil(totalCount / limit) || 1;

  // Query actors with movie counts
  const rawActors = await prisma.actors.findMany({
    where: whereClause,
    include: {
      _count: {
        select: { movie_actor: true }
      }
    },
    orderBy: {
      movie_actor: {
        _count: 'desc'
      }
    },
    skip,
    take: limit
  });

  const actors = JSON.parse(JSON.stringify(rawActors));

  const pageTitle = q ? `Tìm diễn viên: "${q}"` : 'Diễn viên';

  const getActorAvatar = (actor: any) => {
    if (actor.avatar && actor.avatar.trim() !== '') {
      return actor.avatar;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(actor.name || 'A')}&background=1a1a2e&color=ffc107&size=200`;
  };

  return (
    <div className="w-full bg-[#0a0a0f] text-white min-h-screen pt-[90px] lg:pt-[110px]">
      <div className="max-w-[1400px] mx-auto px-4 py-8">
        
        {/* Title */}
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{pageTitle}</h1>
        <p className="text-sm text-zinc-400 mb-8">
          Tra cứu diễn viên đã xuất hiện trong các phim trên website
        </p>

        {/* Search Bar */}
        <form action="/dien-vien" method="GET" className="flex gap-3 mb-8 max-w-xl">
          <div className="relative flex-1">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Nhập tên diễn viên..."
              className="w-full bg-[#161722] text-white placeholder-zinc-500 text-sm pl-4 pr-10 py-3 rounded-full border border-white/5 focus:outline-none focus:border-[#FFD166]/50 focus:bg-[#1a1b28] transition-all"
            />
            {q && (
              <Link
                href="/dien-vien"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs px-2 py-1 bg-white/5 rounded-md"
              >
                Xoá lọc
              </Link>
            )}
          </div>
          <button
            type="submit"
            className="px-6 py-3 rounded-full bg-[#FFD166] text-[#0a0a0f] font-bold text-sm hover:bg-[#ffe08f] transition-all active:scale-95 shadow-md shadow-[rgba(255,209,102,0.15)] flex items-center gap-1.5 shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Tìm kiếm
          </button>
        </form>

        {/* Actors Grid */}
        {actors.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-6">
              {actors.map((actor: any) => (
                <Link
                  key={actor.id}
                  href={`/dien-vien/${actor.slug}`}
                  className="group flex flex-col items-center text-center p-4 rounded-2xl bg-[#12131e] border border-white/5 hover:border-white/10 hover:bg-[#161726] transition-all duration-300 shadow-lg"
                >
                  <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden mb-3 border-2 border-white/5 group-hover:border-[#FFD166]/50 transition-all duration-300 shadow-md">
                    <img
                      src={getActorAvatar(actor)}
                      alt={actor.name}
                      loading="lazy"
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <h3 className="text-sm font-semibold text-white/95 group-hover:text-[#FFD166] transition-colors line-clamp-1">
                    {actor.name}
                  </h3>
                  <span className="text-xs text-zinc-400 mt-1">
                    {actor._count?.movie_actor || 0} phim
                  </span>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <PaginationPanel
                currentPage={page}
                totalPages={totalPages}
                basePath="/dien-vien"
                currentFilters={{ q: q || undefined }}
              />
            )}
          </>
        ) : (
          <div className="text-center py-24 text-zinc-500 border border-dashed border-zinc-900 rounded-2xl">
            <h3 className="font-bold text-base text-zinc-300">Không tìm thấy diễn viên</h3>
            <p className="text-xs mt-1">Vui lòng thử lại với tên khác.</p>
          </div>
        )}

      </div>
    </div>
  );
}
