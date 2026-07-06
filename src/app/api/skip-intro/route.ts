import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import fs from 'fs';
import path from 'path';

// Local cache for tmdb_id -> mal_id mappings
const MAPPINGS_FILE = path.join(process.cwd(), 'scratch', 'mal_mappings.json');

function readMappings() {
  try {
    if (fs.existsSync(MAPPINGS_FILE)) {
      return JSON.parse(fs.readFileSync(MAPPINGS_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Failed to read mappings file', e);
  }
  return {};
}

function writeMapping(tmdbId: number, malId: number) {
  try {
    const mappings = readMappings();
    mappings[tmdbId] = malId;
    const dir = path.dirname(MAPPINGS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(MAPPINGS_FILE, JSON.stringify(mappings, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to write mappings file', e);
  }
}

// Convert episode name to slug (e.g., "Tập 01" -> "tap-01", "Tập 1" -> "tap-1")
function getEpisodeSlug(name: string): string {
  const clean = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  if (clean.match(/^\d+$/)) {
    return `tap-${clean}`;
  }
  return clean;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const movieIdStr = searchParams.get('movieId');
    const episodeName = searchParams.get('episodeName') || '';
    const episodeLengthStr = searchParams.get('episodeLength') || '1420';

    if (!movieIdStr) {
      return NextResponse.json({ error: 'Missing movieId' }, { status: 400 });
    }

    const movieId = parseInt(movieIdStr, 10);
    const episodeLength = parseFloat(episodeLengthStr);

    const movie = await prisma.movies.findUnique({
      where: { id: movieId },
      select: { slug: true, tmdb_id: true, imdb_id: true, original_title: true, title: true }
    });

    if (!movie) {
      return NextResponse.json({ error: 'Movie not found' }, { status: 404 });
    }

    const epNumMatch = episodeName.match(/\d+/);
    const episodeNumber = epNumMatch ? parseInt(epNumMatch[0], 10) : 1;
    const episodeSlug = getEpisodeSlug(episodeName);

    let opResult = null;
    let edResult = null;
    let found = false;

    // --- 1. TRY CHOPHIM.FUN API (Slug-based, covers many Vietnamese scraped movies) ---
    try {
      // Try with episode slug first
      let chophimUrl = `https://chophim.fun/api/skip-times?movie_slug=${movie.slug}&episode_slug=${episodeSlug}`;
      let chophimRes = await fetch(chophimUrl);
      let chophimData = null;
      if (chophimRes.ok) {
        chophimData = await chophimRes.json();
      }

      // If no episode-specific, try global movie slug
      if (!chophimData) {
        chophimUrl = `https://chophim.fun/api/skip-times?movie_slug=${movie.slug}`;
        chophimRes = await fetch(chophimUrl);
        if (chophimRes.ok) {
          chophimData = await chophimRes.json();
        }
      }

      if (chophimData) {
        if (chophimData.intro_end && chophimData.intro_end > 0) {
          opResult = { start: 0, end: chophimData.intro_end };
          found = true;
        }
        if (chophimData.outro_start && chophimData.outro_start > 0) {
          edResult = { start: chophimData.outro_start, end: episodeLength };
          found = true;
        }
      }
    } catch (e) {
      console.error('Failed to query chophim.fun API', e);
    }

    // --- 2. TRY ANISKIP (For Anime) ---
    if (!found && movie.tmdb_id) {
      const tmdbId = movie.tmdb_id;
      const mappings = readMappings();
      let malId = mappings[tmdbId];

      if (!malId) {
        // Use Jikan API to search for MAL ID
        const searchQuery = movie.original_title || movie.title;
        try {
          const jikanRes = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(searchQuery)}&limit=1`);
          if (jikanRes.ok) {
            const jikanData = await jikanRes.json();
            if (jikanData.data && jikanData.data.length > 0) {
              malId = jikanData.data[0].mal_id;
              writeMapping(tmdbId, malId);
            }
          }
        } catch (e) {
          console.error('Failed to query Jikan API', e);
        }
      }

      if (malId) {
        try {
          const aniskipUrl = `https://api.aniskip.com/v2/skip-times/${malId}/${episodeNumber}?types[]=op&types[]=ed&episodeLength=${episodeLength}`;
          const aniskipRes = await fetch(aniskipUrl);
          if (aniskipRes.ok) {
            const aniskipData = await aniskipRes.json();
            if (aniskipData.found && aniskipData.results) {
              const op = aniskipData.results.find((r: any) => r.skipType === 'op');
              const ed = aniskipData.results.find((r: any) => r.skipType === 'ed');
              if (op) opResult = { start: op.interval.startTime, end: op.interval.endTime };
              if (ed) edResult = { start: ed.interval.startTime, end: ed.interval.endTime };
              found = true;
            }
          }
        } catch (e) {
          console.error('Failed to query AniSkip API', e);
        }
      }
    }

    // --- 3. TRY INTRODB FALLBACK (For Western Shows / K-Dramas / Movies) ---
    if (!found && movie.imdb_id) {
      try {
        const introdbUrl = `https://api.introdb.app/segments?imdb_id=${movie.imdb_id}&season=1&episode=${episodeNumber}`;
        const introdbRes = await fetch(introdbUrl);
        if (introdbRes.ok) {
          const introdbData = await introdbRes.json();
          if (introdbData) {
            if (introdbData.intro) {
              opResult = { start: introdbData.intro.start_sec, end: introdbData.intro.end_sec };
              found = true;
            }
            if (introdbData.outro) {
              edResult = { start: introdbData.outro.start_sec, end: introdbData.outro.end_sec };
              found = true;
            }
          }
        }
      } catch (e) {
        console.error('Failed to query IntroDB API', e);
      }
    }

    return NextResponse.json({
      found,
      op: opResult,
      ed: edResult,
    });
  } catch (error) {
    console.error('Error in skip-intro API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
