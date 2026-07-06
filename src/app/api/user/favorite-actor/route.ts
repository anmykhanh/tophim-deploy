import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const { getSession } = await import('@/lib/auth');
    const session = await getSession();
    const userIdStr = session?.userId?.toString();

    if (!userIdStr) {
      return NextResponse.json({ favorited: false, error: 'Chưa đăng nhập!' }, { status: 401 });
    }

    const userId = parseInt(userIdStr);
    const { searchParams } = new URL(request.url);
    const actorIdStr = searchParams.get('actor_id');

    if (!actorIdStr) {
      return NextResponse.json({ error: 'Thiếu actor_id' }, { status: 400 });
    }

    const actorId = parseInt(actorIdStr);

    const existing = await prisma.actor_favorites.findUnique({
      where: {
        user_id_actor_id: {
          user_id: userId,
          actor_id: actorId,
        },
      },
    });

    return NextResponse.json({ favorited: !!existing });
  } catch (err: any) {
    console.error('Check favorite actor error:', err);
    return NextResponse.json({ error: 'Lỗi hệ thống!' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const { getSession } = await import('@/lib/auth');
    const session = await getSession();
    const userIdStr = session?.userId?.toString();

    if (!userIdStr) {
      return NextResponse.json({ success: false, message: 'Bạn cần đăng nhập để thực hiện chức năng này.' }, { status: 401 });
    }

    const userId = parseInt(userIdStr);
    const { actor_id } = await request.json();

    if (!actor_id) {
      return NextResponse.json({ success: false, message: 'Diễn viên không hợp lệ.' }, { status: 400 });
    }

    const actorId = parseInt(actor_id);

    const existing = await prisma.actor_favorites.findUnique({
      where: {
        user_id_actor_id: {
          user_id: userId,
          actor_id: actorId,
        },
      },
    });

    if (existing) {
      await prisma.actor_favorites.delete({
        where: {
          user_id_actor_id: {
            user_id: userId,
            actor_id: actorId,
          },
        },
      });
      return NextResponse.json({ success: true, favorited: false, message: 'Đã xóa khỏi diễn viên yêu thích' });
    } else {
      await prisma.actor_favorites.create({
        data: {
          user_id: userId,
          actor_id: actorId,
        },
      });
      return NextResponse.json({ success: true, favorited: true, message: 'Đã thêm vào diễn viên yêu thích ❤️' });
    }
  } catch (err: any) {
    console.error('Toggle favorite actor error:', err);
    return NextResponse.json({ success: false, message: 'Lỗi hệ thống!' }, { status: 500 });
  }
}
