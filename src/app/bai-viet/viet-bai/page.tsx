import { Metadata } from 'next';
import WriteArticleClient from '@/components/WriteArticleClient';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Viết Bài | Tô Phim',
  description: 'Viết bài chia sẻ cảm nghĩ, review phim của bạn đến cộng đồng.',
};

export default async function WriteArticlePage() {
  const session = await getSession();

  if (!session?.userId) {
    redirect('/pages/login?redirect=/bai-viet/viet-bai');
  }

  return (
    <div className="min-h-screen bg-[#0f111a] pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <WriteArticleClient />
    </div>
  );
}
