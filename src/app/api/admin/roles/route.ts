import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { checkPermissions } from '@/lib/auth';

export async function GET() {
  if (!(await checkPermissions('manage_users'))) {
    return NextResponse.json({ error: 'Từ chối truy cập!' }, { status: 403 });
  }

  try {
    const roles = await prisma.roles.findMany({
      orderBy: { id: 'asc' },
    });
    return NextResponse.json(roles);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống!' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await checkPermissions('manage_users'))) {
    return NextResponse.json({ error: 'Từ chối truy cập!' }, { status: 403 });
  }

  try {
    const data = await request.json();
    const { name, description, permissions } = data;

    if (!name) {
      return NextResponse.json({ error: 'Vui lòng nhập tên vai trò' }, { status: 400 });
    }

    const newRole = await prisma.roles.create({
      data: {
        name,
        description,
        permissions: permissions || [],
      },
    });

    return NextResponse.json(newRole);
  } catch (err: any) {
    console.error(err);
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'Tên vai trò đã tồn tại!' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Lỗi hệ thống!' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!(await checkPermissions('manage_users'))) {
    return NextResponse.json({ error: 'Từ chối truy cập!' }, { status: 403 });
  }

  try {
    const data = await request.json();
    const { id, name, description, permissions } = data;

    if (!id || !name) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
    }

    const updatedRole = await prisma.roles.update({
      where: { id: Number(id) },
      data: {
        name,
        description,
        permissions: permissions || [],
      },
    });

    return NextResponse.json(updatedRole);
  } catch (err: any) {
    console.error(err);
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'Tên vai trò đã tồn tại!' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Lỗi hệ thống!' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!(await checkPermissions('manage_users'))) {
    return NextResponse.json({ error: 'Từ chối truy cập!' }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
    }

    // Unassign this role from all users first
    await prisma.users.updateMany({
      where: { role_id: Number(id) },
      data: { role_id: null },
    });

    await prisma.roles.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống!' }, { status: 500 });
  }
}
