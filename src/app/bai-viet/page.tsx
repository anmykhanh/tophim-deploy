import Link from 'next/link';
import prisma from '@/lib/db';
import { Eye, Calendar, BookOpen } from 'lucide-react';
import { Metadata } from 'next';

export const revalidate = 60; // Cache for 60s

export const metadata: Metadata = {
  title: 'Bài Viết & Review Phim Hay | Tô Phim',
  description: 'Khám phá các bài viết đánh giá phim sâu sắc, tin tức điện ảnh mới nhất và lịch chiếu phim hot nhất hiện nay.',
  keywords: ['bài viết phim', 'review phim', 'đánh giá phim', 'tin tức điện ảnh', 'hubphim blog'],
  alternates: {
    canonical: '/bai-viet',
  },
  openGraph: {
    title: 'Bài Viết & Review Phim Hay | Tô Phim',
    description: 'Khám phá các bài viết đánh giá phim sâu sắc, tin tức điện ảnh mới nhất và lịch chiếu phim hot nhất hiện nay.',
    url: '/bai-viet',
    type: 'website',
    locale: 'vi_VN',
    siteName: 'Tô Phim',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bài Viết & Review Phim Hay | Tô Phim',
    description: 'Khám phá các bài viết đánh giá phim sâu sắc, tin tức điện ảnh mới nhất và lịch chiếu phim hot nhất hiện nay.',
  },
};

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function ArticlesPage({ searchParams }: PageProps) {
  const sParams = await searchParams;
  const query = sParams.q || '';

  const articles = await prisma.articles.findMany({
    where: { 
      status: true,
      ...(query ? {
        title: { contains: query }
      } : {})
    },
    orderBy: { created_at: 'desc' },
  });

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      { '@type': 'ListItem', 'position': 1, 'name': 'Trang chủ', 'item': '/' },
      { '@type': 'ListItem', 'position': 2, 'name': 'Bài Viết', 'item': '/bai-viet' },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <div className="min-h-screen bg-[#0f111a] pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Title Section */}
        <div className="mb-12 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold border border-amber-500/25 mb-4 uppercase tracking-wider">
              <BookOpen className="w-3.5 h-3.5" /> Góc Điện Ảnh
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Bài Viết & Review Phim
            </h1>
            <p className="mt-3 text-base text-zinc-400 max-w-2xl">
              Khám phá những bài đánh giá phim sâu sắc, tin tức điện ảnh mới nhất và lịch chiếu phim hot nhất hiện nay.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <form method="GET" action="/bai-viet" className="relative w-full sm:w-64">
              <input 
                type="text" 
                name="q" 
                defaultValue={query}
                placeholder="Tìm kiếm bài viết..." 
                className="w-full bg-zinc-950 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white outline-none focus:border-[#FFD166] transition-colors"
              />
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3.5 top-3.5 text-zinc-500"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </form>
            <Link 
              href="/bai-viet/viet-bai"
              className="flex items-center gap-2 px-6 py-3 shrink-0 bg-[#FFD166] hover:bg-[#FFD166]/90 text-black font-extrabold rounded-xl transition-all shadow-lg hover:shadow-[#FFD166]/20 active:scale-[0.98]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
              Viết bài
            </Link>
          </div>
        </div>

        {/* Grid List */}
        {articles.length === 0 ? (
          <div className="text-center py-20 bg-[#161824] rounded-2xl border border-white/5">
            <p className="text-zinc-500 font-semibold text-sm">
              {query ? `Không tìm thấy bài viết nào cho từ khóa "${query}".` : 'Chưa có bài viết nào được đăng tải.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {articles.map((article) => (
              <article 
                key={article.id}
                className="group relative flex flex-col bg-[#161824] border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 transition-all duration-300 hover:-translate-y-1 shadow-lg"
              >
                {/* Image Wrap */}
                <Link href={`/bai-viet/${article.slug}`} className="block aspect-video w-full overflow-hidden bg-zinc-950 relative">
                  {article.thumbnail ? (
                    <img 
                      src={article.thumbnail} 
                      alt={article.title} 
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-zinc-650 font-bold bg-zinc-900">
                      Tô Phim Cover
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#161824]/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </Link>

                {/* Content Wrap */}
                <div className="flex-1 p-5 flex flex-col justify-between">
                  <div className="space-y-3">
                    {/* Meta Rows */}
                    <div className="flex items-center justify-between text-xs text-zinc-400 font-semibold">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-[#FFD166]/85" />
                          {new Date(article.created_at).toLocaleDateString('vi-VN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5 text-[#FFD166]/85" />
                          {article.views} lượt xem
                        </span>
                      </div>
                      <span className="px-2 py-0.5 bg-[#FFD166]/10 text-[#FFD166] text-[10px] font-extrabold rounded-md uppercase tracking-wider border border-[#FFD166]/20">
                        {article.category}
                      </span>
                    </div>

                    {/* Title */}
                    <h2 className="text-lg font-bold text-white leading-snug group-hover:text-amber-400 transition-colors">
                      <Link href={`/bai-viet/${article.slug}`}>
                        {article.title}
                      </Link>
                    </h2>

                    {/* Description */}
                    {article.description && (
                      <p className="text-zinc-400 text-xs leading-relaxed line-clamp-3">
                        {article.description}
                      </p>
                    )}
                  </div>

                  {/* Read More */}
                  <div className="pt-5 mt-5 border-t border-white/5 flex items-center justify-between">
                    <Link 
                      href={`/bai-viet/${article.slug}`}
                      className="text-xs font-bold text-amber-400 group-hover:text-amber-300 flex items-center gap-1"
                    >
                      Đọc chi tiết ➔
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

      </div>
      </div>
    </>
  );
}
