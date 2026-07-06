import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import ProfileClient from '@/components/ProfileClient';

export default async function ProfilePage() {
  const cookieStore = await cookies();
  const { getSession } = await import('@/lib/auth');
  const session = await getSession();
  const userIdStr = session?.userId?.toString();

  if (!userIdStr) {
    redirect('/pages/login');
  }

  const userId = parseInt(userIdStr);

  // Fetch user data
  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      gender: true,
      email_verified: true,
      created_at: true,
    },
  });

  if (!user) {
    redirect('/pages/login');
  }

  // Calculate statistics
  const favoriteCount = await prisma.favorites.count({
    where: { user_id: userId },
  });

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const watchLaterCount = await prisma.watch_history.count({
    where: {
      user_id: userId,
      last_watched_at: { gte: thirtyDaysAgo },
      watch_time: { gt: 5 },
    },
  });

  const historyCount = await prisma.watch_history.count({
    where: { user_id: userId },
  });

  const watchHistorySum = await prisma.watch_history.aggregate({
    where: { user_id: userId },
    _sum: {
      watch_time: true,
    },
  });
  const totalWatchTimeSec = watchHistorySum._sum.watch_time || 0;
  const totalWatchTimeMin = Math.floor(totalWatchTimeSec / 60);

  // Rank calculation (using raw query)
  interface RankResult {
    rank: bigint | number;
  }
  let userRank: number | string = '-';
  try {
    const rankResults = await prisma.$queryRaw<RankResult[]>`
      SELECT \`rank\` FROM (
          SELECT user_id, SUM(watch_time) as total_time,
                 RANK() OVER (ORDER BY SUM(watch_time) DESC) as \`rank\`
          FROM watch_history
          GROUP BY user_id
      ) as ranked_users
      WHERE user_id = ${userId}
    `;
    if (rankResults && rankResults.length > 0) {
      userRank = Number(rankResults[0].rank);
    } else {
      const totalUsers = await prisma.users.count();
      userRank = totalUsers;
    }
  } catch (err) {
    console.error('Failed to calculate user rank:', err);
    userRank = '-';
  }

  // Daily stats for the last 7 days (timezone-safe)
  const last7Days: Array<{
    dateStr: string;
    label: string;
    seconds: number;
    height: number;
  }> = [];
  const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    last7Days.push({
      dateStr,
      label: dayNames[d.getDay()],
      seconds: 0,
      height: 4,
    });
  }

  // Query daily stats from DB
  const sixDaysAgo = new Date();
  sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);
  sixDaysAgo.setHours(0, 0, 0, 0);

  const stats = await prisma.daily_watch_stats.findMany({
    where: {
      user_id: userId,
      watch_date: {
        gte: sixDaysAgo,
      },
    },
  });

  let totalWeeklySec = 0;
  let maxDailySec = 0;

  stats.forEach((row) => {
    const yyyy = row.watch_date.getUTCFullYear();
    const mm = String(row.watch_date.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(row.watch_date.getUTCDate()).padStart(2, '0');
    const rowDateStr = `${yyyy}-${mm}-${dd}`;

    const found = last7Days.find((d) => d.dateStr === rowDateStr);
    if (found) {
      found.seconds = row.watch_time || 0;
      totalWeeklySec += row.watch_time || 0;
      if ((row.watch_time || 0) > maxDailySec) {
        maxDailySec = row.watch_time || 0;
      }
    }
  });

  // Calculate heights
  last7Days.forEach((v) => {
    if (maxDailySec > 0) {
      v.height = Math.max(4, Math.round((v.seconds / maxDailySec) * 100));
    }
  });

  const weeklySec = totalWeeklySec;
  const avgDailySec = Math.floor(totalWeeklySec / 7);
  const recordSec = maxDailySec;

  return (
    <ProfileClient
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        gender: user.gender,
        email_verified: user.email_verified,
        created_at: user.created_at.toISOString(),
      }}
      favoriteCount={favoriteCount}
      watchLaterCount={watchLaterCount}
      historyCount={historyCount}
      totalWatchTimeSec={totalWatchTimeSec}
      userRank={userRank}
      last7Days={last7Days}
      weeklySec={weeklySec}
      avgDailySec={avgDailySec}
      recordSec={recordSec}
    />
  );
}
