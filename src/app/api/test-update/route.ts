import prisma from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const movies = await prisma.movies.findMany({
      include: { episodes: { select: { server_name: true } } }
    });

    let updatedCount = 0;
    for (const m of movies) {
      let isSongNgu = (m.language || '').toLowerCase().includes('song ngữ') || (m.language || '').toLowerCase().includes('songngữ');
      
      if (!isSongNgu && m.episodes && m.episodes.length > 0) {
        isSongNgu = m.episodes.some(ep => {
          const lower = (ep.server_name || '').toLowerCase();
          return (
            lower.includes('ssplay') ||
            lower.includes('song ngữ') ||
            lower.includes('songngữ') ||
            lower.includes('songngù') ||
            lower.includes('sn -') ||
            lower.startsWith('sn') ||
            lower.includes('vicdn')
          );
        });
      }

      if (isSongNgu && !(m.language || '').toLowerCase().includes('song ngữ')) {
        await prisma.movies.update({
          where: { id: m.id },
          data: { language: m.language ? m.language + ' - Song Ngữ' : 'Song Ngữ' }
        });
        updatedCount++;
      }
    }
    return NextResponse.json({ success: true, updatedCount });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message, stack: err.stack });
  }
}
