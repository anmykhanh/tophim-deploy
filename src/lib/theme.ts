// Map collections to consistent Onflix character PNG URLs, backgrounds, and themes
export interface CollectionTheme {
  bg: string;
  shape: string;
  hex: string;
  gradient: string;
  text: string;
  char: string;
}

export function getCollectionTheme(slug: string, name: string = '', index?: number): CollectionTheme {
  const themes = [
    { bg: 'bg-[#c64a80]', shape: 'bg-[#d75990]', hex: '#c64a80', gradient: 'linear-gradient(135deg, #c64a80 0%, #8b2b54 100%)', text: '#fb7185' },
    { bg: 'bg-[#4aa686]', shape: 'bg-[#5abf9b]', hex: '#4aa686', gradient: 'linear-gradient(135deg, #4aa686 0%, #296d55 100%)', text: '#34d399' },
    { bg: 'bg-[#cf7852]', shape: 'bg-[#e18761]', hex: '#cf7852', gradient: 'linear-gradient(135deg, #cf7852 0%, #8f4b30 100%)', text: '#facc15' },
    { bg: 'bg-[#d96172]', shape: 'bg-[#ee7084]', hex: '#d96172', gradient: 'linear-gradient(135deg, #d96172 0%, #993b4a 100%)', text: '#f47291' },
    { bg: 'bg-[#16866e]', shape: 'bg-[#249b82]', hex: '#16866e', gradient: 'linear-gradient(135deg, #16866e 0%, #0c5746 100%)', text: '#249b82' },
    { bg: 'bg-[#3b82f6]', shape: 'bg-[#60a5fa]', hex: '#3b82f6', gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', text: '#60a5fa' },
    { bg: 'bg-[#8b5cf6]', shape: 'bg-[#a78bfa]', hex: '#8b5cf6', gradient: 'linear-gradient(135deg, #8b5cf6 0%, #5b21b6 100%)', text: '#a78bfa' }
  ];

  const charImages: Record<string, string> = {
    'de-xuat-cho-ban': 'https://sf-static.onflixcdn.com/images/default/1778696072_url.webp',
    'dang-chieu-phat': 'https://sf-static.onflixcdn.com/images/1753689426_url.webp',
    'phim-chat-luong-cao': 'https://sf-static.onflixcdn.com/images/pic/1769359827_iron.webp',
    'hoat-hinh-chon-loc': 'https://sf-static.onflixcdn.com/images/1753712755_url.png',
    'phim-han-quoc-moi': 'https://sf-static.onflixcdn.com/images/pic/1776085351_url.webp',
    'thanh-xuan-hoc-duong': 'https://sf-static.onflixcdn.com/images/pic/1755686803_url.webp',
    'phim-chua-lanh-tam-hon': 'https://sf-static.onflixcdn.com/images/pic/1755774476_url.webp',
    'co-trang-huyen-ao': 'https://sf-static.onflixcdn.com/images/pic/1755431344_url.webp',
    'phieu-luu-mao-hiem': 'https://sf-static.onflixcdn.com/images/1754045028_url.webp',
    'trung-quoc-dai-luc': 'https://sf-static.onflixcdn.com/images/default/1767962758_url.webp',
    'tinh-yeu-la-nhung': 'https://sf-static.onflixcdn.com/images/1752561742_url.webp',
    'chuyen-the-tu-tac-pham': 'https://sf-static.onflixcdn.com/images/pic/1781530854_url.webp'
  };

  let matchedKey = '';
  for (const key in charImages) {
    if (slug.toLowerCase().includes(key) || name.toLowerCase().includes(key)) {
      matchedKey = key;
      break;
    }
  }

  const char = matchedKey ? charImages[matchedKey] : '';

  const exactSlugMatches: Record<string, number> = {
    'k-drama-han-quoc': 0,
    'phim-han-chua-lanh': 1,
    'co-trang-trung-quoc': 2,
    'thanh-xuan-vuon-truong': 3,
    'anime-moi': 1,
  };

  // Get index based on exact match, or hash
  let themeIndex = exactSlugMatches[slug];
  if (themeIndex === undefined) {
    let hash = 0;
    for (let i = 0; i < slug.length; i++) {
      hash = slug.charCodeAt(i) + ((hash << 5) - hash);
    }
    themeIndex = Math.abs(hash) % themes.length;
  }
  const matchedTheme = themes[themeIndex];

  return {
    ...matchedTheme,
    char
  };
}
