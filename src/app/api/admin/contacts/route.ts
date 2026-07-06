import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { checkPermissions, getSession } from '@/lib/auth';



export async function GET(request: Request) {
  if (!(await checkPermissions('manage_contacts'))) {
    return NextResponse.json({ error: 'Từ chối truy cập!' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const skip = (page - 1) * limit;

  try {
    const [contacts, total] = await prisma.$transaction([
      prisma.contacts.findMany({
        orderBy: { created_at: 'desc' },
        skip,
        take: limit
      }),
      prisma.contacts.count()
    ]);

    return NextResponse.json({ success: true, contacts, total });
  } catch (err: any) {
    console.error("Failed to fetch contact messages:", err);
    return NextResponse.json({ error: 'Lỗi hệ thống!' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!(await checkPermissions('manage_contacts'))) {
    return NextResponse.json({ error: 'Từ chối truy cập!' }, { status: 403 });
  }

  try {
    const { id, status } = await request.json();
    if (!id || !status) {
      return NextResponse.json({ error: 'Thiếu thông tin!' }, { status: 400 });
    }

    const updated = await prisma.contacts.update({
      where: { id: parseInt(id) },
      data: { status }
    });

    return NextResponse.json({ success: true, message: 'Đã cập nhật trạng thái liên hệ!', contact: updated });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống!' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!(await checkPermissions('manage_contacts'))) {
    return NextResponse.json({ error: 'Từ chối truy cập!' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Thiếu ID liên hệ!' }, { status: 400 });
    }

    await prisma.contacts.delete({
      where: { id: parseInt(id) }
    });

    return NextResponse.json({ success: true, message: 'Đã xóa tin nhắn liên hệ!' });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống!' }, { status: 500 });
  }
}
