import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { $Enums } from '@prisma/client';
import { checkPermissions, getSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';



// GET: List users with search and pagination
export async function GET(request: Request) {
  if (!(await checkPermissions('manage_users'))) {
    return NextResponse.json({ error: 'Từ chối truy cập!' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    
    // Check if request is for a specific user's logs
    const targetUserId = searchParams.get('userId');
    if (targetUserId) {
      const logs = await prisma.user_logs.findMany({
        where: { user_id: parseInt(targetUserId, 10) },
        orderBy: { created_at: 'desc' },
        take: 50
      });
      return NextResponse.json({ success: true, logs });
    }

    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (search) {
      whereClause.OR = [
        { name: { contains: search } },
        { email: { contains: search } }
      ];
    }

    const [users, total] = await prisma.$transaction([
      prisma.users.findMany({
        where: whereClause,
        orderBy: { id: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          role_id: true,
          roles: true,
          created_at: true,
          gender: true,
          avatar: true,
          banned_until: true,
          email_verified: true,
          last_ip: true,
          label_id: true,
          user_labels: true
        }
      }),
      prisma.users.count({ where: whereClause })
    ]);

    return NextResponse.json({ success: true, users, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err: any) {
    console.error('List users error:', err);
    return NextResponse.json({ error: 'Lỗi hệ thống!' }, { status: 500 });
  }
}

// PUT: Update user role or ban status
export async function PUT(request: Request) {
  if (!(await checkPermissions('manage_users'))) {
    return NextResponse.json({ error: 'Từ chối truy cập!' }, { status: 403 });
  }

  try {
    const { id, role, role_id, banned_until, password, label_id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Thiếu ID người dùng!' }, { status: 400 });
    }

    const updateData: any = {};

    if (role !== undefined) {
      if (role !== 'user' && role !== 'admin') {
        return NextResponse.json({ error: 'Quyền hạn không hợp lệ!' }, { status: 400 });
      }
      updateData.role = role as $Enums.users_role;
    }

    if (role_id !== undefined) {
      updateData.role_id = role_id;
    }

    if (banned_until !== undefined) {
      updateData.banned_until = banned_until ? new Date(banned_until) : null;
    }

    if (password) {
      if (password.length < 6) {
        return NextResponse.json({ error: 'Mật khẩu mới phải chứa ít nhất 6 ký tự!' }, { status: 400 });
      }
      updateData.password = bcrypt.hashSync(password, 10);
    }

    if (label_id !== undefined) {
      updateData.label_id = label_id ? parseInt(label_id) : null;
    }

    await prisma.users.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    return NextResponse.json({ success: true, message: 'Cập nhật thành viên thành công!' });
  } catch (err: any) {
    console.error('Update user error:', err);
    return NextResponse.json({ error: 'Lỗi hệ thống!' }, { status: 500 });
  }
}

// DELETE: Delete a user
export async function DELETE(request: Request) {
  if (!(await checkPermissions('manage_users'))) {
    return NextResponse.json({ error: 'Từ chối truy cập!' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const userIdStr = searchParams.get('id');

    if (!userIdStr) {
      return NextResponse.json({ error: 'Thiếu ID thành viên!' }, { status: 400 });
    }

    const userId = parseInt(userIdStr);

    // Prevent deleting oneself
    const cookieStore = await cookies();
    const session = await getSession();
    const currentAdminId = session?.userId || 0;

    if (userId === currentAdminId) {
      return NextResponse.json({ error: 'Bạn không thể tự xóa tài khoản của chính mình!' }, { status: 400 });
    }

    await prisma.users.delete({
      where: { id: userId }
    });

    return NextResponse.json({ success: true, message: 'Xóa thành viên thành công!' });
  } catch (err: any) {
    console.error('Delete user error:', err);
    return NextResponse.json({ error: 'Lỗi hệ thống!' }, { status: 500 });
  }
}

// POST: Verify user's password (for admin)
export async function POST(request: Request) {
  if (!(await checkPermissions('manage_users'))) {
    return NextResponse.json({ error: 'Từ chối truy cập!' }, { status: 403 });
  }

  try {
    const { userId, password } = await request.json();
    if (!userId || !password) {
      return NextResponse.json({ error: 'Thiếu thông tin yêu cầu!' }, { status: 400 });
    }

    const user = await prisma.users.findUnique({
      where: { id: parseInt(userId, 10) },
      select: { password: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'Không tìm thấy thành viên!' }, { status: 404 });
    }

    const isValid = bcrypt.compareSync(password, user.password);

    return NextResponse.json({ success: true, isValid });
  } catch (err: any) {
    console.error('Verify user password error:', err);
    return NextResponse.json({ error: 'Lỗi hệ thống!' }, { status: 500 });
  }
}
