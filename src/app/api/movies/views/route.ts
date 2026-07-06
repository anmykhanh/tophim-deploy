import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { movieId } = body;

    if (!movieId) {
      return NextResponse.json({ success: false, error: 'Missing movieId' }, { status: 400 });
    }

    const todayLocalStr = new Date().toLocaleDateString('sv-SE');
    const today = new Date(todayLocalStr + 'T00:00:00Z');

    await prisma.$transaction([
      prisma.movies.update({
        where: { id: movieId },
        data: { views: { increment: 1 } }
      }),
      prisma.movie_views_stats.upsert({
        where: {
          movie_id_view_date: {
            movie_id: movieId,
            view_date: today
          }
        },
        update: {
          views: { increment: 1 }
        },
        create: {
          movie_id: movieId,
          view_date: today,
          views: 1
        }
      })
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error incrementing movie views:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
