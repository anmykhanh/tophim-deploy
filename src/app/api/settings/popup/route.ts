import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const settings = await prisma.settings.findMany({
      where: {
        key: {
          in: ['homepage_popup_enabled', 'homepage_popup_content']
        }
      }
    });

    const config = settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value || '';
      return acc;
    }, {} as Record<string, string>);

    return NextResponse.json({
      success: true,
      enabled: config['homepage_popup_enabled'] === 'true',
      content: config['homepage_popup_content'] || ''
    });
  } catch (error) {
    console.error('Failed to fetch popup settings:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
