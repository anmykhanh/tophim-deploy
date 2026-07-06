import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };

export async function OPTIONS() { return NextResponse.json({}, { headers: CORS }); }

function getVietnameseVariants(str: string): string[] {
  const toneMap: Record<string, string> = {
    'á': 'a\u0301', 'à': 'a\u0300', 'ả': 'a\u0309', 'ã': 'a\u0303', 'ạ': 'a\u0323',
    'Á': 'A\u0301', 'À': 'A\u0300', 'Ả': 'A\u0309', 'Ã': 'A\u0303', 'Ạ': 'A\u0323',
    'ắ': 'ă\u0301', 'ằ': 'ă\u0300', 'ẳ': 'ă\u0309', 'ẵ': 'ă\u0303', 'ặ': 'ă\u0323',
    'Ắ': 'Ă\u0301', 'Ằ': 'Ă\u0300', 'Ẳ': 'Ă\u0309', 'Ẵ': 'Ă\u0303', 'Ặ': 'Ă\u0323',
    'ấn': 'â\u0301n', 'ầ': 'â\u0300', 'ẩ': 'â\u0309', 'ẫ': 'â\u0303', 'ậ': 'â\u0323',
    'ấ': 'â\u0301', 'Ấ': 'Â\u0301', 'Ầ': 'Â\u0300', 'Ẩ': 'Â\u0309', 'Ẫ': 'Â\u0303', 'Ậ': 'Â\u0323',
    'é': 'e\u0301', 'è': 'e\u0300', 'ẻ': 'e\u0309', 'ẽ': 'e\u0303', 'ẹ': 'e\u0323',
    'É': 'E\u0301', 'È': 'E\u0300', 'Ẻ': 'E\u0309', 'Ẽ': 'E\u0303', 'Ẹ': 'E\u0323',
    'ế': 'ê\u0301', 'ề': 'ê\u0300', 'ể': 'ê\u0309', 'ễ': 'ê\u0303', 'ệ': 'ê\u0323',
    'Ế': 'Ê\u0301', 'Ề': 'Ê\u0300', 'Ể': 'Ê\u0309', 'Ễ': 'Ê\u0303', 'Ệ': 'Ê\u0323',
    'í': 'i\u0301', 'ì': 'i\u0300', 'ỉ': 'i\u0309', 'ĩ': 'i\u0303', 'ị': 'i\u0323',
    'Í': 'I\u0301', 'Ì': 'I\u0300', 'Ỉ': 'I\u0309', 'Ĩ': 'I\u0303', 'Ị': 'I\u0323',
    'ó': 'o\u0301', 'ò': 'o\u0300', 'ỏ': 'o\u0309', 'õ': 'o\u0303', 'ọ': 'o\u0323',
    'Ó': 'O\u0301', 'Ò': 'O\u0300', 'Ỏ': 'O\u0309', 'Õ': 'O\u0303', 'Ọ': 'O\u0323',
    'ố': 'ô\u0301', 'ồ': 'ô\u0300', 'ổ': 'ô\u0309', 'ỗ': 'ô\u0303', 'ộ': 'ô\u0323',
    'Ố': 'Ô\u0301', 'Ồ': 'Ô\u0300', 'Ổ': 'Ô\u0309', 'Ỗ': 'Ô\u0303', 'Ộ': 'Ô\u0323',
    'ớ': 'ơ\u0301', 'ờ': 'ơ\u0300', 'ở': 'ơ\u0309', 'ỡ': 'ơ\u0303', 'ợ': 'ơ\u0323',
    'Ớ': 'Ơ\u0301', 'Ờ': 'Ơ\u0300', 'Ở': 'Ơ\u0309', 'Ỡ': 'Ơ\u0303', 'Ợ': 'Ơ\u0323',
    'ú': 'u\u0301', 'ù': 'u\u0300', 'ủ': 'u\u0309', 'ũ': 'u\u0303', 'ụ': 'u\u0323',
    'Ú': 'U\u0301', 'Ù': 'U\u0300', 'Ủ': 'U\u0309', 'Ũ': 'U\u0303', 'Ụ': 'U\u0323',
    'ứ': 'ư\u0301', 'ừ': 'ư\u0300', 'ử': 'ư\u0309', 'ữ': 'ư\u0303', 'ự': 'ư\u0323',
    'Ứ': 'Ư\u0301', 'Ừ': 'Ư\u0300', 'Ử': 'Ư\u0309', 'Ữ': 'Ư\u0303', 'Ự': 'Ư\u0323',
    'ý': 'y\u0301', 'ỳ': 'y\u0300', 'ỷ': 'y\u0309', 'ỹ': 'y\u0303', 'ỵ': 'y\u0323',
    'Ý': 'Y\u0301', 'Ỳ': 'Y\u0300', 'Ỷ': 'Y\u0309', 'Ỹ': 'Y\u0303', 'Ỵ': 'Y\u0323',
  };

  const toSemiDecomposed = (s: string) => {
    return s.split('').map(char => toneMap[char] || char).join('');
  };

  const nfc = str.normalize('NFC');
  const nfd = str.normalize('NFD');
  const semi = toSemiDecomposed(nfc);

  return Array.from(new Set([nfc, nfd, semi]));
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ movies: [], actors: [] }, { headers: CORS });
    }

    const trimmedQuery = query.trim();
    const queryLower = trimmedQuery.toLowerCase();
    const queryUpper = trimmedQuery.toUpperCase();

    const allVariants = [
      ...getVietnameseVariants(trimmedQuery),
      ...getVietnameseVariants(queryLower),
      ...getVietnameseVariants(queryUpper)
    ];
    const searchTerms = Array.from(new Set(allVariants));

    // Fetch movies matching title or original_title
    const movies = await prisma.movies.findMany({
      where: {
        OR: [
          ...searchTerms.map(term => ({ title: { contains: term } })),
          ...searchTerms.map(term => ({ original_title: { contains: term } }))
        ]
      },
      select: {
        id: true,
        title: true,
        original_title: true,
        slug: true,
        thumb_url: true,
        year: true,
        episode_current: true
      },
      take: 6,
      orderBy: {
        views: 'desc' // Prioritize popular movies
      }
    });

    // Fetch actors matching name
    const actors = await prisma.actors.findMany({
      where: {
        OR: searchTerms.map(term => ({ name: { contains: term } }))
      },
      select: {
        id: true,
        name: true,
        slug: true,
        avatar: true
      },
      take: 3,
      orderBy: {
        id: 'desc'
      }
    });

    const formattedActors = actors.map(a => ({
      ...a,
      thumb_url: a.avatar
    }));

    return NextResponse.json({ movies, actors: formattedActors }, { headers: CORS });
  } catch (error) {
    console.error('Search suggestions API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: CORS });
  }
}
