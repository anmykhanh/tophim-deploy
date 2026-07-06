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

// GET: List episodes for a movie
export async function GET(request: Request) {
  if (!(await checkPermissions('manage_episodes'))) {
    return NextResponse.json({ error: 'Từ chối truy cập!' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const movieIdStr = searchParams.get('movie_id');

    if (!movieIdStr) {
      return NextResponse.json({ error: 'Thiếu ID phim!' }, { status: 400 });
    }

    const movieId = parseInt(movieIdStr);

    const episodes = await prisma.episodes.findMany({
      where: { movie_id: movieId },
      include: {
        episode_subtitles: true
      },
      orderBy: { order_num: 'asc' }
    });

    return NextResponse.json({ success: true, episodes });
  } catch (err: any) {
    console.error('List episodes error:', err);
    return NextResponse.json({ error: 'Lỗi hệ thống!' }, { status: 500 });
  }
}

// POST: Add new episode
export async function POST(request: Request) {
  if (!(await checkPermissions('manage_episodes'))) {
    return NextResponse.json({ error: 'Từ chối truy cập!' }, { status: 403 });
  }

  try {
    const data = await request.json();
    const { movie_id, server_name, name, video_url, order_num } = data;

    if (!movie_id || !server_name || !name || !video_url) {
      return NextResponse.json({ error: 'Vui lòng điền đầy đủ thông tin!' }, { status: 400 });
    }

    const movieId = parseInt(movie_id);
    const slug = `tap-${createSlug(name)}`;

    const episode = await prisma.episodes.create({
      data: {
        movie_id: movieId,
        server_name,
        name,
        slug,
        video_url,
        order_num: order_num ? parseInt(order_num) : 0
      }
    });

    return NextResponse.json({ success: true, message: 'Thêm tập phim mới thành công!', episode });
  } catch (err: any) {
    console.error('Create episode error:', err);
    return NextResponse.json({ error: 'Lỗi hệ thống!' }, { status: 500 });
  }
}

// PUT: Update episode details
export async function PUT(request: Request) {
  if (!(await checkPermissions('manage_episodes'))) {
    return NextResponse.json({ error: 'Từ chối truy cập!' }, { status: 403 });
  }

  try {
    const data = await request.json();
    const { id, server_name, name, video_url, order_num } = data;

    if (!id || !server_name || !name || !video_url) {
      return NextResponse.json({ error: 'Vui lòng điền đầy đủ thông tin!' }, { status: 400 });
    }

    const episodeId = parseInt(id);
    const slug = `tap-${createSlug(name)}`;

    await prisma.episodes.update({
      where: { id: episodeId },
      data: {
        server_name,
        name,
        slug,
        video_url,
        order_num: order_num ? parseInt(order_num) : 0
      }
    });

    return NextResponse.json({ success: true, message: 'Cập nhật tập phim thành công!' });
  } catch (err: any) {
    console.error('Update episode error:', err);
    return NextResponse.json({ error: 'Lỗi hệ thống!' }, { status: 500 });
  }
}

// DELETE: Delete an episode
export async function DELETE(request: Request) {
  if (!(await checkPermissions('manage_episodes'))) {
    return NextResponse.json({ error: 'Từ chối truy cập!' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const episodeIdStr = searchParams.get('id');

    if (!episodeIdStr) {
      return NextResponse.json({ error: 'Thiếu ID tập phim!' }, { status: 400 });
    }

    const episodeId = parseInt(episodeIdStr);

    await prisma.episodes.delete({
      where: { id: episodeId }
    });

    return NextResponse.json({ success: true, message: 'Xóa tập phim thành công!' });
  } catch (err: any) {
    console.error('Delete episode error:', err);
    return NextResponse.json({ error: 'Lỗi hệ thống!' }, { status: 500 });
  }
}
