import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const articleIdStr = searchParams.get('articleId');

    if (!articleIdStr) {
      return NextResponse.json({ error: 'Thiếu ID bài viết!' }, { status: 400 });
    }

    const articleId = parseInt(articleIdStr);
    const session = await getSession();
    const currentUserId = session?.userId ?? null;

    const comments = await prisma.article_comments.findMany({
      where: { article_id: articleId, status: true },
      include: {
        users: {
          select: { id: true, name: true, avatar: true, role: true, user_labels: true, gender: true }
        }
      },
      orderBy: { created_at: 'asc' }
    });

    // Fetch like counts and user likes via raw SQL
    const commentIds = comments.map((c: any) => c.id);
    let likeCountMap = new Map<number, number>();
    let userLikedSet = new Set<number>();

    if (commentIds.length > 0) {
      const idList = commentIds.join(',');
      const likeCounts = await prisma.$queryRawUnsafe<{ comment_id: number; cnt: string }[]>(
        `SELECT comment_id, COUNT(*) as cnt FROM article_comment_likes WHERE comment_id IN (${idList}) GROUP BY comment_id`
      ).catch(() => []);
      likeCountMap = new Map(likeCounts.map((r: any) => [Number(r.comment_id), Number(r.cnt)]));

      if (currentUserId) {
        const userLikes = await prisma.$queryRawUnsafe<{ comment_id: number }[]>(
          `SELECT comment_id FROM article_comment_likes WHERE comment_id IN (${idList}) AND user_id = ${currentUserId}`
        ).catch(() => []);
        userLikedSet = new Set(userLikes.map((r: any) => Number(r.comment_id)));
      }
    }

    const serializedComments = comments.map((c: any) => {
      const displayUser = { ...c.users, role: c.users.role ?? 'user' as const };
      return {
        id: c.id,
        parent_id: c.parent_id,
        content: c.content,
        gif_url: c.gif_url,
        is_spoiler: c.is_spoiler,
        created_at: c.created_at.toISOString(),
        likeCount: likeCountMap.get(c.id) ?? 0,
        isLiked: userLikedSet.has(c.id),
        users: displayUser,
      };
    });

    return NextResponse.json({ success: true, comments: serializedComments });
  } catch (err) {
    console.error('GET article comments error:', err);
    return NextResponse.json({ error: 'Lỗi máy chủ!' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    const userIdStr = session?.userId?.toString();

    if (!userIdStr) {
      return NextResponse.json({ error: 'Chưa đăng nhập!' }, { status: 401 });
    }

    const userId = parseInt(userIdStr);

    // Check ban status
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { banned_until: true, role: true }
    });

    if (user?.banned_until) {
      const now = new Date();
      if (user.banned_until > now) {
        return NextResponse.json({
          error: `Tài khoản của bạn đã bị cấm bình luận đến: ${user.banned_until.toLocaleString('vi-VN')}`
        }, { status: 403 });
      }
    }

    const { articleId, content, isSpoiler, gifUrl, parentId } = await request.json();

    if (!articleId) {
      return NextResponse.json({ error: 'Thiếu ID bài viết!' }, { status: 400 });
    }

    if (!content && !gifUrl) {
      return NextResponse.json({ error: 'Nội dung bình luận không được để trống!' }, { status: 400 });
    }

    const newComment = await prisma.article_comments.create({
      data: {
        user_id: userId,
        article_id: parseInt(articleId),
        parent_id: parentId ? parseInt(parentId) : null,
        content: content || '',
        is_spoiler: isSpoiler !== undefined ? !!isSpoiler : false,
        gif_url: gifUrl || null,
        status: true,
      },
      include: {
        users: {
          select: { id: true, name: true, avatar: true, role: true, user_labels: true, gender: true },
        },
      },
    });

    const displayUser = { ...newComment.users, role: newComment.users.role ?? 'user' as const };

    return NextResponse.json({
      success: true,
      comment: {
        id: newComment.id,
        parent_id: newComment.parent_id,
        content: newComment.content,
        gif_url: newComment.gif_url,
        is_spoiler: newComment.is_spoiler,
        created_at: newComment.created_at.toISOString(),
        likeCount: 0,
        isLiked: false,
        users: displayUser,
      },
    });
  } catch (err) {
    console.error('POST article comment error:', err);
    return NextResponse.json({ error: 'Lỗi máy chủ!' }, { status: 500 });
  }
}
