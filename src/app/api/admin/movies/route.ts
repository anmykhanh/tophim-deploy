import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { checkPermissions, getSession } from '@/lib/auth';



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

function getVietnameseVariants(str: string): string[] {
  const toneMap: Record<string, string> = {
    'á': 'a\u0301', 'à': 'a\u0300', 'ả': 'a\u0309', 'ã': 'a\u0303', 'ạ': 'a\u0323',
    'Á': 'A\u0301', 'À': 'A\u0300', 'Ả': 'A\u0309', 'Ã': 'A\u0303', 'Ạ': 'A\u0323',
    'ắ': 'ă\u0301', 'ằ': 'ă\u0300', 'ẳ': 'ă\u0309', 'ẵ': 'ă\u0303', 'ặ': 'ă\u0323',
    'Ắ': 'Ă\u0301', 'Ằ': 'Ă\u0300', 'Ẳ': 'Ă\u0309', 'Ẵ': 'Ă\u0303', 'Ặ': 'Ă\u0323',
    'ấn': 'â\u0301n', 'ầ': 'â\u0300', 'ẩ': 'â\u0309', 'ẫ': 'â\u0303', 'ậ': 'â\u0323',
    'ấ': 'â\u0301', 'Ấ': 'Â\u0301', 'Ầ': 'Â\u0300', 'Ẩ': 'Â\u0309', 'Ẫ': 'Â\u0303', 'Ậ': 'Â\u0323',
    'é': 'e\u0301', 'è': 'e\u0300', 'ẻ': 'e\u0309', 'ẽ': 'e\u0303', 'ẹ': 'e\u0323',
    'É': 'E\u0301', 'È': 'E\u0300', 'Ẻ': 'E\u0309', 'Ẽ': 'E\u0303', 'Ẹ': 'E\u0323',
    'ế': 'ê\u0301', 'ề': 'ê\u0300', 'ể': 'ê\u0309', 'ễ': 'ê\u0303', 'ệ': 'ê\u0323',
    'Ế': 'Ê\u0301', 'Ề': 'Ê\u0300', 'Ể': 'Ê\u0309', 'Ễ': 'Ê\u0303', 'Ệ': 'Ê\u0323',
    'í': 'i\u0301', 'ì': 'i\u0300', 'ỉ': 'i\u0309', 'ĩ': 'i\u0303', 'ị': 'i\u0323',
    'Í': 'I\u0301', 'Ì': 'I\u0300', 'Ỉ': 'I\u0309', 'Ĩ': 'I\u0303', 'Ị': 'I\u0323',
    'ó': 'o\u0301', 'ò': 'o\u0300', 'ỏ': 'o\u0309', 'õ': 'o\u0303', 'ọ': 'o\u0323',
    'Ó': 'O\u0301', 'Ò': 'O\u0300', 'Ỏ': 'O\u0309', 'Õ': 'O\u0303', 'Ọ': 'O\u0323',
    'ố': 'ô\u0301', 'ồ': 'ô\u0300', 'ổ': 'ô\u0309', 'ỗ': 'ô\u0303', 'ộ': 'ô\u0323',
    'Ố': 'Ô\u0301', 'Ồ': 'Ô\u0300', 'Ổ': 'Ô\u0309', 'Ỗ': 'Ô\u0303', 'Ộ': 'Ô\u0323',
    'ớ': 'ơ\u0301', 'ờ': 'ơ\u0300', 'ở': 'ơ\u0309', 'ỡ': 'ơ\u0303', 'ợ': 'ơ\u0323',
    'Ớ': 'Ơ\u0301', 'Ờ': 'Ơ\u0300', 'Ở': 'Ơ\u0309', 'Ỡ': 'Ơ\u0303', 'Ợ': 'Ơ\u0323',
    'ú': 'u\u0301', 'ù': 'u\u0300', 'ủ': 'u\u0309', 'ũ': 'u\u0303', 'ụ': 'u\u0323',
    'Ú': 'U\u0301', 'Ù': 'U\u0300', 'Ủ': 'U\u0309', 'Ũ': 'U\u0303', 'Ụ': 'U\u0323',
    'ứ': 'ư\u0301', 'ừ': 'ư\u0300', 'ử': 'ư\u0309', 'ữ': 'ư\u0303', 'ự': 'ư\u0323',
    'Ứ': 'Ư\u0301', 'Ừ': 'Ư\u0300', 'Ử': 'Ư\u0309', 'Ữ': 'Ư\u0303', 'Ự': 'Ư\u0323',
    'ý': 'y\u0301', 'ỳ': 'y\u0300', 'ỷ': 'y\u0309', 'ỹ': 'y\u0303', 'ỵ': 'y\u0323',
    'Ý': 'Y\u0301', 'Ỳ': 'Y\u0300', 'Ỷ': 'Y\u0309', 'Ỹ': 'Y\u0303', 'Ỵ': 'Y\u0323',
  };

  const toSemiDecomposed = (s: string) => {
    return s.split('').map(char => toneMap[char] || char).join('');
  };

  const nfc = str.normalize('NFC');
  const nfd = str.normalize('NFD');
  const semi = toSemiDecomposed(nfc);

  return Array.from(new Set([nfc, nfd, semi]));
}

// GET: List movies with pagination & search
export async function GET(request: Request) {
  if (!(await checkPermissions(['manage_movies', 'manage_nominations']))) {
    return NextResponse.json({ error: 'Từ chối truy cập!' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const skip = (page - 1) * limit;
    const isHotParam = searchParams.get('is_hot');
    const statusParam = searchParams.get('status');

    const whereClause: any = {};
    if (search) {
      const searchLower = search.toLowerCase();
      const searchUpper = search.toUpperCase();

      const allVariants = [
        ...getVietnameseVariants(search),
        ...getVietnameseVariants(searchLower),
        ...getVietnameseVariants(searchUpper)
      ];
      const searchTerms = Array.from(new Set(allVariants));

      whereClause.OR = [
        ...searchTerms.map(term => ({ title: { contains: term } })),
        ...searchTerms.map(term => ({ original_title: { contains: term } }))
      ];
    }

    if (isHotParam === '1' || isHotParam === 'true') {
      whereClause.is_hot = true;
    } else if (isHotParam === '0' || isHotParam === 'false') {
      whereClause.is_hot = false;
    }

    if (statusParam) {
      whereClause.status = statusParam;
    }

    const orderByClause: any = (isHotParam === '1' || isHotParam === 'true')
      ? [{ hot_priority: 'desc' }, { id: 'desc' }]
      : { id: 'desc' };

    const [movies, total] = await prisma.$transaction([
      prisma.movies.findMany({
        where: whereClause,
        orderBy: orderByClause,
        skip,
        take: limit,
        include: {
          movie_category: {
            select: {
              category_id: true
            }
          }
        }
      }),
      prisma.movies.count({ where: whereClause })
    ]);

    return NextResponse.json({ success: true, movies, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err: any) {
    console.error('List movies error:', err);
    return NextResponse.json({ error: 'Lỗi hệ thống!' }, { status: 500 });
  }
}

// POST: Create a movie
export async function POST(request: Request) {
  if (!(await checkPermissions('manage_movies'))) {
    return NextResponse.json({ error: 'Từ chối truy cập!' }, { status: 403 });
  }

  try {
    const data = await request.json();
    const { title, original_title, type, status, year, duration, quality, language, poster_url, thumb_url, logo_url, trailer_url, director, description, is_hot, hot_priority, categoryIds, tmdb_id, actorIds, server_priority } = data;

    if (!title) {
      return NextResponse.json({ error: 'Tên phim không được để trống!' }, { status: 400 });
    }

    let slug = createSlug(title);
    
    // Check if slug is unique
    let existing = await prisma.movies.findUnique({ where: { slug } });
    let count = 1;
    while (existing) {
      slug = `${createSlug(title)}-${count}`;
      existing = await prisma.movies.findUnique({ where: { slug } });
      count++;
    }

    let parsedActorIds: number[] = [];
    if (typeof actorIds === 'string') {
      try { parsedActorIds = JSON.parse(actorIds); } catch (e) {}
    } else if (Array.isArray(actorIds)) {
      parsedActorIds = actorIds.map((id: any) => parseInt(id));
    }

    const movie = await prisma.movies.create({
      data: {
        title,
        original_title: original_title || '',
        slug,
        type: type || 'phimle',
        status: status || 'Full',
        year: year ? parseInt(year) : new Date().getFullYear(),
        duration: duration || '',
        quality: quality || 'FHD',
        language: language || 'Vietsub',
        poster_url: poster_url || '',
        thumb_url: thumb_url || '',
        logo_url: logo_url || '',
        trailer_url: trailer_url || '',
        director: director || '',
        description: description || '',
        is_hot: is_hot === true || is_hot === 1 || is_hot === '1' || is_hot === 'true',
        hot_priority: hot_priority ? parseInt(hot_priority) : 0,
        tmdb_id: tmdb_id ? parseInt(tmdb_id) : null,
        server_priority: server_priority || null,
        movie_category: {
          create: (categoryIds || []).map((catId: number) => ({
            category_id: catId
          }))
        },
        movie_actor: parsedActorIds.length > 0 ? {
          create: parsedActorIds.map((actId: number) => ({
            actor_id: actId
          }))
        } : undefined
      }
    });

    return NextResponse.json({ success: true, message: 'Thêm phim mới thành công!', movie });
  } catch (err: any) {
    console.error('Create movie error:', err);
    return NextResponse.json({ error: 'Lỗi hệ thống!' }, { status: 500 });
  }
}

// PUT: Update a movie
export async function PUT(request: Request) {
  if (!(await checkPermissions(['manage_movies', 'manage_nominations']))) {
    return NextResponse.json({ error: 'Từ chối truy cập!' }, { status: 403 });
  }

  try {
    const data = await request.json();
    const { id } = data;

    if (!id) {
      return NextResponse.json({ error: 'Thiếu ID phim!' }, { status: 400 });
    }

    const movieId = parseInt(id);

    // Fetch existing movie to allow partial updates (like toggles)
    const existing = await prisma.movies.findUnique({
      where: { id: movieId }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Phim không tồn tại!' }, { status: 404 });
    }

    const title = data.title !== undefined ? data.title : existing.title;
    const original_title = data.original_title !== undefined ? data.original_title : existing.original_title;
    const type = data.type !== undefined ? data.type : existing.type;
    const status = data.status !== undefined ? data.status : existing.status;
    const year = data.year !== undefined ? parseInt(data.year) : existing.year;
    const duration = data.duration !== undefined ? data.duration : existing.duration;
    const quality = data.quality !== undefined ? data.quality : existing.quality;
    const language = data.language !== undefined ? data.language : existing.language;
    const poster_url = data.poster_url !== undefined ? data.poster_url : existing.poster_url;
    const thumb_url = data.thumb_url !== undefined ? data.thumb_url : existing.thumb_url;
    const logo_url = data.logo_url !== undefined ? data.logo_url : existing.logo_url;
    const trailer_url = data.trailer_url !== undefined ? data.trailer_url : existing.trailer_url;
    const director = data.director !== undefined ? data.director : existing.director;
    const description = data.description !== undefined ? data.description : existing.description;
    const is_hot = data.is_hot !== undefined ? (data.is_hot === true || data.is_hot === 1 || data.is_hot === '1' || data.is_hot === 'true') : existing.is_hot;
    const hot_priority = data.hot_priority !== undefined ? parseInt(data.hot_priority) : existing.hot_priority;
    const tmdb_id = data.tmdb_id !== undefined ? (data.tmdb_id ? parseInt(data.tmdb_id) : null) : existing.tmdb_id;
    const server_priority = data.server_priority !== undefined ? data.server_priority : existing.server_priority;

    // Update categories only if they are passed in the request
    if (data.categoryIds !== undefined) {
      await prisma.movie_category.deleteMany({
        where: { movie_id: movieId }
      });
      
      const insertData = (data.categoryIds || []).map((catId: number) => ({
        movie_id: movieId,
        category_id: catId
      }));

      if (insertData.length > 0) {
        await prisma.movie_category.createMany({
          data: insertData
        });
      }
    }

    // Update actors if actorIds are passed
    if (data.actorIds !== undefined) {
      let parsedActorIds: number[] = [];
      if (typeof data.actorIds === 'string') {
        try { parsedActorIds = JSON.parse(data.actorIds); } catch (e) {}
      } else if (Array.isArray(data.actorIds)) {
        parsedActorIds = data.actorIds.map((id: string | number) => typeof id === 'string' ? parseInt(id) : id);
      }

      await prisma.movie_actor.deleteMany({
        where: { movie_id: movieId }
      });

      if (parsedActorIds.length > 0) {
        await prisma.movie_actor.createMany({
          data: parsedActorIds.map((actId: any) => ({
            movie_id: movieId,
            actor_id: actId
          }))
        });
      }
    }

    await prisma.movies.update({
      where: { id: movieId },
      data: {
        title,
        original_title,
        type,
        status,
        year,
        duration,
        quality,
        language,
        poster_url,
        thumb_url,
        logo_url,
        trailer_url,
        director,
        description,
        is_hot,
        hot_priority,
        tmdb_id,
        server_priority,
        updated_at: new Date()
      }
    });

    return NextResponse.json({ success: true, message: 'Cập nhật thông tin phim thành công!' });
  } catch (err: any) {
    console.error('Update movie error:', err);
    return NextResponse.json({ error: 'Lỗi hệ thống!' }, { status: 500 });
  }
}

// DELETE: Delete a movie
export async function DELETE(request: Request) {
  if (!(await checkPermissions('manage_movies'))) {
    return NextResponse.json({ error: 'Từ chối truy cập!' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const movieIdStr = searchParams.get('id');

    if (!movieIdStr) {
      return NextResponse.json({ error: 'Thiếu ID phim!' }, { status: 400 });
    }

    const movieId = parseInt(movieIdStr);

    await prisma.movies.delete({
      where: { id: movieId }
    });

    return NextResponse.json({ success: true, message: 'Xóa phim thành công!' });
  } catch (err: any) {
    console.error('Delete movie error:', err);
    return NextResponse.json({ error: 'Lỗi hệ thống!' }, { status: 500 });
  }
}
