import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const { getSession } = await import('@/lib/auth');
  const session = await getSession();
  const userIdStr = session?.userId?.toString();

    if (!userIdStr) {
      return NextResponse.json({ error: 'Chưa đăng nhập!' }, { status: 401 });
    }

    const userId = parseInt(userIdStr);

    // Check ban status
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { banned_until: true }
    });

    if (user?.banned_until) {
      const now = new Date();
      if (user.banned_until > now) {
        return NextResponse.json({
          error: `Tài khoản của bạn đã bị cấm bình luận đến: ${user.banned_until.toLocaleString('vi-VN')}`
        }, { status: 403 });
      }
    }

    const { movieId, content, isSpoiler, gifUrl, parentId } = await request.json();

    if (!movieId) {
      return NextResponse.json({ error: 'Thiếu ID phim!' }, { status: 400 });
    }

    if (!content && !gifUrl) {
      return NextResponse.json({ error: 'Nội dung bình luận không được để trống!' }, { status: 400 });
    }

    if (content && content.length > 1000) {
      return NextResponse.json({ error: 'Bình luận tối đa 1000 ký tự!' }, { status: 400 });
    }

    const newComment = await prisma.comments.create({
      data: {
        user_id: userId,
        movie_id: parseInt(movieId),
        parent_id: parentId ? parseInt(parentId) : null,
        content: content || '',
        is_spoiler: isSpoiler !== undefined ? !!isSpoiler : false,
        gif_url: gifUrl || null,
        status: true,
      },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            avatar: true,
            role: true,
            user_labels: true,
            gender: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      comment: {
        id: newComment.id,
        content: newComment.content,
        gif_url: newComment.gif_url,
        is_spoiler: newComment.is_spoiler,
        created_at: newComment.created_at.toISOString(),
        users: newComment.users,
      },
    });
  } catch (err) {
    console.error('Create comment API error:', err);
    return NextResponse.json({ error: 'Lỗi máy chủ!' }, { status: 500 });
  }
}
