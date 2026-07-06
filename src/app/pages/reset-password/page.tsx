import prisma from '@/lib/db';
import ResetPasswordForm from '@/components/ResetPasswordForm';

const fallbacks = [
  'https://phimimg.com/upload/vod/20250226-1/aa82c41fd81dba6a3c71a7cd95c0d411.jpg',
  'https://phimimg.com/upload/vod/20241018-1/422e01866d2bfcb0adfd4ae2a31ef32f.jpg',
  'https://phimimg.com/upload/vod/20260610-1/00bded8495748116463dc924dedc12d4.jpg',
  'https://phimimg.com/upload/vod/20250117-1/a9e32b44820101a9ba2c887344f7334c.jpg',
  'https://phimimg.com/upload/vod/20260616-1/c98478c0cd0d248bb00d070899d3d11c.jpg',
  'https://phimimg.com/upload/vod/20260606-1/2b35e460e8b4d0d3b9785edc7aff5216.jpg',
  'https://phimimg.com/upload/vod/20260616-1/247abad1d18477f9983cbf3877e4f070.jpg',
  'https://phimimg.com/upload/vod/20260530-1/0460c0307577f8e01c46945942e3eb4e.jpg'
];

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ResetPasswordPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const token = typeof resolvedSearchParams.token === 'string' ? resolvedSearchParams.token : '';

  // Query poster URLs from database
  let bgMovies: string[] = [];
  try {
    const movies = await prisma.movies.findMany({
      where: {
        AND: [
          { poster_url: { not: null } },
          { poster_url: { not: '' } }
        ]
      },
      take: 24,
      select: {
        poster_url: true
      }
    });
    bgMovies = movies.map(m => m.poster_url).filter(Boolean) as string[];
  } catch (err) {
    console.error("Failed to query background movies:", err);
  }

  // Ensure we have 24 posters
  while (bgMovies.length < 24) {
    bgMovies = [...bgMovies, ...fallbacks];
  }
  bgMovies = bgMovies.slice(0, 24);

  // Fetch logo and site name from settings
  let logoUrl = '/branding/logo.png';
  let siteName = 'Tô Phim';
  try {
    const settingsList = await prisma.settings.findMany({
      where: {
        key: {
          in: ['logo_url', 'site_name']
        }
      }
    });
    settingsList.forEach(s => {
      if (s.key === 'logo_url' && s.value) logoUrl = s.value;
      if (s.key === 'site_name' && s.value) siteName = s.value;
    });
  } catch (err) {
    console.error("Failed to query settings:", err);
  }

  return (
    <ResetPasswordForm token={token} logoUrl={logoUrl} siteName={siteName} bgMovies={bgMovies} />
  );
}
