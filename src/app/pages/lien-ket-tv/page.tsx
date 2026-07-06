import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import TvSyncClient from '@/components/TvSyncClient';

export const metadata = {
  title: 'Liên Kết Smart TV - Tô Phim',
  description: 'Đăng nhập tài khoản Tô Phim trên ứng dụng Smart TV của bạn.',
};

export default async function TvSyncPage() {
  const cookieStore = await cookies();
  const { getSession } = await import('@/lib/auth');
  const session = await getSession();
  const userIdStr = session?.userId?.toString();

  if (!userIdStr) {
    redirect('/pages/login?redirect=/pages/lien-ket-tv');
  }

  return (
    <TvSyncClient />
  );
}
