import { notFound } from 'next/navigation';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import ArticleDetailClient from '@/components/ArticleDetailClient';
import { Metadata } from 'next';

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

// Dynamic SEO metadata generation
export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await prisma.articles.findUnique({
    where: { slug },
  });

  if (!article) {
    return {
      title: 'Bài viết không tồn tại | Tô Phim',
      robots: { index: false, follow: false },
    };
  }

  const titleStr = `${article.title} | Tô Phim`;
  const descStr = article.description || `Đọc bài viết "${article.title}" tại Tô Phim - nơi cập nhật review phim và tin tức điện ảnh mới nhất.`;
  const canonicalUrl = `/bai-viet/${article.slug}`;

  return {
    title: titleStr,
    description: descStr,
    keywords: [article.title, article.category, 'review phim', 'đánh giá phim', 'hubphim', 'xem phim'],
    authors: [{ name: 'Tô Phim' }],
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: titleStr,
      description: descStr,
      type: 'article',
      url: canonicalUrl,
      siteName: 'Tô Phim',
      locale: 'vi_VN',
      images: article.thumbnail
        ? [{ url: article.thumbnail, width: 1200, height: 630, alt: article.title }]
        : [],
      publishedTime: article.created_at.toISOString(),
      modifiedTime: article.updated_at.toISOString(),
      authors: ['Tô Phim'],
      tags: [article.category],
    },
    twitter: {
      card: 'summary_large_image',
      title: titleStr,
      description: descStr,
      images: article.thumbnail ? [article.thumbnail] : [],
    },
  };
}

export default async function ArticleDetailPage({ params }: ArticlePageProps) {
  const { slug } = await params;

  const article = await prisma.articles.findUnique({
    where: { slug },
  });

  if (!article) {
    notFound();
  }

  // Views are now incremented via client-side API call in ArticleDetailClient
  // Get current user session
  const session = await getSession();
  let currentUser = null;

  if (session?.userId) {
    const dbUser = await prisma.users.findUnique({
      where: { id: session.userId },
      select: { id: true, name: true, avatar: true, role: true },
    });
    if (dbUser) {
      currentUser = {
        id: dbUser.id,
        name: dbUser.name,
        avatar: dbUser.avatar,
        role: dbUser.role || 'user',
      };
    }
  }

  // Security check: if article is not public, only admin or the author can view it
  if (!article.status) {
    if (!currentUser || (currentUser.role !== 'admin' && article.author_id !== currentUser.id)) {
      notFound();
    }
  }

  const serializedArticle = {
    id: article.id,
    title: article.title,
    slug: article.slug,
    description: article.description,
    category: article.category,
    content: article.content,
    thumbnail: article.thumbnail,
    views: article.views, // Views will be incremented on client side
    created_at: article.created_at.toISOString(),
  };

  // Structured Data JSON-LD — BlogPosting is more appropriate than NewsArticle
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    'mainEntityOfPage': {
      '@type': 'WebPage',
      '@id': `/bai-viet/${article.slug}`,
    },
    'headline': article.title,
    'description': article.description || '',
    'url': `/bai-viet/${article.slug}`,
    'image': article.thumbnail
      ? [{ '@type': 'ImageObject', 'url': article.thumbnail, 'width': 1200, 'height': 630 }]
      : [],
    'datePublished': article.created_at.toISOString(),
    'dateModified': article.updated_at.toISOString(),
    'articleSection': article.category || 'Bài Viết',
    'keywords': article.category,
    'inLanguage': 'vi-VN',
    'author': {
      '@type': 'Organization',
      'name': 'Tô Phim',
      'url': '/',
    },
    'publisher': {
      '@type': 'Organization',
      'name': 'Tô Phim',
      'url': '/',
      'logo': {
        '@type': 'ImageObject',
        'url': '/favicon.ico',
      },
    },
    'breadcrumb': {
      '@type': 'BreadcrumbList',
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': 'Trang chủ', 'item': '/' },
        { '@type': 'ListItem', 'position': 2, 'name': 'Bài Viết', 'item': '/bai-viet' },
        { '@type': 'ListItem', 'position': 3, 'name': article.title, 'item': `/bai-viet/${article.slug}` },
      ],
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ArticleDetailClient article={serializedArticle} currentUser={currentUser} />
    </>
  );
}
