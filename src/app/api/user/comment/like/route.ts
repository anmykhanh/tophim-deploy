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
    const { commentId } = await request.json();

    if (!commentId) {
      return NextResponse.json({ error: 'Thiếu ID bình luận!' }, { status: 400 });
    }

    const commentIdInt = parseInt(commentId);

    // Check if like already exists
    const existingLike = await prisma.comment_likes.findUnique({
      where: {
        comment_id_user_id: {
          comment_id: commentIdInt,
          user_id: userId
        }
      }
    });

    let liked = false;
    if (existingLike) {
      // Unlike
      await prisma.comment_likes.delete({
        where: {
          comment_id_user_id: {
            comment_id: commentIdInt,
            user_id: userId
          }
        }
      });
      liked = false;
    } else {
      // Like
      await prisma.comment_likes.create({
        data: {
          comment_id: commentIdInt,
          user_id: userId
        }
      });
      liked = true;
    }

    // Get updated like count
    const likeCount = await prisma.comment_likes.count({
      where: { comment_id: commentIdInt }
    });

    return NextResponse.json({
      success: true,
      liked,
      likeCount
    });
  } catch (err) {
    console.error('Like comment API error:', err);
    return NextResponse.json({ error: 'Lỗi máy chủ!' }, { status: 500 });
  }
}
