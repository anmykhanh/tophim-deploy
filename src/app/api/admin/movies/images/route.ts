import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { checkPermissions } from '@/lib/auth';

export async function GET(request: Request) {
  if (!(await checkPermissions(['manage_movies']))) {
    return NextResponse.json({ error: 'Từ chối truy cập!' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const tmdbId = searchParams.get('tmdb_id');
    const type = searchParams.get('type') || 'phimle';

    if (!tmdbId) {
      return NextResponse.json({ error: 'Thiếu TMDB ID!' }, { status: 400 });
    }

    // Get API Key from settings
    const setting = await prisma.settings.findUnique({ where: { key: 'tmdb_api_key' } });
    const apiKey = setting?.value || process.env.TMDB_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'Chưa cấu hình TMDB API Key trong phần Cài đặt!' }, { status: 400 });
    }

    const tmdbType = ['phimbo', 'hoathinh', 'tvshows'].includes(type) ? 'tv' : 'movie';

    // Fetch Images from TMDB
    const res = await fetch(`https://api.tmdb.org/3/${tmdbType}/${tmdbId}/images?api_key=${apiKey}&include_image_language=vi,en,null`);
    if (!res.ok) {
      return NextResponse.json({ error: 'Không tìm thấy hình ảnh trên TMDB!' }, { status: 404 });
    }
    const imagesData = await res.json();

    // Extract all posters, thumbs, and logos
    const posters = imagesData.posters?.slice(0, 15).map((p: any) => `https://image.tmdb.org/t/p/w500${p.file_path}`) || [];
    const thumbs = imagesData.backdrops?.slice(0, 15).map((b: any) => `https://image.tmdb.org/t/p/original${b.file_path}`) || [];
    const logos = imagesData.logos?.slice(0, 15).map((l: any) => `https://image.tmdb.org/t/p/original${l.file_path}`) || [];

    return NextResponse.json({
      success: true,
      posters,
      thumbs,
      logos
    });

  } catch (err: any) {
    console.error('TMDB Images Fetch error:', err);
    return NextResponse.json({ error: 'Lỗi hệ thống khi lấy ảnh TMDB!' }, { status: 500 });
  }
}
