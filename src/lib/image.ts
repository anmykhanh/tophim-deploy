export function getBackdropUrl(movie: any): string {
  if (!movie) return '';
  const thumb = movie.thumb_url || '';
  const poster = movie.poster_url || '';

  // If one of them is missing, use the other
  if (!thumb) return poster;
  if (!poster) return thumb;

  // If it's TMDB, thumb is backdrop, poster is vertical poster
  if (thumb.includes('tmdb.org') || poster.includes('tmdb.org')) {
    return thumb;
  }

  // If it's kkphim (phimimg.com) or uses its CDN, thumb is backdrop, poster is vertical poster
  if (thumb.includes('phimimg.com') || poster.includes('phimimg.com')) {
    return thumb;
  }

  // If it's ophim, nguonc, vsmov, or vsphim, poster is backdrop, thumb is vertical poster
  if (thumb.includes('ophim') || poster.includes('ophim') || thumb.includes('nguonc') || poster.includes('nguonc') || thumb.includes('vsmov') || poster.includes('vsmov') || thumb.includes('vsphim') || poster.includes('vsphim')) {
    return poster;
  }

  // Default fallback based on api_source
  if (movie.api_source === 'kkphim') {
    return thumb;
  }
  return poster;
}

export function getPosterUrl(movie: any): string {
  if (!movie) return '';
  const thumb = movie.thumb_url || '';
  const poster = movie.poster_url || '';

  if (!poster) return thumb;
  if (!thumb) return poster;

  if (thumb.includes('tmdb.org') || poster.includes('tmdb.org')) {
    return poster;
  }

  if (thumb.includes('phimimg.com') || poster.includes('phimimg.com')) {
    return poster;
  }

  if (thumb.includes('ophim') || poster.includes('ophim') || thumb.includes('nguonc') || poster.includes('nguonc') || thumb.includes('vsmov') || poster.includes('vsmov') || thumb.includes('vsphim') || poster.includes('vsphim')) {
    return thumb;
  }

  if (movie.api_source === 'kkphim') {
    return poster;
  }
  return thumb;
}

export function getProxyImageUrl(url: string, width?: number): string {
  if (!url) return '';
  if (url.includes('wsrv.nl')) return url;

  let cleanUrl = url.trim();
  if (cleanUrl.startsWith('/')) {
    return cleanUrl; // Local relative path, do not proxy
  }
  
  if (cleanUrl.startsWith('//')) {
    cleanUrl = 'https:' + cleanUrl;
  }

  const encodedUrl = encodeURIComponent(cleanUrl);
  // Using wsrv.nl proxy format identical to chophim.fun
  let proxyUrl = `https://wsrv.nl/?url=${encodedUrl}&q=100&output=webp&n=-1`;
  if (width) {
    proxyUrl += `&w=${width}`;
  }
  return proxyUrl;
}
