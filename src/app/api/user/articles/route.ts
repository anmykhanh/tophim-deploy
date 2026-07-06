import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';

// Create a new article (Pending status)
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Chưa đăng nhập!' }, { status: 401 });
    }

    const userId = session.userId;
    const body = await request.json();
    const { title, description, category, content, thumbnail } = body;

    if (!title || !content || !category) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc!' }, { status: 400 });
    }

    // Generate basic slug
    const baseSlug = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .replace(/([^0-9a-z-\s])/g, '')
      .replace(/(\s+)/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');

    let finalSlug = baseSlug;
    let counter = 1;
    while (true) {
      const existing = await prisma.articles.findUnique({ where: { slug: finalSlug } });
      if (!existing) break;
      finalSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    const newArticle = await prisma.articles.create({
      data: {
        title,
        slug: finalSlug,
        description: description || null,
        category,
        content,
        thumbnail: thumbnail || null,
        status: false, // Pending approval
        author_id: userId,
      }
    });

    return NextResponse.json({ success: true, article: newArticle });
  } catch (err) {
    console.error('Create user article error:', err);
    return NextResponse.json({ error: 'Lỗi máy chủ!' }, { status: 500 });
  }
}

// Get user's articles
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Chưa đăng nhập!' }, { status: 401 });
    }

    const userId = session.userId;
    const articles = await prisma.articles.findMany({
      where: { author_id: userId },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        category: true,
        status: true,
        created_at: true,
        views: true
      }
    });

    return NextResponse.json({ success: true, articles });
  } catch (err) {
    console.error('Get user articles error:', err);
    return NextResponse.json({ error: 'Lỗi máy chủ!' }, { status: 500 });
  }
}
