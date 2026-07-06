import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

function removeDiacritics(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .trim();
}

async function syncActorFromTmdb(actorId: number, name: string, tmdbApiKey: string) {
  try {
    const searchUrl = `https://api.tmdb.org/3/search/person?api_key=${tmdbApiKey}&query=${encodeURIComponent(name)}&language=vi-VN`;
    const searchRes = await fetch(searchUrl, { cache: 'no-store' });
    if (!searchRes.ok) return null;

    const searchData = await searchRes.json();
    const results = searchData.results || [];
    if (results.length === 0) return null;

    const cleanedSearchName = removeDiacritics(name);

    // Sort results by popularity first (acting candidates prioritized)
    const actingCandidates = results.filter((r: any) => r.known_for_department === 'Acting');
    const sortedCandidates = actingCandidates.length > 0 
      ? actingCandidates.sort((a: any, b: any) => (b.popularity || 0) - (a.popularity || 0))
      : results.sort((a: any, b: any) => (b.popularity || 0) - (a.popularity || 0));

    let bestCandidate = null;

    for (const candidate of sortedCandidates) {
      const candidateNameClean = removeDiacritics(candidate.name);
      
      // 1. Direct name check
      if (candidateNameClean === cleanedSearchName) {
        bestCandidate = candidate;
        break;
      }
      
      // 2. Alias check via detail API
      try {
        const detailUrl = `https://api.tmdb.org/3/person/${candidate.id}?api_key=${tmdbApiKey}&language=vi-VN`;
        const detailRes = await fetch(detailUrl, { cache: 'no-store' });
        if (detailRes.ok) {
          const detailData = await detailRes.json();
          const aliases = detailData.also_known_as || [];
          const hasMatchingAlias = aliases.some((alias: string) => removeDiacritics(alias) === cleanedSearchName);
          if (hasMatchingAlias) {
            bestCandidate = candidate;
            break;
          }
        }
      } catch (err) {
        console.error("Error fetching detail for candidate:", err);
      }
    }

    if (!bestCandidate) {
      // Mark as synced so we don't spam requests, but keep details null/empty
      const updated = await prisma.actors.update({
        where: { id: actorId },
        data: {
          imdb_synced_at: new Date()
        }
      });
      return updated;
    }

    const tmdbId = bestCandidate.id;
    const detailUrl = `https://api.tmdb.org/3/person/${tmdbId}?api_key=${tmdbApiKey}&language=vi-VN`;
    const detailRes = await fetch(detailUrl, { cache: 'no-store' });
    if (!detailRes.ok) return null;

    const detailData = await detailRes.json();
    let biography = detailData.biography || '';
    
    if (!biography.trim()) {
      const enDetailUrl = `https://api.tmdb.org/3/person/${tmdbId}?api_key=${tmdbApiKey}&language=en-US`;
      const enDetailRes = await fetch(enDetailUrl, { cache: 'no-store' });
      if (enDetailRes.ok) {
        const enDetailData = await enDetailRes.json();
        biography = enDetailData.biography || '';
      }
    }

    const genderMap: Record<number, string> = { 0: 'Chưa rõ', 1: 'Nữ', 2: 'Nam', 3: 'Khác' };
    const gender = genderMap[detailData.gender] || 'Chưa rõ';
    const avatar = detailData.profile_path ? `https://image.tmdb.org/t/p/w500${detailData.profile_path}` : null;

    const updated = await prisma.actors.update({
      where: { id: actorId },
      data: {
        tmdb_id: tmdbId,
        gender,
        birthday: detailData.birthday || null,
        place_of_birth: detailData.place_of_birth || null,
        deathday: detailData.deathday || null,
        avatar,
        bio: biography || null,
        imdb_synced_at: new Date()
      }
    });

    return updated;
  } catch (error) {
    console.error('Error syncing actor inside API:', error);
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get('id');
    if (!idParam) {
      return NextResponse.json({ error: 'Missing actor ID' }, { status: 400 });
    }

    const actorId = parseInt(idParam, 10);
    const actor = await prisma.actors.findUnique({
      where: { id: actorId }
    });

    if (!actor) {
      return NextResponse.json({ error: 'Actor not found' }, { status: 404 });
    }

    // Check if tmdb api key is configured
    const tmdbApiKeySetting = await prisma.settings.findFirst({ where: { key: 'tmdb_api_key' } });
    const tmdbApiKey = tmdbApiKeySetting?.value?.trim() || '';

    if (!tmdbApiKey) {
      return NextResponse.json({ error: 'TMDB API key is not configured' }, { status: 400 });
    }

    // If it's already synced within the last 7 days and has an avatar, just return it
    if (actor.avatar && actor.imdb_synced_at && (new Date().getTime() - new Date(actor.imdb_synced_at).getTime() < 7 * 24 * 60 * 60 * 1000)) {
      return NextResponse.json({ success: true, actor });
    }

    const synced = await syncActorFromTmdb(actor.id, actor.name, tmdbApiKey);
    if (!synced) {
      // Return the current database record if sync failed
      return NextResponse.json({ success: true, actor, synced: false });
    }

    return NextResponse.json({ success: true, actor: synced, synced: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
