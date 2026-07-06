import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET all article comments (admin only)
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.users.findUnique({ where: { id: session.userId }, select: { role: true } });
    if (user?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const [comments, total] = await Promise.all([
      prisma.article_comments.findMany({
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          users: { select: { id: true, name: true, avatar: true, role: true } },
          articles: { select: { id: true, title: true, slug: true } },
        },
      }),
      prisma.article_comments.count(),
    ]);

    return NextResponse.json({
      success: true,
      comments: comments.map((c: any) => ({
        id: c.id,
        content: c.content,
        status: c.status,
        is_spoiler: c.is_spoiler,
        created_at: c.created_at.toISOString(),
        user: c.users ? { id: c.users.id, name: c.users.name, avatar: c.users.avatar, role: c.users.role } : null,
        article: c.articles ? { id: c.articles.id, title: c.articles.title, slug: c.articles.slug } : null,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('Admin GET article comments error:', err);
    return NextResponse.json({ error: 'Lỗi máy chủ!' }, { status: 500 });
  }
}

// DELETE or toggle status of a comment
export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.users.findUnique({ where: { id: session.userId }, select: { role: true } });
    if (user?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id') || '0');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    await prisma.article_comments.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Admin DELETE article comment error:', err);
    return NextResponse.json({ error: 'Lỗi máy chủ!' }, { status: 500 });
  }
}

// PATCH - toggle hidden/visible
export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.users.findUnique({ where: { id: session.userId }, select: { role: true } });
    if (user?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id, status } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const updated = await prisma.article_comments.update({
      where: { id },
      data: { status: !!status },
    });

    return NextResponse.json({ success: true, status: updated.status });
  } catch (err) {
    console.error('Admin PATCH article comment error:', err);
    return NextResponse.json({ error: 'Lỗi máy chủ!' }, { status: 500 });
  }
}
