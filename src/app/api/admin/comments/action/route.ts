import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession, checkPermissions } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { commentId, action, banDays, type = 'movie' } = await request.json();

    const hasPermission = await checkPermissions(['manage_comments', 'manage_article_comments']);
    if (!hasPermission && session.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    if (!commentId || !action) {
      return NextResponse.json({ error: 'Thiếu thông tin!' }, { status: 400 });
    }

    let targetUserId: number | null = null;

    if (type === 'article') {
      const comment = await prisma.article_comments.findUnique({ where: { id: parseInt(commentId) } });
      if (!comment) return NextResponse.json({ error: 'Không tìm thấy bình luận!' }, { status: 404 });
      targetUserId = comment.user_id;

      if (action === 'pin') {
        await prisma.article_comments.update({ where: { id: comment.id }, data: { is_pinned: true } });
      } else if (action === 'unpin') {
        await prisma.article_comments.update({ where: { id: comment.id }, data: { is_pinned: false } });
      } else if (action === 'delete') {
        await prisma.article_comments.delete({ where: { id: comment.id } });
      }
    } else {
      const comment = await prisma.comments.findUnique({ where: { id: parseInt(commentId) } });
      if (!comment) return NextResponse.json({ error: 'Không tìm thấy bình luận!' }, { status: 404 });
      targetUserId = comment.user_id;

      if (action === 'pin') {
        await prisma.comments.update({ where: { id: comment.id }, data: { is_pinned: true } });
      } else if (action === 'unpin') {
        await prisma.comments.update({ where: { id: comment.id }, data: { is_pinned: false } });
      } else if (action === 'delete') {
        await prisma.comments.delete({ where: { id: comment.id } });
      }
    }

    if (action === 'ban' && targetUserId) {
      let bannedUntil = null;
      if (banDays > 0) {
        bannedUntil = new Date();
        bannedUntil.setDate(bannedUntil.getDate() + parseInt(banDays));
      } else if (banDays === 0) {
        // Permanent ban (e.g., set to 100 years in future)
        bannedUntil = new Date();
        bannedUntil.setFullYear(bannedUntil.getFullYear() + 100);
      }
      
      await prisma.users.update({
        where: { id: targetUserId },
        data: { banned_until: bannedUntil }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Comment action error:', error);
    return NextResponse.json({ error: 'Lỗi hệ thống!' }, { status: 500 });
  }
}
