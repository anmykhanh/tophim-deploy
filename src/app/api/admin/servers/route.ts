import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { checkPermissions } from '@/lib/auth';

// GET: List all servers ordered by priority desc, then name asc
export async function GET(request: Request) {
  if (!(await checkPermissions('manage_movies'))) {
    return NextResponse.json({ error: 'Từ chối truy cập!' }, { status: 403 });
  }

  try {
    const servers = await prisma.servers.findMany({
      orderBy: [
        { priority: 'desc' },
        { name: 'asc' }
      ]
    });

    return NextResponse.json({ success: true, servers });
  } catch (err: any) {
    console.error('List servers error:', err);
    return NextResponse.json({ error: 'Lỗi hệ thống!' }, { status: 500 });
  }
}

// POST: Create a new server
export async function POST(request: Request) {
  if (!(await checkPermissions('manage_movies'))) {
    return NextResponse.json({ error: 'Từ chối truy cập!' }, { status: 403 });
  }

  try {
    const data = await request.json();
    const { name, display_name, priority } = data;

    if (!name || !display_name) {
      return NextResponse.json({ error: 'Vui lòng điền đầy đủ thông tin!' }, { status: 400 });
    }

    const cleanName = name.trim();
    const cleanDisplayName = display_name.trim();
    const parsedPriority = parseInt(priority) || 0;

    // Check if duplicate name exists
    const existing = await prisma.servers.findUnique({
      where: { name: cleanName }
    });

    if (existing) {
      return NextResponse.json({ error: 'Tên máy chủ này đã tồn tại!' }, { status: 400 });
    }

    const server = await prisma.servers.create({
      data: {
        name: cleanName,
        display_name: cleanDisplayName,
        priority: parsedPriority
      }
    });

    return NextResponse.json({ success: true, message: 'Thêm máy chủ thành công!', server });
  } catch (err: any) {
    console.error('Create server error:', err);
    return NextResponse.json({ error: 'Lỗi hệ thống!' }, { status: 500 });
  }
}

// PUT: Update an existing server
export async function PUT(request: Request) {
  if (!(await checkPermissions('manage_movies'))) {
    return NextResponse.json({ error: 'Từ chối truy cập!' }, { status: 403 });
  }

  try {
    const data = await request.json();
    const { id, name, display_name, priority } = data;

    if (!id || !name || !display_name) {
      return NextResponse.json({ error: 'Vui lòng điền đầy đủ thông tin!' }, { status: 400 });
    }

    const serverId = parseInt(id);
    const cleanName = name.trim();
    const cleanDisplayName = display_name.trim();
    const parsedPriority = parseInt(priority) || 0;

    // Check if name is taken by another server
    const duplicate = await prisma.servers.findFirst({
      where: {
        name: cleanName,
        id: { not: serverId }
      }
    });

    if (duplicate) {
      return NextResponse.json({ error: 'Tên máy chủ này đã tồn tại ở bản ghi khác!' }, { status: 400 });
    }

    const server = await prisma.servers.update({
      where: { id: serverId },
      data: {
        name: cleanName,
        display_name: cleanDisplayName,
        priority: parsedPriority
      }
    });

    return NextResponse.json({ success: true, message: 'Cập nhật máy chủ thành công!', server });
  } catch (err: any) {
    console.error('Update server error:', err);
    return NextResponse.json({ error: 'Lỗi hệ thống!' }, { status: 500 });
  }
}

// DELETE: Delete a server
export async function DELETE(request: Request) {
  if (!(await checkPermissions('manage_movies'))) {
    return NextResponse.json({ error: 'Từ chối truy cập!' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const idStr = searchParams.get('id');

    if (!idStr) {
      return NextResponse.json({ error: 'Thiếu ID máy chủ!' }, { status: 400 });
    }

    const serverId = parseInt(idStr);

    await prisma.servers.delete({
      where: { id: serverId }
    });

    return NextResponse.json({ success: true, message: 'Xóa máy chủ thành công!' });
  } catch (err: any) {
    console.error('Delete server error:', err);
    return NextResponse.json({ error: 'Lỗi hệ thống!' }, { status: 500 });
  }
}
