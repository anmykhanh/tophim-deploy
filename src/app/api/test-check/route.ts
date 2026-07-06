import prisma from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const movies = await prisma.movies.findMany({
      where: { title: { contains: 'Sếp Ơi' } }
    });
    return NextResponse.json({ 
      movies: movies.map(m => ({ 
        title: m.title, 
        language: m.language, 
        match1: (m.language || '').toLowerCase().includes('song ngữ')
      })) 
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
