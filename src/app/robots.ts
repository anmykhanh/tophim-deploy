import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tophim.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/phim/',
          '/xem/',
          '/phim-bo',
          '/phim-le',
          '/hoat-hinh',
          '/tv-shows',
          '/filter',
          '/dien-vien/',
          '/chu-de/',
          '/lich-chieu',
          '/gioi-thieu',
          '/lien-he',
          '/hoi-dap',
          '/chinh-sach-bao-mat',
          '/dieu-khoan-su-dung',
        ],
        disallow: [
          '/admin',
          '/api/',
          '/pages/profile',
          '/pages/login',
          '/pages/register',
          '/pages/forgot-password',
          '/pages/reset-password',
          '/pages/lien-ket-tv',
          '/lich-su',
          '/yeu-thich',
          '/xem-sau',
          '/thu-vien',
          '/thong-bao',
          '/xem-chung',
        ],
      },
      {
        // Block AI crawlers from scraping content
        userAgent: ['GPTBot', 'ChatGPT-User', 'CCBot', 'anthropic-ai', 'Claude-Web', 'Omgilibot'],
        disallow: ['/'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
