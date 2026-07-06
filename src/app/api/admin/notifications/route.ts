import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { checkPermissions, getSession } from '@/lib/auth';



export async function GET(req: Request) {
  if (!(await checkPermissions('manage_notifications'))) {
    return NextResponse.json({ error: 'Từ chối truy cập!' }, { status: 403 });
  }

  try {
    const notifications = await prisma.notifications.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        users: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json({ success: true, notifications });
  } catch (err: any) {
    console.error('GET admin notifications error:', err);
    return NextResponse.json({ error: 'Lỗi hệ thống!' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!(await checkPermissions('manage_notifications'))) {
    return NextResponse.json({ error: 'Từ chối truy cập!' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { title, message, type, link, user_id } = body;

    if (!title || !message) {
      return NextResponse.json({ error: 'Tiêu đề và nội dung là bắt buộc!' }, { status: 400 });
    }

    let parsedUserId: number | null = null;
    if (user_id) {
      parsedUserId = parseInt(user_id);
      if (isNaN(parsedUserId)) {
        return NextResponse.json({ error: 'User ID không hợp lệ!' }, { status: 400 });
      }

      // Check if user exists
      const userExists = await prisma.users.findUnique({
        where: { id: parsedUserId }
      });
      if (!userExists) {
        return NextResponse.json({ error: `Không tìm thấy User với ID ${parsedUserId}!` }, { status: 400 });
      }
    }

    const notification = await prisma.notifications.create({
      data: {
        title,
        message,
        type: type || 'system',
        link: link || null,
        user_id: parsedUserId
      }
    });

    return NextResponse.json({ success: true, notification, message: 'Đã gửi thông báo thành công!' });
  } catch (err: any) {
    console.error('POST admin notifications error:', err);
    return NextResponse.json({ error: 'Lỗi hệ thống!' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!(await checkPermissions('manage_notifications'))) {
    return NextResponse.json({ error: 'Từ chối truy cập!' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get('id');

    if (!idStr) {
      return NextResponse.json({ error: 'Thiếu notification id' }, { status: 400 });
    }

    const id = parseInt(idStr);

    await prisma.notifications.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Đã xóa thông báo!' });
  } catch (err: any) {
    console.error('DELETE admin notifications error:', err);
    return NextResponse.json({ error: 'Lỗi hệ thống!' }, { status: 500 });
  }
}
