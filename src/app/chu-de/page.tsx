import Link from 'next/link';
import prisma from '@/lib/db';
import { getProxyImageUrl } from '@/lib/image';
import { getCollectionTheme } from '@/lib/theme';

export const dynamic = 'force-dynamic';

export default async function TopicsPage() {
  // Query all collections
  const rawCollections = await prisma.categories.findMany({
    where: {
      type: 'collection',
      status: true
    },
    orderBy: [
      { order_num: 'asc' },
      { id: 'desc' }
    ]
  });

  const collections = JSON.parse(JSON.stringify(rawCollections));

  // For each collection, fetch one movie poster as fallback if needed
  const collectionsWithPosters = await Promise.all(
    collections.map(async (c: any, index: number) => {
      const theme = getCollectionTheme(c.slug, c.name, index);

      let fallbackPoster = '';
      if (!theme.char) {
        const firstMovie = await prisma.movies.findFirst({
          where: {
            movie_category: {
              some: {
                category_id: c.id
              }
            },
            poster_url: {
              not: ''
            }
          },
          select: {
            poster_url: true,
            thumb_url: true
          }
        });
        fallbackPoster = firstMovie ? (firstMovie.poster_url || firstMovie.thumb_url || '') : '';
      }

      return {
        ...c,
        theme,
        fallbackPoster
      };
    })
  );

  return (
    <div className="w-full bg-[#06080c] min-h-screen pt-[90px] lg:pt-[110px] pb-16 relative" style={{ backgroundImage: 'radial-gradient(at 50% 0%, #0d1617 0%, #06080c 70%)' }}>
      <div className="max-w-[1400px] mx-auto px-4 py-8">

        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors mb-6 group"
        >
          <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Quay lại trang chủ
        </Link>

        <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-10 tracking-tight">Các chủ đề</h1>

        {collectionsWithPosters.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {collectionsWithPosters.map((c: any) => {
              const theme = c.theme;
              return (
                <Link
                  key={c.id}
                  href={`/chu-de/${c.slug}`}
                  className="group relative h-[138px] overflow-hidden rounded-[20px_45px_20px_45px] text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl flex flex-col justify-between p-6"
                  style={{ background: theme.gradient || theme.hex }}
                >
                  {/* Capsule curve overlay on the right */}
                  <div className="absolute right-0 top-0 bottom-0 w-[35%] rounded-l-full bg-black/15 transition-transform duration-500 group-hover:scale-x-105 origin-right"></div>

                  {/* Subtle glass glow reflection */}
                  <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0)_58%)]"></div>

                  <div className="relative z-10 flex flex-col justify-between h-full w-full">
                    <h3 className="text-[17px] sm:text-[19px] font-bold leading-tight line-clamp-2 pr-[28%] select-none">
                      {c.name}
                    </h3>

                    <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-white/95 select-none">
                      Xem toàn bộ
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="lucide lucide-chevron-right h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1"
                      >
                        <path d="m9 18 6-6-6-6"></path>
                      </svg>
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-24 text-zinc-500 border border-dashed border-zinc-900 rounded-2xl">
            <p className="text-sm">Chưa có chủ đề tuyển tập nào được tạo.</p>
          </div>
        )}

      </div>
    </div>
  );
}
