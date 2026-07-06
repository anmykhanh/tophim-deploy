import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const logoSetting = await prisma.settings.findUnique({
      where: { key: 'logo_url' }
    });
    const logoUrl = logoSetting?.value || '/branding/logo.png';

    const [sliderMovies, categories, recentMovies, hotSingleMovies, hotSeriesMovies] = await Promise.all([
      prisma.movies.findMany({
        where: { is_hot: true },
        orderBy: { updated_at: 'desc' },
        take: 8,
        select: { id: true, title: true, original_title: true, slug: true, thumb_url: true, poster_url: true, year: true, quality: true, episode_current: true, description: true, type: true }
      }),
      prisma.categories.findMany({
        where: { type: 'genre', status: true },
        orderBy: { movie_category: { _count: 'desc' } },
        take: 8,
        select: { id: true, name: true, slug: true, color: true }
      }),
      prisma.movies.findMany({
        take: 12,
        orderBy: [ { year: 'desc' }, { created_at: 'desc' } ],
        select: { id: true, title: true, slug: true, thumb_url: true, poster_url: true, episode_current: true, type: true }
      }),
      prisma.movies.findMany({
        where: { type: 'phimle', is_hot: true },
        take: 12,
        orderBy: { updated_at: 'desc' },
        select: { id: true, title: true, slug: true, thumb_url: true, poster_url: true, episode_current: true, type: true }
      }),
      prisma.movies.findMany({
        where: { type: 'phimbo', is_hot: true },
        take: 12,
        orderBy: { updated_at: 'desc' },
        select: { id: true, title: true, slug: true, thumb_url: true, poster_url: true, episode_current: true, type: true }
      })
    ]);

    const mapMovie = (m: any) => ({
      id: m.id, name: m.title, origin_name: m.original_title, slug: m.slug,
      thumb_url: m.thumb_url, poster_url: m.poster_url,
      year: m.year?.toString() || '2024', quality: m.quality || 'HD',
      episode_current: m.episode_current || 'Tập Full', description: m.description || 'Đang cập nhật...',
      type: m.type || ''
    });

    return NextResponse.json({
      success: true,
      data: {
        logo_url: logoUrl.startsWith('http') ? logoUrl : `https://tophim.com${logoUrl}`,
        slider: sliderMovies.map(mapMovie),
        categories: categories,
        recent: recentMovies.map(mapMovie),
        hotSingle: hotSingleMovies.map(mapMovie),
        hotSeries: hotSeriesMovies.map(mapMovie)
      }
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
  } catch (error) {
    console.error('Mobile Home API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}
