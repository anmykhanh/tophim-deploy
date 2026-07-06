import { NextResponse } from 'next/server';
import { checkPermissions } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function POST(request: Request) {
  if (!(await checkPermissions('manage_episodes'))) {
    return NextResponse.json({ error: 'Từ chối truy cập!' }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Không tìm thấy file' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    
    const publicSubsDir = join(process.cwd(), 'public', 'subs');
    await mkdir(publicSubsDir, { recursive: true });
    
    const filePath = join(publicSubsDir, fileName);
    await writeFile(filePath, buffer);

    return NextResponse.json({ success: true, url: `/subs/${fileName}` });
  } catch (err: any) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: 'Lỗi upload file' }, { status: 500 });
  }
}
