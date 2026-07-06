import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { checkPermissions, getSession } from '@/lib/auth';



export async function GET(req: Request) {
  if (!(await checkPermissions('manage_error_reports'))) {
    return NextResponse.json({ error: 'Từ chối truy cập!' }, { status: 403 });
  }

  try {
    const reports = await prisma.error_reports.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        movies: {
          select: {
            id: true,
            title: true,
            slug: true
          }
        }
      }
    });

    const episodeIds = reports.map((r: any) => r.episode_id).filter((id: any) => id !== null) as number[];
    const episodes = await prisma.episodes.findMany({
      where: { id: { in: episodeIds } },
      select: { id: true, name: true }
    });
    const episodeMap = new Map(episodes.map((e: any) => [e.id, e.name]));

    const reportsWithEpisodes = reports.map((r: any) => ({
      ...r,
      episode_name: r.episode_id ? (episodeMap.get(r.episode_id) || `Tập ${r.episode_id}`) : null
    }));

    return NextResponse.json({ success: true, reports: reportsWithEpisodes });
  } catch (err: any) {
    console.error('GET admin error reports error:', err);
    return NextResponse.json({ error: 'Lỗi hệ thống!' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  if (!(await checkPermissions('manage_error_reports'))) {
    return NextResponse.json({ error: 'Từ chối truy cập!' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'Thiếu thông tin cập nhật!' }, { status: 400 });
    }

    // Cập nhật trạng thái báo lỗi và lấy thông tin phim
    const report = await prisma.error_reports.update({
      where: { id: parseInt(id) },
      data: { status },
      include: {
        movies: {
          select: {
            title: true,
            slug: true,
            id: true
          }
        }
      }
    });

    // Nếu cập nhật thành resolved và báo lỗi có user_id, gửi thông báo cho user đó
    if (status === 'resolved' && report.user_id) {
      const movieTitle = report.movies?.title || 'Phim';
      
      await prisma.notifications.create({
        data: {
          user_id: report.user_id,
          type: 'system',
          title: 'Báo cáo lỗi phim đã được xử lý 🛠️',
          message: `Cảm ơn bạn đã báo cáo! Lỗi bạn phản hồi về phim "${movieTitle}" đã được đội ngũ quản trị khắc phục và xử lý thành công. Chúc bạn xem phim vui vẻ!`,
          link: `/phim/${report.movies?.slug || ''}`
        }
      });
    }

    return NextResponse.json({ success: true, message: 'Đã cập nhật trạng thái và gửi thông báo cho thành viên!' });
  } catch (err: any) {
    console.error('PUT admin error reports error:', err);
    return NextResponse.json({ error: 'Lỗi hệ thống!' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!(await checkPermissions('manage_error_reports'))) {
    return NextResponse.json({ error: 'Từ chối truy cập!' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get('id');

    if (!idStr) {
      return NextResponse.json({ error: 'Thiếu id báo cáo' }, { status: 400 });
    }

    const id = parseInt(idStr);

    await prisma.error_reports.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Đã xóa báo cáo lỗi thành công!' });
  } catch (err: any) {
    console.error('DELETE admin error reports error:', err);
    return NextResponse.json({ error: 'Lỗi hệ thống!' }, { status: 500 });
  }
}
