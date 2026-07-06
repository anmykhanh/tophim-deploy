import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { checkAdmin } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const articleId = parseInt(id);

    if (isNaN(articleId)) {
      return NextResponse.json({ error: 'ID không hợp lệ!' }, { status: 400 });
    }

    const article = await prisma.articles.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      return NextResponse.json({ error: 'Bài viết không tồn tại!' }, { status: 404 });
    }

    return NextResponse.json({ success: true, article });
  } catch (err) {
    console.error('GET single article API error:', err);
    return NextResponse.json({ error: 'Lỗi máy chủ!' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const isAdmin = await checkAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Quyền truy cập bị từ chối!' }, { status: 403 });
    }

    const { id } = await params;
    const articleId = parseInt(id);

    if (isNaN(articleId)) {
      return NextResponse.json({ error: 'ID không hợp lệ!' }, { status: 400 });
    }

    const { title, slug, description, category, content, thumbnail, status } = await request.json();

    if (!title || !slug || !content) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc!' }, { status: 400 });
    }

    // Check slug uniqueness (excluding current article)
    const existing = await prisma.articles.findFirst({
      where: {
        slug,
        id: { not: articleId },
      },
    });
    if (existing) {
      return NextResponse.json({ error: 'Slug đã tồn tại, vui lòng chọn tiêu đề khác!' }, { status: 400 });
    }

    const updatedArticle = await prisma.articles.update({
      where: { id: articleId },
      data: {
        title,
        slug,
        description: description || '',
        category: category || 'Thông tin',
        content,
        thumbnail: thumbnail || null,
        status: status !== undefined ? !!status : true,
        updated_at: new Date(),
      },
    });

    return NextResponse.json({ success: true, article: updatedArticle });
  } catch (err) {
    console.error('PUT article API error:', err);
    return NextResponse.json({ error: 'Lỗi máy chủ!' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const isAdmin = await checkAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Quyền truy cập bị từ chối!' }, { status: 403 });
    }

    const { id } = await params;
    const articleId = parseInt(id);

    if (isNaN(articleId)) {
      return NextResponse.json({ error: 'ID không hợp lệ!' }, { status: 400 });
    }

    await prisma.articles.delete({
      where: { id: articleId },
    });

    return NextResponse.json({ success: true, message: 'Đã xóa bài viết thành công!' });
  } catch (err) {
    console.error('DELETE article API error:', err);
    return NextResponse.json({ error: 'Lỗi máy chủ!' }, { status: 500 });
  }
}
