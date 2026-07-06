import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { checkPermissions, getSession } from '@/lib/auth';



export async function POST(request: Request) {
  if (!(await checkPermissions(['manage_settings', 'manage_ads']))) {
    return NextResponse.json({ error: 'Từ chối truy cập!' }, { status: 403 });
  }

  try {
    const settingsData = await request.json();
    
    for (const key of Object.keys(settingsData)) {
      const value = settingsData[key] !== null && settingsData[key] !== undefined ? settingsData[key].toString() : '';
      
      await prisma.settings.upsert({
        where: { key },
        update: { value },
        create: { key, value }
      });
    }

    const { revalidatePath } = await import('next/cache');
    revalidatePath('/', 'layout');

    return NextResponse.json({ success: true, message: 'Đã lưu cài đặt thành công!' });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi hệ thống!' }, { status: 500 });
  }
}
