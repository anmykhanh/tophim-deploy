import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { checkPermissions } from '@/lib/auth';

function createSlug(str: string): string {
  str = str.toLowerCase();
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
  str = str.replace(/đ/g, "d");
  str = str.replace(/[^\p{L}\p{N} -]/gu, ""); // Remove invalid chars but preserve all Unicode letters/numbers
  str = str.replace(/\s+/g, "-"); // Collapse whitespace and replace with -
  str = str.replace(/-+/g, "-"); // Collapse dashes
  return str.trim().replace(/^-+|-+$/g, "");
}

export async function GET(request: Request) {
  if (!(await checkPermissions('manage_crawler'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const source = searchParams.get('source') || 'all';
  const slugParam = searchParams.get('slug');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const keywordParam = searchParams.get('keyword');
  const skipExisting = searchParams.get('skip_existing') === '1';
  const justSearch = searchParams.get('just_search') === '1';




  try {
    let items: any[] = [];

    if (slugParam) {
      // Single movie crawl mode
      items = [{
        slug: slugParam.trim(),
        name: slugParam,
        origin_name: ''
      }];
    } else if (keywordParam) {
      // Keyword search crawl mode
      const sourcesToTry = source === 'all' ? ['kkphim', 'ophim', 'nguonc', 'vsmov'] : [source];
      for (const s of sourcesToTry) {
        let url = '';
        if (s === 'kkphim') url = `https://phimapi.com/v1/api/tim-kiem?keyword=${encodeURIComponent(keywordParam.trim())}`;
        else if (s === 'nguonc') url = `https://phim.nguonc.com/api/films/search?keyword=${encodeURIComponent(keywordParam.trim())}`;
        else if (s === 'ophim') url = `https://ophim1.com/v1/api/tim-kiem?keyword=${encodeURIComponent(keywordParam.trim())}`;
        else if (s === 'vsmov') url = `https://vsmov.com/api/tim-kiem?keyword=${encodeURIComponent(keywordParam.trim())}`;

        if (!url) continue;

        try {
          const resList = await fetch(url);
          if (resList.ok) {
            const listData = await resList.json();
            const fetchedItems = listData.data?.items || listData.items || listData.data || [];
            if (fetchedItems.length > 0) {
              items = fetchedItems.map((item: any) => ({ ...item, _source: s }));
              break; // Found items in this source, stop searching others
            }
          }
        } catch (e) {
          console.error(`Error searching ${s}:`, e);
        }
      }

      if (items.length === 0) {
        return NextResponse.json({ success: false, message: 'Không tìm thấy phim với từ khóa này trên các nguồn.' });
      }

      if (justSearch) {
        return NextResponse.json({ success: true, items });
      }
    } else {
      // Page-based list crawl mode
      const sourcesToTry = source === 'all' ? ['kkphim', 'ophim', 'nguonc', 'vsmov', 'vicdn'] : [source];
      for (const s of sourcesToTry) {
        let url = '';
        if (s === 'kkphim') url = `https://phimapi.com/danh-sach/phim-moi-cap-nhat-v3?page=${page}`;
        else if (s === 'nguonc') url = `https://phim.nguonc.com/api/films/phim-moi-cap-nhat?page=${page}`;
        else if (s === 'ophim') url = `https://ophim1.com/danh-sach/phim-moi-cap-nhat?page=${page}`;
        else if (s === 'vsmov') url = `https://vsmov.com/api/danh-sach/phim-moi-cap-nhat?page=${page}`;
        else if (s === 'vicdn') url = `https://vicdn.cc/api/update/${page}`;

        if (!url) continue;

        try {
          const resList = await fetch(url);
          if (resList.ok) {
            const listData = await resList.json();
            const fetchedItems = listData.data || listData.items || [];
            if (fetchedItems.length > 0) {
              items.push(...fetchedItems.map((item: any) => ({ ...item, _source: s })));
            }
          }
        } catch (e) {
          console.error(`Error fetching page ${page} from ${s}:`, e);
        }
      }

      if (items.length === 0) {
        return NextResponse.json({ success: false, message: 'Không tìm thấy phim trên trang này.' });
      }
    }

    const crawledMovies: string[] = [];
    let successCount = 0;

    const tmdbApiKeySetting = await prisma.settings.findFirst({ where: { key: 'tmdb_api_key' } });
    const tmdbApiKey = tmdbApiKeySetting?.value || '';

    for (const item of items) {
      try {
        const slug = item.slug;
        const title = item.name || item.vname || '';
        const originalTitle = item.origin_name || item.original_name || item.ename || '';
        const itemSource = item._source || source;

        // Find if movie exists in our database
        let existingMovie = null;

        // 1. Match by slug
        existingMovie = await prisma.movies.findUnique({
          where: { slug }
        });

        // 2. Match by original title
        if (!existingMovie && originalTitle) {
          existingMovie = await prisma.movies.findFirst({
            where: {
              original_title: {
                equals: originalTitle,
              }
            }
          });
        }

        // 3. Match by slug prefix/substring
        if (!existingMovie && slug) {
          existingMovie = await prisma.movies.findFirst({
            where: {
              OR: [
                { slug: { startsWith: slug } },
              ]
            }
          });
        }

        // 4. Match by title
        if (!existingMovie && title) {
          const cleanTitle = title.replace(/\s*\(.*?\)\s*/g, '').trim();
          if (cleanTitle) {
            existingMovie = await prisma.movies.findFirst({
              where: {
                OR: [
                  { title: { equals: cleanTitle } },
                  { title: { contains: cleanTitle } }
                ]
              }
            });
          }
        }

        // Handle logic for backup servers (ophim / nguonc)
        if (itemSource === 'kkphim') {
          if (skipExisting && existingMovie && !slugParam) {
            const statusLower = (existingMovie.status || '').toLowerCase();
            const isCompleted = statusLower === 'completed' || statusLower === 'hoanthanh' || statusLower === 'full';
            if (existingMovie.type === 'phimle' || isCompleted) {
              continue; // Skip if it is a single movie or is already completed
            }
          }
        }

        // Allow all sources to add new movies. 
        // Previously, non-kkphim sources were restricted from adding new movies via pagination.
        // Removed the restriction so users can crawl new movies from Ophim or others.


        // Fetch detail
        let detailData: any = null;
        let m: any = null;
        let activeSource = itemSource;

        const sourcesToTryDetail = activeSource === 'all' ? ['kkphim', 'ophim', 'nguonc', 'vsmov', 'vicdn'] : [activeSource];

        for (const trySource of sourcesToTryDetail) {
          let detailUrl = '';
          if (trySource === 'kkphim') detailUrl = `https://phimapi.com/phim/${slug}`;
          else if (trySource === 'nguonc') detailUrl = `https://phim.nguonc.com/api/film/${slug}`;
          else if (trySource === 'ophim') detailUrl = `https://ophim1.com/phim/${slug}`;
          else if (trySource === 'vsmov') detailUrl = `https://vsmov.com/api/phim/${slug}`;
          else if (trySource === 'vicdn') detailUrl = `https://vicdn.cc/api/info/${slug}`;

          if (!detailUrl) continue;

          try {
            const resDetail = await fetch(detailUrl);
            if (resDetail.ok) {
              const data = await resDetail.json();
              if (data.movie || data.data) {
                detailData = data;
                m = data.movie || data.data;
                activeSource = trySource;
                break;
              }
            }
          } catch (e) { }
        }

        if (!m) continue;

        // Process Movie Details
        let processedData: any = {};
        if (activeSource === 'kkphim' || activeSource === 'ophim' || activeSource === 'vsmov') {
          const rawEpisodes = detailData.episodes || m.episodes || [];
          const episodes: any[] = [];
          for (const server of rawEpisodes) {
            let serverName = server.server_name;
            if (activeSource === 'ophim' && !serverName.includes('Ophim -')) {
              serverName = `Ophim - ${serverName}`;
            } else if (activeSource === 'vsmov' && !serverName.includes('VSMOV -')) {
              serverName = `VSMOV - ${serverName}`;
            }
            episodes.push({
              server_name: serverName,
              server_data: server.server_data || []
            });
          }

          processedData = {
            title: m.name,
            original_title: m.origin_name,
            slug: m.slug,
            description: m.content ? m.content.replace(/<[^>]*>/g, '') : '',
            poster_url: m.poster_url,
            thumb_url: m.thumb_url,
            trailer_url: m.trailer_url || '',
            type: m.type === 'series' ? 'phimbo' : (m.type === 'single' ? 'phimle' : (m.type === 'tvshows' ? 'tvshows' : 'hoathinh')),
            status: m.status,
            year: parseInt(m.year, 10) || new Date().getFullYear(),
            duration: m.time || '',
            quality: m.quality || '',
            language: m.lang || '',
            episodes: episodes,
            categories: m.category || [],
            countries: m.country || [],
            actors: m.actor || [],
            director: Array.isArray(m.director) ? m.director.join(', ') : (m.director || ''),
            tmdb_id: m.tmdb?.id ? (parseInt(String(m.tmdb.id), 10) || null) : null,
            imdb_id: m.imdb?.id || null,
            sub_docquyen: !!m.sub_docquyen || episodes.some((ep: any) => ep.server_name && (ep.server_name.toLowerCase().includes('subteam') || ep.server_name.toLowerCase().includes('hà nội'))),
            chieurap: !!m.chieurap,
            is_copyright: !!m.is_copyright,
            episode_current: m.episode_current || '',
            api_movie_id: m._id ? String(m._id) : null,
            imdb_rating: m.tmdb?.vote_average ? parseFloat(String(m.tmdb.vote_average)) : null,
            imdb_votes: m.tmdb?.vote_count ? String(m.tmdb.vote_count) : null,
            showtimes: m.showtimes || m.notify || '',
          };
        } else if (activeSource === 'vicdn') {
          const rawEpisodes = m.list_episodes || [];
          const serverData: any[] = [];

          for (const epString of rawEpisodes) {
            try {
              const [tapStr, link] = epString.split('|');
              const tapNum = parseInt(tapStr, 10);
              if (!isNaN(tapNum) && link) {
                serverData.push({
                  name: `Tập ${String(tapNum).padStart(2, '0')}`,
                  slug: `tap-${tapNum}`,
                  link_m3u8: link.endsWith('.m3u8') ? link : '',
                  link_embed: !link.endsWith('.m3u8') ? link : ''
                });
              }
            } catch { /* skip */ }
          }

          const episodes = [{
            server_name: 'ViCDN',
            server_data: serverData
          }];

          const categories = Array.isArray(m.genre) ? m.genre.map((g: string) => ({ name: g, slug: createSlug(g) })) : [];
          const countries = Array.isArray(m.country) ? m.country.map((c: string) => ({ name: c, slug: createSlug(c) })) : [];

          processedData = {
            title: m.vname || m.ename,
            original_title: m.ename || '',
            slug: m.slug,
            description: m.content || '',
            poster_url: m.poster || '',
            thumb_url: m.banner || '',
            trailer_url: '',
            type: m.type === 'tv' ? 'phimbo' : 'phimle',
            status: m.stt >= m.total ? 'completed' : 'ongoing',
            year: parseInt(m.year, 10) || new Date().getFullYear(),
            duration: m.duration ? String(m.duration) : '',
            quality: 'HD',
            language: 'Vietsub',
            episodes: episodes,
            categories: categories,
            countries: countries,
            actors: Array.isArray(m.cast) ? m.cast : [],
            director: '',
            tmdb_id: m.tmdb ? parseInt(String(m.tmdb), 10) : null,
            imdb_id: null,
            sub_docquyen: false,
            chieurap: false,
            is_copyright: false,
            episode_current: m.stt ? `Tập ${m.stt}` : '',
            api_movie_id: null,
            showtimes: '',
          };
        } else if (activeSource === 'nguonc') {
          let type = 'phimle';
          let year = new Date().getFullYear();
          const categories: any[] = [];
          const countries: any[] = [];

          if (m.category) {
            for (const catKey in m.category) {
              const catGroup = m.category[catKey];
              const groupName = catGroup.group?.name || '';
              const list = catGroup.list || [];

              if (groupName === 'Định dạng') {
                for (const item of list) {
                  if (item.name.toLowerCase().includes('phim bộ')) {
                    type = 'phimbo';
                  }
                }
              } else if (groupName === 'Thể loại') {
                for (const item of list) {
                  categories.push({
                    name: item.name,
                    slug: createSlug(item.name)
                  });
                  if (item.name.toLowerCase().includes('hoạt hình')) {
                    type = 'hoathinh';
                  }
                }
              } else if (groupName === 'Quốc gia') {
                for (const item of list) {
                  countries.push({
                    name: item.name,
                    slug: createSlug(item.name)
                  });
                }
              } else if (groupName === 'Năm') {
                if (list[0]?.name) {
                  year = parseInt(list[0].name, 10) || year;
                }
              }
            }
          }

          const actors = m.casts ? m.casts.split(',').map((x: string) => x.trim()) : [];
          const episodes: any[] = [];
          if (m.episodes) {
            for (const server of m.episodes) {
              const serverName = `NguonC - ${server.server_name || 'Default'}`;
              const serverData = (server.items || []).map((ep: any) => ({
                name: ep.name,
                slug: ep.slug,
                link_m3u8: ep.m3u8 || '',
                link_embed: ep.embed || ''
              }));
              episodes.push({
                server_name: serverName,
                server_data: serverData
              });
            }
          }

          processedData = {
            title: m.name,
            original_title: m.original_name || '',
            slug: m.slug,
            description: m.description ? m.description.replace(/<[^>]*>/g, '') : '',
            poster_url: m.poster_url || '',
            thumb_url: m.thumb_url || '',
            trailer_url: m.trailer_url || '',
            type: type,
            status: m.current_episode || '',
            episode_current: m.current_episode || '',
            year: year,
            duration: m.time || '',
            quality: m.quality || '',
            language: m.language || '',
            episodes: episodes,
            categories: categories,
            countries: countries,
            actors: actors,
            director: m.director || '',
            showtimes: m.showtimes || m.notify || '',
          };
        }

        // Inherit tmdb_id and imdb_id from existing database record if missing in crawled data
        if (existingMovie) {
          if (!processedData.tmdb_id && existingMovie.tmdb_id) {
            processedData.tmdb_id = existingMovie.tmdb_id;
          }
          if (!processedData.imdb_id && existingMovie.imdb_id) {
            processedData.imdb_id = existingMovie.imdb_id;
          }
        }

        // [TÔ PHIM] Fetch high-quality images from TMDB if available
        if (processedData.tmdb_id && tmdbApiKey) {
          try {
            const tmdbType = ['phimbo', 'hoathinh', 'tvshows'].includes(processedData.type) ? 'tv' : 'movie';
            const imgRes = await fetch(`https://api.tmdb.org/3/${tmdbType}/${processedData.tmdb_id}?api_key=${tmdbApiKey}&language=vi-VN&append_to_response=images,credits`);
            if (imgRes.ok) {
              const imgData = await imgRes.json();
              if (imgData.poster_path) {
                processedData.poster_url = `https://image.tmdb.org/t/p/w500${imgData.poster_path}`;
              }
              if (imgData.backdrop_path) {
                processedData.thumb_url = `https://image.tmdb.org/t/p/original${imgData.backdrop_path}`;
              } else if (imgData.images?.backdrops?.length > 0) {
                processedData.thumb_url = `https://image.tmdb.org/t/p/original${imgData.images.backdrops[0].file_path}`;
              }
              if (imgData.images?.logos?.length > 0) {
                const vnLogo = imgData.images.logos.find((l: any) => l.iso_639_1 === 'vi');
                const enLogo = imgData.images.logos.find((l: any) => l.iso_639_1 === 'en');
                const logo = vnLogo || enLogo || imgData.images.logos[0];
                if (logo && logo.file_path) {
                  processedData.logo_url = `https://image.tmdb.org/t/p/original${logo.file_path}`;
                }
              }
              // Populate actors from TMDB to avoid missing actors from 3rd party API
              if (imgData.credits?.cast && imgData.credits.cast.length > 0) {
                processedData.actors = imgData.credits.cast.slice(0, 15).map((a: any) => a.name);
              }
            }
          } catch (e) {
            console.error("Error fetching TMDB data during crawl:", e);
          }
        }

        // Fetch showtimes from TMDB if not provided by source API
        if (!processedData.showtimes && processedData.tmdb_id && ['phimbo', 'hoathinh', 'tvshows'].includes(processedData.type) && tmdbApiKey) {
          try {
            const tmdbRes = await fetch(`https://api.tmdb.org/3/tv/${processedData.tmdb_id}?api_key=${tmdbApiKey}&language=vi-VN`);
            if (tmdbRes.ok) {
              const tmdbData = await tmdbRes.json();
              const seasons = tmdbData.seasons;
              if (seasons && seasons.length > 0) {
                const lastSeason = seasons.filter((s: any) => s.season_number > 0).pop();
                if (lastSeason) {
                  const seasonRes = await fetch(`https://api.tmdb.org/3/tv/${processedData.tmdb_id}/season/${lastSeason.season_number}?api_key=${tmdbApiKey}&language=vi-VN`);
                  if (seasonRes.ok) {
                    const seasonData = await seasonRes.json();
                    if (seasonData.episodes) {

                      // Determine the highest episode number we currently have from the crawled data and database
                      let maxCurrentEp = 0;

                      if (processedData.slug) {
                        try {
                          const existingMovie = await prisma.movies.findUnique({
                            where: { slug: processedData.slug },
                            include: { episodes: true }
                          });
                          if (existingMovie && existingMovie.episodes) {
                            for (const ep of existingMovie.episodes) {
                              const match = ep.name.match(/\d+/);
                              if (match) {
                                const epNum = parseInt(match[0], 10);
                                if (epNum > maxCurrentEp) maxCurrentEp = epNum;
                              }
                            }
                          }
                        } catch (e) {
                          // ignore
                        }
                      }

                      if (processedData.episodes) {
                        for (const server of processedData.episodes) {
                          for (const ep of server.server_data) {
                            const match = ep.name.match(/\d+/);
                            if (match) {
                              const epNum = parseInt(match[0], 10);
                              if (epNum > maxCurrentEp) maxCurrentEp = epNum;
                            }
                          }
                        }
                      }

                      // If we couldn't parse any episode number, default to showing everything from today
                      const today = new Date();
                      const yyyy = today.getFullYear();
                      const mm = String(today.getMonth() + 1).padStart(2, '0');
                      const dd = String(today.getDate()).padStart(2, '0');
                      const todayStr = `${yyyy}-${mm}-${dd}`;

                      const futureEps = seasonData.episodes.filter((ep: any) => {
                        if (maxCurrentEp > 0) {
                          return ep.episode_number > maxCurrentEp;
                        } else {
                          return ep.air_date && ep.air_date >= todayStr;
                        }
                      });

                      if (futureEps.length > 0) {
                        const nextEp = futureEps[0];
                        const upcomingEps = futureEps.slice(1).map((ep: any) => {
                          let formattedDate = ep.air_date || 'Đang cập nhật';
                          if (ep.air_date) {
                            const dParts = ep.air_date.split('-');
                            if (dParts.length === 3) formattedDate = `${dParts[2]}-${dParts[1]}-${dParts[0]}`;
                          }
                          return {
                            episode: `Tập ${ep.episode_number}`,
                            date: formattedDate
                          };
                        });

                        let formattedNextDate = nextEp.air_date || 'Đang cập nhật';
                        if (nextEp.air_date) {
                          const dParts = nextEp.air_date.split('-');
                          if (dParts.length === 3) formattedNextDate = `${dParts[2]}-${dParts[1]}-${dParts[0]}`;
                        }

                        const nextMessage = `<span class="font-bold">Tập ${nextEp.episode_number}</span> sẽ phát sóng <span class="font-bold">ngày ${formattedNextDate}</span>. Các bạn nhớ đón xem nhé`;

                        if (upcomingEps.length > 0) {
                          processedData.showtimes = JSON.stringify({
                            type: 'tmdb_showtimes',
                            next: nextMessage,
                            upcoming: upcomingEps
                          });
                        } else {
                          processedData.showtimes = nextMessage;
                        }
                      }
                    }
                  }
                }
              }
            }
          } catch (e) {
            // Ignore errors fetching from TMDB
          }
        }

        // Check for Song Ngu in episodes to append to language
        let isSongNgu = (processedData.language || '').toLowerCase().includes('song ngữ') || (processedData.language || '').toLowerCase().includes('songngữ');
        if (!isSongNgu && processedData.episodes) {
          isSongNgu = processedData.episodes.some((ep: any) => {
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
        if (isSongNgu && !(processedData.language || '').toLowerCase().includes('song ngữ')) {
          processedData.language = processedData.language ? processedData.language + ' - Song Ngữ' : 'Song Ngữ';
        }

        // Deduplicate by TMDB ID if available and existingMovie not found by slug/title
        if (!existingMovie && processedData.tmdb_id) {
          const movieByTmdb = await prisma.movies.findFirst({
            where: { tmdb_id: processedData.tmdb_id }
          });
          if (movieByTmdb) {
            existingMovie = movieByTmdb;
          }
        }

        // Save to database
        let movieId = existingMovie?.id;

        if (activeSource === 'kkphim' || activeSource === 'ophim' || activeSource === 'nguonc' || activeSource === 'vsmov') {
          if (existingMovie) {
            // Update movie
            await prisma.movies.update({
              where: { id: movieId },
              data: {
                title: processedData.title,
                original_title: processedData.original_title,
                description: processedData.description,
                poster_url: (existingMovie.poster_url?.includes('image.tmdb.org') && !processedData.poster_url?.includes('image.tmdb.org')) ? existingMovie.poster_url : (processedData.poster_url || existingMovie.poster_url),
                thumb_url: (existingMovie.thumb_url?.includes('image.tmdb.org') && !processedData.thumb_url?.includes('image.tmdb.org')) ? existingMovie.thumb_url : (processedData.thumb_url || existingMovie.thumb_url),
                trailer_url: existingMovie.trailer_url || processedData.trailer_url,
                type: processedData.type,
                status: processedData.status,
                year: processedData.year,
                duration: processedData.duration,
                quality: processedData.quality,
                language: processedData.language,
                api_source: activeSource,
                director: processedData.director,
                tmdb_id: processedData.tmdb_id,
                imdb_id: processedData.imdb_id,
                logo_url: processedData.logo_url || existingMovie.logo_url,
                sub_docquyen: processedData.sub_docquyen,
                chieurap: processedData.chieurap,
                is_copyright: processedData.is_copyright,
                episode_current: processedData.episode_current,
                api_movie_id: processedData.api_movie_id,
                imdb_rating: processedData.imdb_rating,
                imdb_votes: processedData.imdb_votes,
                showtimes: processedData.showtimes,
              }
            });
          } else {
            // Create movie
            const newM = await prisma.movies.create({
              data: {
                title: processedData.title,
                original_title: processedData.original_title,
                slug: processedData.slug,
                description: processedData.description,
                poster_url: processedData.poster_url,
                thumb_url: processedData.thumb_url,
                trailer_url: processedData.trailer_url,
                type: processedData.type,
                status: processedData.status,
                year: processedData.year,
                duration: processedData.duration,
                quality: processedData.quality,
                language: processedData.language,
                api_source: activeSource,
                director: processedData.director,
                tmdb_id: processedData.tmdb_id,
                imdb_id: processedData.imdb_id,
                logo_url: processedData.logo_url,
                sub_docquyen: processedData.sub_docquyen,
                chieurap: processedData.chieurap,
                is_copyright: processedData.is_copyright,
                episode_current: processedData.episode_current,
                api_movie_id: processedData.api_movie_id,
                imdb_rating: processedData.imdb_rating,
                imdb_votes: processedData.imdb_votes,
                showtimes: processedData.showtimes,
              }
            });
            movieId = newM.id;
          }

          // Sync categories & countries
          await prisma.movie_category.deleteMany({ where: { movie_id: movieId } });

          const allCats = [...processedData.categories, ...processedData.countries];
          const insertedCategoryIds = new Set<number>();
          for (const cat of allCats) {
            if (!cat.slug) continue;
            const typeField = processedData.categories.includes(cat) ? 'genre' : 'country';

            let dbCat = await prisma.categories.findFirst({
              where: { slug: cat.slug, type: typeField }
            });

            if (!dbCat) {
              dbCat = await prisma.categories.create({
                data: {
                  name: cat.name,
                  slug: cat.slug,
                  type: typeField
                }
              });
            }

            if (insertedCategoryIds.has(dbCat.id)) {
              continue;
            }
            insertedCategoryIds.add(dbCat.id);

            await prisma.movie_category.create({
              data: {
                movie_id: movieId!,
                category_id: dbCat.id
              }
            });
          }

          // Sync actors
          await prisma.movie_actor.deleteMany({ where: { movie_id: movieId } });
          const insertedActorIds = new Set<number>();
          for (const actorName of processedData.actors) {
            const nameTrim = actorName.trim();
            if (!nameTrim || nameTrim === 'Đang cập nhật') continue;
            const actorSlug = createSlug(nameTrim);

            let dbActor = await prisma.actors.findUnique({
              where: { slug: actorSlug }
            });

            if (!dbActor) {
              dbActor = await prisma.actors.create({
                data: {
                  name: nameTrim,
                  slug: actorSlug
                }
              });
            }

            if (insertedActorIds.has(dbActor.id)) {
              continue;
            }
            insertedActorIds.add(dbActor.id);

            await prisma.movie_actor.create({
              data: {
                movie_id: movieId!,
                actor_id: dbActor.id
              }
            });
          }
        }

        // Save episodes (For kkphim, ophim, and nguonc)
        if (movieId && processedData.episodes) {
          for (const server of processedData.episodes) {
            const serverName = server.server_name;
            const serverData = server.server_data || [];

            // Auto-register server if it doesn't exist
            try {
              await prisma.servers.upsert({
                where: { name: serverName },
                update: {},
                create: {
                  name: serverName,
                  display_name: serverName,
                  priority: 0
                }
              });
            } catch (e) {
              // Ignore errors
            }

            for (const ep of serverData) {
              const epName = ep.name;
              const epSlug = ep.slug;
              let epLink = '';

              if (activeSource === 'vsmov') {
                epLink = ep.link_embed || ep.link_m3u8 || '';
              } else {
                epLink = ep.link_m3u8 || ep.link_embed || '';
              }

              if (!epLink) continue;

              const existingEp = await prisma.episodes.findFirst({
                where: {
                  movie_id: movieId,
                  server_name: serverName,
                  name: epName
                }
              });

              if (existingEp) {
                if (existingEp.slug === epSlug && existingEp.video_url === epLink) {
                  continue; // Skip if episode link and slug have not changed
                }
                await prisma.episodes.update({
                  where: { id: existingEp.id },
                  data: {
                    slug: epSlug,
                    video_url: epLink
                  }
                });
              } else {
                await prisma.episodes.create({
                  data: {
                    movie_id: movieId,
                    server_name: serverName,
                    name: epName,
                    slug: epSlug,
                    video_url: epLink
                  }
                });
              }
            }
          }
        }

        crawledMovies.push(processedData.title);
        successCount++;
      } catch (err: any) {
        console.error(`Failed to crawl movie: ${item?.slug || item?.name}`, err);
        // Bỏ qua phim bị lỗi và tiếp tục cào phim tiếp theo
      }
    }

    // Save last cron run time
    try {
      // Save for specific source
      await prisma.settings.upsert({
        where: { key: `last_cron_run_${source}` },
        update: { value: new Date().toISOString() },
        create: {
          key: `last_cron_run_${source}`,
          value: new Date().toISOString(),
          description: `Thời gian chạy cron cào phim ${source} gần nhất`
        }
      });

      // Update global last cron run
      await prisma.settings.upsert({
        where: { key: 'last_cron_run' },
        update: { value: new Date().toISOString() },
        create: {
          key: 'last_cron_run',
          value: new Date().toISOString(),
          description: 'Thời gian chạy cron cào phim gần nhất'
        }
      });
    } catch (e) {
      console.error('Failed to update last_cron_run setting:', e);
    }

    return NextResponse.json({
      success: true,
      page,
      total_on_page: items.length,
      crawled_count: successCount,
      movies: crawledMovies
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Server error: ' + error.message }, { status: 500 });
  }
}
