import { Metadata } from 'next';
import prisma from '@/lib/db';
import RequestClient from '@/components/RequestClient';
import { getSession } from '@/lib/auth';

export async function generateMetadata(): Promise<Metadata> {
  let siteName = 'Tô Phim';
  try {
    const settings = await prisma.settings.findMany();
    const settingsMap = new Map(settings.map(s => [s.key, s.value]));
    siteName = settingsMap.get('site_name') || 'Tô Phim';
  } catch (err) {}
  return {
    title: `Yêu cầu phim - ${siteName}`,
    description: `Gửi yêu cầu phim bạn muốn xem trên ${siteName}. Chúng tôi sẽ kiểm tra và cập nhật sớm nhất có thể.`,
  };
}

export default async function RequestPage() {
  const session = await getSession();
  const userIdStr = session?.userId?.toString();
  let user = null;

  if (userIdStr) {
    const userId = parseInt(userIdStr);
    user = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        avatar: true,
      },
    });
  }

  return (
    <RequestClient initialUser={user} />
  );
}
