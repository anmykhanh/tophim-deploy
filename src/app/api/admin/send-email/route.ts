import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/db';
import { sendMail } from '@/lib/mailer';

export async function POST(request: Request) {
  const { checkPermissions } = await import('@/lib/auth');
  const isAdmin = await checkPermissions('manage_sendmail');

  if (!isAdmin) {
    return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
  }

  try {
    const { to, subject, content } = await request.json();

    if (!subject || !content) {
      return NextResponse.json({ error: 'Tiêu đề và nội dung là bắt buộc.' }, { status: 400 });
    }

    if (to === 'all') {
      const usersList = await prisma.users.findMany({
        select: { email: true }
      });

      if (usersList.length === 0) {
        return NextResponse.json({ success: true, message: 'Không có thành viên nào để gửi email.' });
      }

      // Send to all users
      let successCount = 0;
      let failCount = 0;
      for (const u of usersList) {
        const res = await sendMail(u.email, subject, content, true);
        if (res.success) successCount++;
        else failCount++;
      }

      return NextResponse.json({
        success: true,
        message: `Đã gửi xong. Thành công: ${successCount}, Thất bại: ${failCount}`
      });
    } else {
      if (!to || !to.includes('@')) {
        return NextResponse.json({ error: 'Địa chỉ email không hợp lệ.' }, { status: 400 });
      }

      const res = await sendMail(to, subject, content, true);
      if (res.success) {
        return NextResponse.json({ success: true, message: 'Gửi email thành công.' });
      } else {
        return NextResponse.json({ error: res.message }, { status: 500 });
      }
    }

  } catch (error: any) {
    return NextResponse.json({ error: 'Lỗi server: ' + error.message }, { status: 500 });
  }
}
