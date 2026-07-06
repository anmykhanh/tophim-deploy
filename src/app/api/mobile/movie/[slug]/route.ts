import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const params = await context.params;
    const { slug } = params;

    const movie = await prisma.movies.findUnique({
      where: { slug },
      include: {
        episodes: {
          orderBy: { order_num: 'asc' }
        },
        movie_category: {
          include: { categories: true }
        },
        movie_actor: {
          include: { actors: true }
        }
      }
    });

    if (!movie) {
      return NextResponse.json({ success: false, error: 'Movie not found' }, { status: 404, headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    // Format the response for mobile
    const data = {
      id: movie.id,
      name: movie.title,
      origin_name: movie.original_title,
      slug: movie.slug,
      description: movie.description,
      poster_url: movie.poster_url,
      thumb_url: movie.thumb_url,
      trailer_url: movie.trailer_url,
      year: movie.year,
      quality: movie.quality,
      episode_current: movie.episode_current,
      duration: movie.duration,
      view: movie.views,
      director: movie.director,
      categories: movie.movie_category.map(mc => mc.categories),
      actors: movie.movie_actor.map(ma => ma.actors),
      episodes: movie.episodes
    };

    return NextResponse.json({ success: true, data }, { headers: { 'Access-Control-Allow-Origin': '*' } });
  } catch (error) {
    console.error('Mobile Movie Detail API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}
