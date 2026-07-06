import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get('date'); // format: YYYY-MM-DD
    if (!dateStr) {
      return NextResponse.json({ error: 'Missing date parameter' }, { status: 400 });
    }

    const targetDate = new Date(dateStr);
    if (isNaN(targetDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }

    // Set range for target date (start of day to end of day in UTC/Local depending on setup)
    // To match MySQL's DATE(m.updated_at) = targetDate
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const day = String(targetDate.getDate()).padStart(2, '0');
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const yearStr = targetDate.getFullYear();
    const datePattern = `${day}-${month}-${yearStr}`;

    // Fetch movies having TMDB showtimes on this date
    let movies = await prisma.movies.findMany({
      where: {
        AND: [
          {
            showtimes: {
              contains: datePattern
            }
          },
          {
            showtimes: {
              contains: 'tmdb_showtimes'
            }
          }
        ]
      },
      include: {
        episodes: {
          orderBy: {
            id: 'desc'
          },
          take: 1
        }
      },
      orderBy: {
        updated_at: 'desc'
      },
      take: 50
    });

    // Map to a simplified response structure
    const result = movies.map((m: any) => {
      let epsOnDate: string[] = [];
      
      if (m.showtimes && m.showtimes.includes(datePattern)) {
        try {
          if (m.showtimes.includes('tmdb_showtimes')) {
            const st = JSON.parse(m.showtimes);
            if (st.next && st.next.includes(datePattern)) {
              const match = st.next.match(/Tập (\d+)/i);
              if (match) epsOnDate.push(match[0]);
            }
            if (st.upcoming) {
              const ups = st.upcoming.filter((u: any) => u.date === datePattern);
              for (const u of ups) {
                if (!epsOnDate.includes(u.episode)) epsOnDate.push(u.episode);
              }
            }
          } else {
            // Raw string matching
            const match = m.showtimes.match(/Tập (\d+)/i);
            if (match) epsOnDate.push(match[0]);
          }
        } catch {
          // ignore
        }
      }

      if (epsOnDate.length === 0 && m.episodes && m.episodes[0]) {
        epsOnDate.push(m.episodes[0].name);
      }

      return {
        id: m.id,
        title: m.title,
        slug: m.slug,
        thumb_url: m.thumb_url,
        poster_url: m.poster_url,
        api_source: m.api_source,
        quality: m.quality || 'HD',
        eps_on_date: epsOnDate
      };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching schedule:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
