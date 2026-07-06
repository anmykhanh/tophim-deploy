import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';

function generateSlug(str: string) {
  const clean = str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  return `${clean}-${Math.random().toString(36).substring(2, 6)}`;
}

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const { getSession } = await import('@/lib/auth');
  const session = await getSession();
  const userIdStr = session?.userId?.toString();

    if (!userIdStr) {
      return NextResponse.json({ error: 'Chưa đăng nhập!' }, { status: 401 });
    }

    const userId = parseInt(userIdStr);
    const { searchParams } = new URL(request.url);
    const movieIdStr = searchParams.get('movie_id');

    if (!movieIdStr) {
      return NextResponse.json({ error: 'Thiếu movie_id' }, { status: 400 });
    }

    const movieId = parseInt(movieIdStr);

    // Fetch user folders and check if they contain the movie
    const folders = await prisma.movie_folders.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        name: true,
        is_public: true,
        movie_folder_items: {
          where: { movie_id: movieId },
          select: { id: true }
        }
      }
    });

    const formattedFolders = folders.map(f => ({
      id: f.id,
      name: f.name,
      is_public: f.is_public,
      has_movie: f.movie_folder_items.length > 0 ? 1 : 0
    }));

    return NextResponse.json({ success: true, folders: formattedFolders });
  } catch (err: any) {
    console.error('Get movie folders error:', err);
    return NextResponse.json({ success: false, message: 'Lỗi hệ thống!' }, { status: 500 });
  }
}

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
    
    // Read JSON body
    let action = '';
    let name = '';
    let isPublic = true;
    let folderId = 0;
    let movieId = 0;
    let folderIds: number[] = [];

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      action = (formData.get('action') as string) || '';
      name = (formData.get('name') as string) || '';
      const isPublicStr = formData.get('is_public') as string;
      if (isPublicStr !== null) isPublic = isPublicStr === '1';
      const folderIdStr = formData.get('folder_id') as string;
      if (folderIdStr) folderId = parseInt(folderIdStr);
      const movieIdStr = formData.get('movie_id') as string;
      if (movieIdStr) movieId = parseInt(movieIdStr);
    } else {
      const json = await request.json();
      action = json.action || '';
      name = json.name || '';
      if (json.is_public !== undefined) isPublic = !!json.is_public;
      if (json.folder_id) folderId = parseInt(json.folder_id);
      if (json.movie_id) movieId = parseInt(json.movie_id);
      if (json.folder_ids) {
        folderIds = Array.isArray(json.folder_ids) ? json.folder_ids.map((id: any) => parseInt(id)) : [];
      }
    }

    if (action === 'create') {
      if (!name) {
        return NextResponse.json({ success: false, message: 'Tên thư mục không được để trống!' }, { status: 400 });
      }

      const slug = generateSlug(name);
      const newFolder = await prisma.movie_folders.create({
        data: {
          user_id: userId,
          name,
          slug,
          is_public: isPublic,
        },
      });

      return NextResponse.json({ 
        success: true, 
        message: 'Tạo thư mục thành công!',
        folder: {
          id: newFolder.id,
          name: newFolder.name,
          slug: newFolder.slug,
          is_public: newFolder.is_public
        }
      });
    }

    if (action === 'delete') {
      if (!folderId) {
        return NextResponse.json({ success: false, message: 'Thiếu ID thư mục!' }, { status: 400 });
      }

      // Check owner
      const folder = await prisma.movie_folders.findUnique({
        where: { id: folderId },
      });

      if (!folder || folder.user_id !== userId) {
        return NextResponse.json({ success: false, message: 'Thư mục không tồn tại hoặc không thuộc quyền sở hữu của bạn!' }, { status: 403 });
      }

      await prisma.movie_folders.delete({
        where: { id: folderId },
      });

      return NextResponse.json({ success: true, message: 'Xóa thư mục thành công!' });
    }

    if (action === 'remove_movie') {
      if (!folderId || !movieId) {
        return NextResponse.json({ success: false, message: 'Thiếu thông tin yêu cầu!' }, { status: 400 });
      }

      // Check owner
      const folder = await prisma.movie_folders.findUnique({
        where: { id: folderId },
      });

      if (!folder || folder.user_id !== userId) {
        return NextResponse.json({ success: false, message: 'Không có quyền truy cập!' }, { status: 403 });
      }

      await prisma.movie_folder_items.delete({
        where: {
          folder_id_movie_id: {
            folder_id: folderId,
            movie_id: movieId,
          },
        },
      });

      return NextResponse.json({ success: true, message: 'Xóa phim khỏi thư mục thành công!' });
    }

    if (action === 'sync_movie') {
      if (!movieId) {
        return NextResponse.json({ success: false, message: 'Phim không hợp lệ.' }, { status: 400 });
      }

      // Get user's own folder IDs to prevent modifying others' folders
      const userFolders = await prisma.movie_folders.findMany({
        where: { user_id: userId },
        select: { id: true }
      });
      const userFolderIds = userFolders.map(f => f.id);

      // Perform updates inside a transaction
      await prisma.$transaction([
        // Delete this movie from all of this user's folders
        prisma.movie_folder_items.deleteMany({
          where: {
            movie_id: movieId,
            folder_id: { in: userFolderIds }
          }
        }),
        // Add this movie to the selected folders
        prisma.movie_folder_items.createMany({
          data: folderIds
            .filter(fId => userFolderIds.includes(fId))
            .map(fId => ({
              folder_id: fId,
              movie_id: movieId
            })),
          skipDuplicates: true
        })
      ]);

      return NextResponse.json({ success: true, message: 'Đồng bộ thư mục thành công.' });
    }

    return NextResponse.json({ success: false, message: 'Hành động không hợp lệ!' }, { status: 400 });
  } catch (err) {
    console.error('Folder action API error:', err);
    return NextResponse.json({ success: false, message: 'Lỗi hệ thống!' }, { status: 500 });
  }
}
