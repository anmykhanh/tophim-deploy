import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { checkPermissions, getSession } from '@/lib/auth';



export async function GET(request: Request) {
  if (!(await checkPermissions('manage_settings'))) {
    return NextResponse.json({ error: 'Từ chối truy cập!' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || 'all'; // 'today' | 'week' | 'month' | 'year' | 'all'

    const now = new Date();
    let startDate: Date | null = null;

    if (range === 'today') {
      const todayStr = new Date().toLocaleDateString('sv-SE');
      startDate = new Date(todayStr + 'T00:00:00Z');
    } else if (range === 'week') {
      const past = new Date();
      past.setDate(now.getDate() - 7);
      const pastStr = past.toLocaleDateString('sv-SE');
      startDate = new Date(pastStr + 'T00:00:00Z');
    } else if (range === 'month') {
      const past = new Date();
      past.setDate(now.getDate() - 30);
      const pastStr = past.toLocaleDateString('sv-SE');
      startDate = new Date(pastStr + 'T00:00:00Z');
    } else if (range === 'year') {
      const past = new Date();
      past.setDate(now.getDate() - 365);
      const pastStr = past.toLocaleDateString('sv-SE');
      startDate = new Date(pastStr + 'T00:00:00Z');
    }

    let totalViews = 0;
    let topMovies: any[] = [];

    if (range === 'all' || !startDate) {
      // Calculate total views from all movies
      const aggregate = await prisma.movies.aggregate({
        _sum: {
          views: true
        }
      });
      totalViews = aggregate._sum.views || 0;

      // Top movies by views
      topMovies = await prisma.movies.findMany({
        orderBy: {
          views: 'desc'
        },
        take: 10,
        select: {
          id: true,
          title: true,
          slug: true,
          views: true,
          poster_url: true,
          type: true,
          updated_at: true
        }
      });
    } else {
      // Calculate total views from stats table
      const aggregate = await prisma.movie_views_stats.aggregate({
        _sum: {
          views: true
        },
        where: {
          view_date: {
            gte: startDate
          }
        }
      });
      totalViews = aggregate._sum.views || 0;

      // Group views by movie in the given date range
      const statsGroup = await prisma.movie_views_stats.groupBy({
        by: ['movie_id'],
        _sum: {
          views: true
        },
        where: {
          view_date: {
            gte: startDate
          }
        },
        orderBy: {
          _sum: {
            views: 'desc'
          }
        },
        take: 10
      });

      if (statsGroup.length > 0) {
        const movieIds = statsGroup.map((g: any) => g.movie_id);
        const movies = await prisma.movies.findMany({
          where: {
            id: { in: movieIds }
          },
          select: {
            id: true,
            title: true,
            slug: true,
            poster_url: true,
            type: true,
            updated_at: true
          }
        });

        // Map and preserve the order of statsGroup
        topMovies = statsGroup.map((stat: any) => {
          const movie = movies.find((m: any) => m.id === stat.movie_id);
          if (!movie) return null;
          return {
            ...movie,
            views: stat._sum.views || 0
          };
        }).filter((m: any) => m !== null);
      }
    }

    // Get recently updated movies
    const recentlyUpdated = await prisma.movies.findMany({
      orderBy: [
        { updated_at: 'desc' },
        { id: 'desc' }
      ],
      take: 10,
      select: {
        id: true,
        title: true,
        slug: true,
        updated_at: true,
        views: true,
        poster_url: true,
        type: true
      }
    });

    // Serialize Date objects
    const serializedTopMovies = topMovies.map((m: any) => ({
      ...m,
      updated_at: m.updated_at ? m.updated_at.toISOString() : null
    }));

    const serializedRecentlyUpdated = recentlyUpdated.map((m: any) => ({
      ...m,
      updated_at: m.updated_at ? m.updated_at.toISOString() : null
    }));

    // 1. Cleanup old sessions
    const { cleanupSessions } = await import('@/lib/activity');
    await cleanupSessions().catch((err: any) => console.error("Session cleanup error:", err));

    // 2. Count active sessions in the last 5 minutes
    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
    const onlineCount = await prisma.active_sessions.count({
      where: {
        last_active: { gte: fiveMinsAgo }
      }
    });

    // 3. Count unique registered users active since 00:00:00 today
    const todayStr = new Date().toLocaleDateString('sv-SE');
    const startOfToday = new Date(todayStr + 'T00:00:00Z');
    const todayUsersCount = await prisma.active_sessions.count({
      where: {
        is_member: true,
        last_active: { gte: startOfToday }
      }
    });

    return NextResponse.json({
      success: true,
      totalViews,
      onlineCount,
      todayUsersCount,
      topMovies: serializedTopMovies,
      recentlyUpdated: serializedRecentlyUpdated
    });
  } catch (err: any) {
    console.error('Stats fetch error:', err);
    return NextResponse.json({ error: 'Lỗi hệ thống!' }, { status: 500 });
  }
}
