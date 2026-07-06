import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { checkPermissions, getSession } from '@/lib/auth';



// GET: List comments with pagination and search
export async function GET(request: Request) {
  if (!(await checkPermissions('manage_comments'))) {
    return NextResponse.json({ error: 'Từ chối truy cập!' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const search = searchParams.get('search') || '';
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        {
          content: {
            contains: search
          }
        },
        {
          users: {
            name: {
              contains: search
            }
          }
        },
        {
          users: {
            email: {
              contains: search
            }
          }
        },
        {
          movies: {
            title: {
              contains: search
            }
          }
        }
      ];
    }

    const [comments, total] = await prisma.$transaction([
      prisma.comments.findMany({
        where,
        orderBy: { id: 'desc' },
        skip,
        take: limit,
        include: {
          users: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true
            }
          },
          movies: {
            select: {
              id: true,
              title: true
            }
          }
        }
      }),
      prisma.comments.count({ where })
    ]);

    return NextResponse.json({ success: true, comments, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err: any) {
    console.error('List comments error:', err);
    return NextResponse.json({ error: 'Lỗi hệ thống!' }, { status: 500 });
  }
}

// PUT: Toggle visibility status of comments
export async function PUT(request: Request) {
  if (!(await checkPermissions('manage_comments'))) {
    return NextResponse.json({ error: 'Từ chối truy cập!' }, { status: 403 });
  }

  try {
    const { id, status } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Thiếu ID bình luận!' }, { status: 400 });
    }

    await prisma.comments.update({
      where: { id: parseInt(id) },
      data: { status: !!status }
    });

    return NextResponse.json({ success: true, message: 'Cập nhật trạng thái bình luận thành công!' });
  } catch (err: any) {
    console.error('Update comment error:', err);
    return NextResponse.json({ error: 'Lỗi hệ thống!' }, { status: 500 });
  }
}

// DELETE: Delete a comment
export async function DELETE(request: Request) {
  if (!(await checkPermissions('manage_comments'))) {
    return NextResponse.json({ error: 'Từ chối truy cập!' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const commentIdStr = searchParams.get('id');

    if (!commentIdStr) {
      return NextResponse.json({ error: 'Thiếu ID bình luận!' }, { status: 400 });
    }

    const commentId = parseInt(commentIdStr);

    await prisma.comments.delete({
      where: { id: commentId }
    });

    return NextResponse.json({ success: true, message: 'Xóa bình luận thành công!' });
  } catch (err: any) {
    console.error('Delete comment error:', err);
    return NextResponse.json({ error: 'Lỗi hệ thống!' }, { status: 500 });
  }
}
