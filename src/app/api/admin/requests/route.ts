import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { checkPermissions } from '@/lib/auth';

export async function PUT(request: Request) {
  if (!(await checkPermissions('manage_requests'))) {
    return NextResponse.json({ error: 'Từ chối truy cập!' }, { status: 403 });
  }

  try {
    const { requestId, status } = await request.json();

    if (!requestId || !status) {
      return NextResponse.json({ error: 'Thiếu thông tin yêu cầu!' }, { status: 400 });
    }

    if (!['pending', 'completed', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Trạng thái không hợp lệ!' }, { status: 400 });
    }

    const updatedRequest = await prisma.movie_requests.update({
      where: { id: parseInt(requestId) },
      data: { status },
    });

    return NextResponse.json({ success: true, message: 'Cập nhật trạng thái thành công!', request: updatedRequest });
  } catch (err) {
    console.error('Update request status error:', err);
    return NextResponse.json({ error: 'Đã xảy ra lỗi hệ thống!' }, { status: 500 });
  }
}
