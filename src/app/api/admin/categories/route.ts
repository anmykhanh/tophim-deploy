import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/db';

import { checkPermissions, getSession } from '@/lib/auth';

async function checkPermissionsAndGetId() {
  const session = await getSession();
  if (!session || session.role !== 'admin') return null;
  return session.userId;
}

function createSlug(str: string): string {
  str = str.toLowerCase();
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
  str = str.replace(/đ/g, "d");
  str = str.replace(/[^\p{L}\p{N} -]/gu, ""); // Remove invalid chars
  str = str.replace(/\s+/g, "-"); // Collapse whitespace and replace with -
  str = str.replace(/-+/g, "-"); // Collapse dashes
  return str.trim().replace(/^-+|-+$/g, "");
}

export async function GET() {
  const isAdmin = await checkPermissions('manage_categories');
  if (!isAdmin) {
    return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
  }

  try {
    const categories = await prisma.categories.findMany({
      orderBy: [
        { type: 'asc' },
        { order_num: 'asc' },
        { name: 'asc' }
      ]
    });
    return NextResponse.json({ success: true, categories });
  } catch (error: any) {
    return NextResponse.json({ error: 'Lỗi server: ' + error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const isAdmin = await checkPermissions('manage_categories');
  if (!isAdmin) {
    return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'sync') {
      // Sync from phimapi.com
      const resGenres = await fetch('https://phimapi.com/the-loai');
      const resCountries = await fetch('https://phimapi.com/quoc-gia');

      let syncedCount = 0;

      if (resGenres.ok) {
        const genres = await resGenres.json();
        for (const g of genres) {
          if (!g.slug || !g.name) continue;
          const existing = await prisma.categories.findFirst({
            where: { slug: g.slug, type: 'genre' }
          });
          if (!existing) {
            await prisma.categories.create({
              data: {
                name: g.name,
                slug: g.slug,
                type: 'genre',
                status: true,
                order_num: 0
              }
            });
            syncedCount++;
          }
        }
      }

      if (resCountries.ok) {
        const countries = await resCountries.json();
        for (const c of countries) {
          if (!c.slug || !c.name) continue;
          const existing = await prisma.categories.findFirst({
            where: { slug: c.slug, type: 'country' }
          });
          if (!existing) {
            await prisma.categories.create({
              data: {
                name: c.name,
                slug: c.slug,
                type: 'country',
                status: true,
                order_num: 0
              }
            });
            syncedCount++;
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: `Đồng bộ từ API thành công! Đã thêm mới ${syncedCount} danh mục.`
      });
    }

    const { name, type, color, description, status, order_num } = body;

    if (!name || !type) {
      return NextResponse.json({ error: 'Tên và loại danh mục là bắt buộc.' }, { status: 400 });
    }

    const slug = body.slug ? createSlug(body.slug) : createSlug(name);

    // Check unique slug
    const existing = await prisma.categories.findUnique({
      where: { slug }
    });

    if (existing) {
      return NextResponse.json({ error: 'Slug đã tồn tại, vui lòng chọn tên hoặc slug khác.' }, { status: 400 });
    }

    const category = await prisma.categories.create({
      data: {
        name,
        slug,
        type,
        color: color || null,
        description: description || null,
        status: status !== undefined ? status : true,
        order_num: order_num !== undefined ? parseInt(order_num, 10) : 0
      }
    });

    return NextResponse.json({ success: true, message: 'Thêm danh mục thành công.', category });
  } catch (error: any) {
    return NextResponse.json({ error: 'Lỗi server: ' + error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const isAdmin = await checkPermissions('manage_categories');
  if (!isAdmin) {
    return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, name, type, color, description, status, order_num } = body;

    if (!id || !name || !type) {
      return NextResponse.json({ error: 'ID, tên và loại danh mục là bắt buộc.' }, { status: 400 });
    }

    const slug = body.slug ? createSlug(body.slug) : createSlug(name);

    // Check unique slug with other categories
    const existing = await prisma.categories.findFirst({
      where: {
        slug,
        id: { not: id }
      }
    });

    if (existing) {
      return NextResponse.json({ error: 'Slug đã tồn tại ở danh mục khác, vui lòng chọn tên hoặc slug khác.' }, { status: 400 });
    }

    const category = await prisma.categories.update({
      where: { id },
      data: {
        name,
        slug,
        type,
        color: color || null,
        description: description || null,
        status: status !== undefined ? status : true,
        order_num: order_num !== undefined ? parseInt(order_num, 10) : 0
      }
    });

    return NextResponse.json({ success: true, message: 'Cập nhật danh mục thành công.', category });
  } catch (error: any) {
    return NextResponse.json({ error: 'Lỗi server: ' + error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const isAdmin = await checkPermissions('manage_categories');
  if (!isAdmin) {
    return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get('id');

    if (!idParam) {
      return NextResponse.json({ error: 'ID danh mục là bắt buộc.' }, { status: 400 });
    }

    const id = parseInt(idParam, 10);

    // Delete categories links
    await prisma.movie_category.deleteMany({
      where: { category_id: id }
    });

    // Delete category
    await prisma.categories.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Xóa danh mục thành công.' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Lỗi server: ' + error.message }, { status: 500 });
  }
}
