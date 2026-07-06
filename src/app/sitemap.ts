import { MetadataRoute } from 'next';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // 1 hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let siteUrl = 'https://tophim.com';
  try {
    const settings = await prisma.settings.findFirst({ where: { key: 'site_url' } });
    if (settings?.value) siteUrl = settings.value.replace(/\/$/, '');
  } catch {}

  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${siteUrl}/phim-bo`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${siteUrl}/phim-le`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${siteUrl}/hoat-hinh`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${siteUrl}/tv-shows`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${siteUrl}/filter`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${siteUrl}/chu-de`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${siteUrl}/dien-vien`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
    { url: `${siteUrl}/lich-chieu`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.6 },
    { url: `${siteUrl}/gioi-thieu`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${siteUrl}/lien-he`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    {url: `${siteUrl}/chinh-sach-bao-mat`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3},
    {url: `${siteUrl}/dieu-khoan-su-dung`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3},
    {url: `${siteUrl}/hoi-dap`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4},
    {url: `${siteUrl}/bai-viet`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8},
  ];

  // Movie pages
  let movieRoutes: MetadataRoute.Sitemap = [];
  try {
    const movies = await prisma.movies.findMany({
      select: { slug: true, updated_at: true },
      orderBy: { updated_at: 'desc' },
      take: 10000,
    });
    movieRoutes = movies.map((movie) => ({
      url: `${siteUrl}/phim/${movie.slug}`,
      lastModified: movie.updated_at || new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));
  } catch {}

  // Actor pages
  let actorRoutes: MetadataRoute.Sitemap = [];
  try {
    const actors = await prisma.actors.findMany({
      select: { slug: true },
      take: 5000,
    });
    actorRoutes = actors
      .filter((a) => a.slug)
      .map((actor) => ({
        url: `${siteUrl}/dien-vien/${actor.slug}`,
        lastModified: new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.5,
      }));
  } catch {}


  // Category/collection pages
  let categoryRoutes: MetadataRoute.Sitemap = [];
  try {
    const categories = await prisma.categories.findMany({
      where: { status: true },
      select: { slug: true, type: true },
    });
    categoryRoutes = categories.map((cat) => ({
      url: cat.type === 'collection'
        ? `${siteUrl}/chu-de/${cat.slug}`
        : `${siteUrl}/filter?category=${cat.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));
  } catch {}

  // Article pages
  let articleRoutes: MetadataRoute.Sitemap = [];
  try {
    const articles = await prisma.articles.findMany({
      where: { status: true },
      select: { slug: true, updated_at: true },
      orderBy: { updated_at: 'desc' },
      take: 1000,
    });
    articleRoutes = articles.map((article) => ({
      url: `${siteUrl}/bai-viet/${article.slug}`,
      lastModified: article.updated_at || new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));
  } catch {}


  return [...staticRoutes, ...movieRoutes, ...actorRoutes, ...categoryRoutes, ...articleRoutes];
}
