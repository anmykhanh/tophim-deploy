import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  try {
    // Delete watch rooms that haven't been updated in 3 hours (abandoned or finished)
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const result = await prisma.watch_rooms.deleteMany({
      where: {
        updated_at: {
          lt: threeHoursAgo
        }
      }
    });

    // Save cleanup run time to settings
    await prisma.settings.upsert({
      where: { key: 'last_cron_cleanup' },
      update: { value: new Date().toISOString() },
      create: {
        key: 'last_cron_cleanup',
        value: new Date().toISOString(),
        description: 'Thời gian chạy dọn dẹp phòng xem chung gần nhất'
      }
    });

    return NextResponse.json({
      success: true,
      message: `Đã dọn dẹp ${result.count} phòng xem chung không hoạt động.`
    });
  } catch (err: any) {
    console.error('Watch room cleanup error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
