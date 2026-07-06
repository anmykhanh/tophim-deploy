import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { checkAdmin } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const isAdminView = searchParams.get('admin') === 'true';

    // If it's admin view, check admin permission
    if (isAdminView) {
      const isAdmin = await checkAdmin();
      if (!isAdmin) {
        return NextResponse.json({ error: 'Quyền truy cập bị từ chối!' }, { status: 403 });
      }
    }

    const articlesList = await prisma.articles.findMany({
      where: isAdminView ? undefined : { status: true },
      orderBy: { created_at: 'desc' },
      include: {
        users: {
          select: { id: true, name: true, role: true, avatar: true }
        }
      }
    });

    return NextResponse.json({ success: true, articles: articlesList });
  } catch (err) {
    console.error('GET articles API error:', err);
    return NextResponse.json({ error: 'Lỗi máy chủ!' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const isAdmin = await checkAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Quyền truy cập bị từ chối!' }, { status: 403 });
    }

    const { title, slug, description, category, content, thumbnail, status } = await request.json();

    if (!title || !slug || !content) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc!' }, { status: 400 });
    }

    // Check slug uniqueness
    const existing = await prisma.articles.findUnique({
      where: { slug },
    });
    if (existing) {
      return NextResponse.json({ error: 'Slug đã tồn tại, vui lòng chọn tiêu đề khác!' }, { status: 400 });
    }

    const newArticle = await prisma.articles.create({
      data: {
        title,
        slug,
        description: description || '',
        category: category || 'Thông tin',
        content,
        thumbnail: thumbnail || null,
        status: status !== undefined ? !!status : true,
      },
    });

    return NextResponse.json({ success: true, article: newArticle });
  } catch (err) {
    console.error('POST articles API error:', err);
    return NextResponse.json({ error: 'Lỗi máy chủ!' }, { status: 500 });
  }
}
