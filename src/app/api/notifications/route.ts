import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';

async function getUserId() {
  const cookieStore = await cookies();
  const { getSession } = await import('@/lib/auth');
  const session = await getSession();
  const userIdStr = session?.userId?.toString();
  return userIdStr ? parseInt(userIdStr) : null;
}

export async function GET(req: Request) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Chưa đăng nhập!' }, { status: 401 });
    }

    // Lấy thông báo hệ thống (global) + thông báo riêng cho user
    const notificationsList = await prisma.notifications.findMany({
      where: {
        OR: [
          { user_id: null },
          { user_id: userId }
        ]
      },
      orderBy: { created_at: 'desc' },
      take: 100
    });

    // Lấy danh sách các thông báo đã đọc của user này
    const reads = await prisma.notification_reads.findMany({
      where: {
        user_id: userId,
        notification_id: { in: notificationsList.map(n => n.id) }
      }
    });

    const readIds = new Set(reads.map(r => r.notification_id));

    const notifications = notificationsList.map(n => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      link: n.link,
      created_at: n.created_at,
      is_read: readIds.has(n.id)
    }));

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return NextResponse.json({ success: true, notifications, unreadCount });
  } catch (err: any) {
    console.error('GET notifications error:', err);
    return NextResponse.json({ error: 'Lỗi hệ thống!' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Chưa đăng nhập!' }, { status: 401 });
    }

    const { action, id } = await req.json();

    if (action === 'read_all') {
      // Đọc tất cả: tìm các thông báo chưa đọc của user này và đánh dấu đã đọc
      const notificationsList = await prisma.notifications.findMany({
        where: {
          OR: [
            { user_id: null },
            { user_id: userId }
          ]
        },
        select: { id: true }
      });

      const reads = await prisma.notification_reads.findMany({
        where: {
          user_id: userId,
          notification_id: { in: notificationsList.map(n => n.id) }
        },
        select: { notification_id: true }
      });

      const readIds = new Set(reads.map(r => r.notification_id));
      const unreadIds = notificationsList.map(n => n.id).filter(id => !readIds.has(id));

      if (unreadIds.length > 0) {
        await prisma.notification_reads.createMany({
          data: unreadIds.map(notifId => ({
            notification_id: notifId,
            user_id: userId
          })),
          skipDuplicates: true
        });
      }

      return NextResponse.json({ success: true, message: 'Đã đánh dấu đọc tất cả!' });
    } else if (action === 'read') {
      if (!id) {
        return NextResponse.json({ error: 'Thiếu notification id' }, { status: 400 });
      }

      await prisma.notification_reads.upsert({
        where: {
          notification_id_user_id: {
            notification_id: id,
            user_id: userId
          }
        },
        update: {},
        create: {
          notification_id: id,
          user_id: userId
        }
      });

      return NextResponse.json({ success: true, message: 'Đã đọc thông báo!' });
    }

    return NextResponse.json({ error: 'Hành động không hợp lệ' }, { status: 400 });
  } catch (err: any) {
    console.error('PUT notifications error:', err);
    return NextResponse.json({ error: 'Lỗi hệ thống!' }, { status: 500 });
  }
}
