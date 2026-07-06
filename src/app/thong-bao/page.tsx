import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import NotificationsClient from '@/components/NotificationsClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Thông báo - Tô Phim',
  description: 'Danh sách thông báo của bạn',
};

export default async function NotificationsPage() {
  const cookieStore = await cookies();
  const { getSession } = await import('@/lib/auth');
  const session = await getSession();
  const userIdStr = session?.userId?.toString();

  if (!userIdStr) {
    redirect('/pages/login');
  }

  const userId = parseInt(userIdStr);

  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      role: true
    }
  });

  if (!user) {
    redirect('/pages/login');
  }

  return <NotificationsClient />;
}
