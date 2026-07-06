import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { checkPermissions } from '@/lib/auth';

export async function GET(request: Request) {
  if (!(await checkPermissions('manage_labels'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const labels = await prisma.user_labels.findMany({
      orderBy: { id: 'desc' }
    });
    return NextResponse.json({ labels });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi máy chủ' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await checkPermissions('manage_labels'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { name, color } = await request.json();
    if (!name || !color) return NextResponse.json({ error: 'Vui lòng nhập đủ thông tin' }, { status: 400 });
    const label = await prisma.user_labels.create({
      data: { name, color }
    });
    return NextResponse.json({ success: true, message: 'Tạo nhãn thành công', label });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi máy chủ' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!(await checkPermissions('manage_labels'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { id, name, color } = await request.json();
    if (!id || !name || !color) return NextResponse.json({ error: 'Vui lòng nhập đủ thông tin' }, { status: 400 });
    const label = await prisma.user_labels.update({
      where: { id: parseInt(id) },
      data: { name, color }
    });
    return NextResponse.json({ success: true, message: 'Cập nhật nhãn thành công', label });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi máy chủ' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!(await checkPermissions('manage_labels'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Thiếu ID' }, { status: 400 });
    await prisma.user_labels.delete({
      where: { id: parseInt(id) }
    });
    return NextResponse.json({ success: true, message: 'Xóa nhãn thành công' });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi máy chủ' }, { status: 500 });
  }
}
