import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: Request) {
  try {
    const servers = await prisma.servers.findMany({
      orderBy: [
        { priority: 'desc' },
        { name: 'asc' }
      ]
    });

    return NextResponse.json({ success: true, servers });
  } catch (err: any) {
    console.error('List public servers error:', err);
    return NextResponse.json({ error: 'Lỗi hệ thống!' }, { status: 500 });
  }
}
