import prisma from '@/lib/db';
import Header from './Header';
import { cookies } from 'next/headers';

export default async function Navbar() {
  // Query genres & countries
  const genres = await prisma.categories.findMany({
    where: { type: 'genre', status: true },
    orderBy: { order_num: 'asc' },
    take: 18
  });

  const countries = await prisma.categories.findMany({
    where: { type: 'country', status: true },
    orderBy: { order_num: 'asc' },
    take: 15
  });

  // Query site settings for logo and name
  const settings = await prisma.settings.findMany();
  const settingsMap = new Map(settings.map(s => [s.key, s.value]));
  
  const logoUrl = settingsMap.get('logo_url') || '/branding/logo.png';
  const siteName = settingsMap.get('site_name') || 'Tô Phim.Com';

  // Read session cookie
  const cookieStore = await cookies();
  const { getSession } = await import('@/lib/auth');
  const session = await getSession();
  const userId = session?.userId?.toString();
  let user = null;
  if (userId) {
    try {
      const dbUser = await prisma.users.findUnique({
        where: { id: parseInt(userId) },
        select: { id: true, name: true, email: true, role: true, avatar: true }
      });
      if (dbUser) {
        user = {
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          avatar: dbUser.avatar,
          role: dbUser.role || 'user'
        };
      }
    } catch (err) {
      console.error("Failed to query user session:", err);
    }
  }

  // Ads: below-header banner
  const belowHeaderEnabled = settingsMap.get('ads_banner_below_header_enabled') === 'true';
  const belowHeaderImage = settingsMap.get('ads_banner_below_header_image') || '';
  const belowHeaderLink = settingsMap.get('ads_banner_below_header_link') || '';

  return (
    <Header
      genres={genres}
      countries={countries}
      logoUrl={logoUrl}
      siteName={siteName}
      user={user}
      adsBelowHeaderEnabled={belowHeaderEnabled}
      adsBelowHeaderImage={belowHeaderImage}
      adsBelowHeaderLink={belowHeaderLink}
    />
  );
}
