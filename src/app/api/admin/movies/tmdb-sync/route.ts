import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { checkPermissions } from '@/lib/auth';

function createSlug(str: string): string {
  str = str.toLowerCase();
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
  str = str.replace(/đ/g, "d");
  str = str.replace(/[^\p{L}\p{N} -]/gu, ""); 
  str = str.replace(/\s+/g, "-"); 
  str = str.replace(/-+/g, "-"); 
  return str.trim().replace(/^-+|-+$/g, "");
}

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

    // Fetch Movie Info and Images
    const res = await fetch(`https://api.tmdb.org/3/${tmdbType}/${tmdbId}?api_key=${apiKey}&language=vi-VN&append_to_response=images&include_image_language=vi,en,null`);
    if (!res.ok) {
      return NextResponse.json({ error: 'Không tìm thấy phim trên TMDB hoặc API Key không hợp lệ!' }, { status: 404 });
    }
    const movieData = await res.json();

    // Fetch Credits (Actors)
    const creditsRes = await fetch(`https://api.tmdb.org/3/${tmdbType}/${tmdbId}/credits?api_key=${apiKey}&language=vi-VN`);
    let actors: any[] = [];
    let director = '';
    
    if (creditsRes.ok) {
      const creditsData = await creditsRes.json();
      const cast = creditsData.cast || [];
      const crew = creditsData.crew || [];
      
      actors = cast.slice(0, 15); // Get top 15 actors
      const dirObj = crew.find((c: any) => c.job === 'Director' || c.job === 'Executive Producer');
      if (dirObj) director = dirObj.name;
    }

    // Fetch Videos (Trailer)
    const videosRes = await fetch(`https://api.tmdb.org/3/${tmdbType}/${tmdbId}/videos?api_key=${apiKey}&language=vi-VN`);
    let trailer_url = '';
    if (videosRes.ok) {
      const videosData = await videosRes.json();
      let trailer = videosData.results?.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube');
      
      // Fallback to English if no Vietnamese trailer exists
      if (!trailer) {
        const videosResEn = await fetch(`https://api.tmdb.org/3/${tmdbType}/${tmdbId}/videos?api_key=${apiKey}`);
        if (videosResEn.ok) {
          const videosDataEn = await videosResEn.json();
          trailer = videosDataEn.results?.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube');
        }
      }
      
      if (trailer && trailer.key) {
        trailer_url = `https://www.youtube.com/watch?v=${trailer.key}`;
      }
    }

    // Process movie fields
    const year = movieData.release_date ? parseInt(movieData.release_date.substring(0, 4)) : new Date().getFullYear();
    const duration = movieData.runtime ? `${movieData.runtime} phút` : '';
    const poster_url = movieData.poster_path ? `https://image.tmdb.org/t/p/w500${movieData.poster_path}` : '';
    const thumb_url = movieData.backdrop_path ? `https://image.tmdb.org/t/p/original${movieData.backdrop_path}` : '';

    // Extract all posters, thumbs, and logos
    const posters = movieData.images?.posters?.slice(0, 15).map((p: any) => `https://image.tmdb.org/t/p/w500${p.file_path}`) || [];
    const thumbs = movieData.images?.backdrops?.slice(0, 15).map((b: any) => `https://image.tmdb.org/t/p/original${b.file_path}`) || [];
    const logos = movieData.images?.logos?.slice(0, 15).map((l: any) => `https://image.tmdb.org/t/p/original${l.file_path}`) || [];
    
    // Make sure the main ones are included
    if (poster_url && !posters.includes(poster_url)) posters.unshift(poster_url);
    if (thumb_url && !thumbs.includes(thumb_url)) thumbs.unshift(thumb_url);

    // Create actors in DB and get their IDs
    const actorIds: number[] = [];
    for (const actor of actors) {
      const name = actor.name;
      const slug = createSlug(name);
      
      let dbActor = await prisma.actors.findUnique({ where: { slug } });
      if (!dbActor) {
        let uniqueSlug = slug;
        let counter = 1;
        while (await prisma.actors.findUnique({ where: { slug: uniqueSlug } })) {
          uniqueSlug = `${slug}-${counter}`;
          counter++;
        }
        
        dbActor = await prisma.actors.create({
          data: {
            name,
            slug: uniqueSlug,
            avatar: actor.profile_path ? `https://image.tmdb.org/t/p/w276_and_h350_face${actor.profile_path}` : '',
            tmdb_id: actor.id
          }
        });
      } else if (actor.profile_path && (!dbActor.avatar || dbActor.avatar === '')) {
        dbActor = await prisma.actors.update({
          where: { id: dbActor.id },
          data: { avatar: `https://image.tmdb.org/t/p/w276_and_h350_face${actor.profile_path}` }
        });
      }
      actorIds.push(dbActor.id);
    }

    return NextResponse.json({
      success: true,
      movie: {
        title: movieData.title,
        original_title: movieData.original_title,
        description: movieData.overview,
        year,
        duration,
        poster_url,
        thumb_url,
        director,
        trailer_url,
        tmdb_id: movieData.id
      },
      actorIds,
      genres: movieData.genres?.map((g: any) => g.name) || [],
      posters,
      thumbs,
      logos
    });

  } catch (err: any) {
    console.error('TMDB Sync error:', err);
    return NextResponse.json({ error: 'Lỗi hệ thống khi đồng bộ TMDB!' }, { status: 500 });
  }
}
