import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Chưa đăng nhập!' }, { status: 401 });
    }
    const userId = session.userId;
    const { commentId } = await request.json();
    if (!commentId) return NextResponse.json({ error: 'Thiếu ID!' }, { status: 400 });

    const commentIdInt = parseInt(commentId);

    // Check existing like via raw SQL
    const existing = await prisma.$queryRaw<{ id: number }[]>`
      SELECT id FROM article_comment_likes
      WHERE comment_id = ${commentIdInt} AND user_id = ${userId}
      LIMIT 1
    `;

    let liked = false;
    if (existing.length > 0) {
      await prisma.$executeRaw`
        DELETE FROM article_comment_likes
        WHERE comment_id = ${commentIdInt} AND user_id = ${userId}
      `;
      liked = false;
    } else {
      await prisma.$executeRaw`
        INSERT IGNORE INTO article_comment_likes (comment_id, user_id)
        VALUES (${commentIdInt}, ${userId})
      `;
      liked = true;
    }

    const countResult = await prisma.$queryRaw<{ cnt: bigint }[]>`
      SELECT COUNT(*) as cnt FROM article_comment_likes WHERE comment_id = ${commentIdInt}
    `;
    const likeCount = Number(countResult[0]?.cnt ?? 0);

    return NextResponse.json({ success: true, liked, likeCount });
  } catch (err) {
    console.error('Article comment like error:', err);
    return NextResponse.json({ error: 'Lỗi máy chủ!' }, { status: 500 });
  }
}
