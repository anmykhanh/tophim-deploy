import Link from 'next/link';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { getProxyImageUrl, getPosterUrl } from '@/lib/image';

interface PageProps {
  searchParams: Promise<{ search?: string }>;
}

export default async function XemChungSelectMoviePage({ searchParams }: PageProps) {
  const cookieStore = await cookies();
  const { getSession } = await import('@/lib/auth');
  const session = await getSession();
  const userIdStr = session?.userId?.toString();
  if (!userIdStr) {
    redirect('/pages/login');
  }

  const params = await searchParams;
  const search = params.search || '';

  // Build query
  const whereClause: any = {};
  if (search) {
    whereClause.OR = [
      { title: { contains: search } },
      { original_title: { contains: search } }
    ];
  }

  // Fetch movies
  const moviesRaw = await prisma.movies.findMany({
    where: whereClause,
    orderBy: { id: 'desc' },
    take: 60
  });

  const movies = JSON.parse(JSON.stringify(moviesRaw));

  return (
    <div id="wrapper" className="live-category min-h-screen pt-20">
      <div className="live-background">
        <div className="light-blur"></div>
        <img alt="live-cover" src="/images/live-cover2.webp" />
      </div>
      
      <div className="fluid-gap">
        {/* Banner Content Area */}
        <div className="relative py-10 md:py-16 px-6 md:px-10 overflow-hidden flex flex-col justify-center bg-zinc-950/45 border border-zinc-900/50 rounded-3xl mb-8 backdrop-blur-md">
          <div className="relative z-20 w-full space-y-4 text-left">
            <Link className="inline-flex items-center text-zinc-400 hover:text-[#FECF59] mb-2 transition-colors text-xs font-semibold decoration-none" href="/xem-chung">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 mr-1">
                <path d="m15 18-6-6 6-6" />
              </svg>Quay lại Xem Chung
            </Link>
            
            <div>
              <h1 className="text-xl md:text-3xl font-extrabold text-white mb-1 tracking-tight">Chọn Phim Khởi Chiếu</h1>
              <p className="text-zinc-400 text-xs md:text-sm font-medium leading-relaxed max-w-xl">
                Bấm chọn một bộ phim từ danh sách nguồn phát chất lượng cao dưới đây để bắt đầu khởi tạo phòng chiếu.
              </p>
            </div>

            {/* Quick Search Form */}
            <form method="GET" action="/xem-chung/select-movie" className="flex items-center gap-2 max-w-md bg-zinc-950/80 p-1.5 rounded-2xl border border-zinc-800 backdrop-blur-md shadow-2xl">
              <input 
                name="search" 
                defaultValue={search}
                placeholder="Tìm kiếm phim muốn chiếu..." 
                className="flex-1 bg-transparent text-white rounded-xl px-3 py-1.5 text-xs md:text-sm focus:outline-none placeholder-zinc-600 font-semibold border-none" 
                type="text" 
              />
              <button type="submit" className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#FECF59] hover:bg-[#ffdb80] text-black font-bold rounded-xl transition-all duration-300 shadow-md text-xs cursor-pointer shrink-0 border-none">
                Tìm kiếm
              </button>
            </form>
          </div>
        </div>

        {/* Movies Grid Selection */}
        <div className="relative z-20 pt-4 pb-16">
          {movies.length === 0 ? (
            <div className="text-center py-16 bg-zinc-900/30 border border-zinc-900/50 rounded-3xl">
              <p className="text-zinc-500 text-sm font-semibold">Không tìm thấy phim phù hợp với từ khóa.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {movies.map((m: any) => {
                const poster = getProxyImageUrl(getPosterUrl(m) || '', 300);
                const createRoomUrl = `/xem-chung/create?movie_id=${m.id}`;
                
                return (
                  <Link 
                    key={m.id}
                    className="group block relative overflow-hidden rounded-xl border border-zinc-900/50 bg-[#141622] hover:border-zinc-800 transition-all duration-300 hover:-translate-y-1 shadow-md hover:shadow-xl decoration-none" 
                    href={createRoomUrl}
                  >
                    {/* Image Wrapper */}
                    <div className="aspect-[2/3] w-full overflow-hidden bg-zinc-950 relative">
                      <img alt={m.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" src={poster} loading="lazy" />
                      
                      {/* Badges */}
                      <div className="absolute bottom-2 left-2 flex flex-wrap gap-1 z-10">
                        {m.year && (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-[#FECF59] text-black uppercase tracking-widest">
                            {m.year}
                          </span>
                        )}
                        {m.quality && (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-zinc-950/70 text-zinc-300 uppercase tracking-widest border border-zinc-800">
                            {m.quality}
                          </span>
                        )}
                      </div>
                      
                      {/* Overlay on hover */}
                      <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-[#FECF59] flex items-center justify-center text-black shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    
                    {/* Metadata Info */}
                    <div className="p-3 bg-[#10121d] border-t border-zinc-900/50">
                      <h3 className="text-xs font-bold text-white group-hover:text-[#FECF59] transition-colors line-clamp-1 truncate mb-0.5">
                        {m.title}
                      </h3>
                      <p className="text-[10px] text-zinc-500 truncate font-semibold">
                        {m.original_title}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
