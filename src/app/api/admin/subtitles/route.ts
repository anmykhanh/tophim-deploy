import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { checkPermissions } from '@/lib/auth';

// GET: List subtitles for an episode
export async function GET(request: Request) {
  if (!(await checkPermissions('manage_episodes'))) {
    return NextResponse.json({ error: 'Từ chối truy cập!' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const episodeIdStr = searchParams.get('episode_id');

    if (!episodeIdStr) {
      return NextResponse.json({ error: 'Thiếu ID tập phim!' }, { status: 400 });
    }

    const episodeId = parseInt(episodeIdStr);

    const subtitles = await prisma.episode_subtitles.findMany({
      where: { episode_id: episodeId },
      orderBy: { id: 'asc' }
    });

    return NextResponse.json({ success: true, subtitles });
  } catch (err: any) {
    console.error('List subtitles error:', err);
    return NextResponse.json({ error: 'Lỗi hệ thống!' }, { status: 500 });
  }
}

// POST: Add new subtitle to an episode
export async function POST(request: Request) {
  if (!(await checkPermissions('manage_episodes'))) {
    return NextResponse.json({ error: 'Từ chối truy cập!' }, { status: 403 });
  }

  try {
    const data = await request.json();
    const { episode_id, label, language, url } = data;

    if (!episode_id || !label || !language || !url) {
      return NextResponse.json({ error: 'Vui lòng điền đầy đủ thông tin!' }, { status: 400 });
    }

    const episodeId = parseInt(episode_id);

    const subtitle = await prisma.episode_subtitles.create({
      data: {
        episode_id: episodeId,
        label,
        language,
        url
      }
    });

    return NextResponse.json({ success: true, message: 'Thêm phụ đề thành công!', subtitle });
  } catch (err: any) {
    console.error('Create subtitle error:', err);
    return NextResponse.json({ error: 'Lỗi hệ thống!' }, { status: 500 });
  }
}

// PUT: Update subtitle details
export async function PUT(request: Request) {
  if (!(await checkPermissions('manage_episodes'))) {
    return NextResponse.json({ error: 'Từ chối truy cập!' }, { status: 403 });
  }

  try {
    const data = await request.json();
    const { id, label, language, url } = data;

    if (!id || !label || !language || !url) {
      return NextResponse.json({ error: 'Vui lòng điền đầy đủ thông tin!' }, { status: 400 });
    }

    const subtitleId = parseInt(id);

    await prisma.episode_subtitles.update({
      where: { id: subtitleId },
      data: {
        label,
        language,
        url
      }
    });

    return NextResponse.json({ success: true, message: 'Cập nhật phụ đề thành công!' });
  } catch (err: any) {
    console.error('Update subtitle error:', err);
    return NextResponse.json({ error: 'Lỗi hệ thống!' }, { status: 500 });
  }
}

// DELETE: Delete a subtitle
export async function DELETE(request: Request) {
  if (!(await checkPermissions('manage_episodes'))) {
    return NextResponse.json({ error: 'Từ chối truy cập!' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const subtitleIdStr = searchParams.get('id');

    if (!subtitleIdStr) {
      return NextResponse.json({ error: 'Thiếu ID phụ đề!' }, { status: 400 });
    }

    const subtitleId = parseInt(subtitleIdStr);

    await prisma.episode_subtitles.delete({
      where: { id: subtitleId }
    });

    return NextResponse.json({ success: true, message: 'Xóa phụ đề thành công!' });
  } catch (err: any) {
    console.error('Delete subtitle error:', err);
    return NextResponse.json({ error: 'Lỗi hệ thống!' }, { status: 500 });
  }
}
