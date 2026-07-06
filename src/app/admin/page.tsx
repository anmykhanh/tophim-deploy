import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import AdminDashboardClient from '@/components/AdminDashboardClient';

export default async function AdminPage() {
  const cookieStore = await cookies();
  const { getSession } = await import('@/lib/auth');
  const session = await getSession();
  const userIdStr = session?.userId?.toString();

  if (!userIdStr) {
    redirect('/pages/login');
  }

  const userId = parseInt(userIdStr, 10);
  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: { id: true, name: true, role: true, avatar: true, role_id: true, roles: { select: { permissions: true } } }
  });

  if (!user || (user.role !== 'admin' && user.role_id === null)) {
    redirect('/');
  }

  const userPermissions = user.role === 'admin'
    ? ['manage_movies', 'manage_articles', 'manage_comments', 'manage_users', 'manage_settings']
    : (user.roles?.permissions ? (Array.isArray(user.roles.permissions) ? user.roles.permissions : JSON.parse(user.roles.permissions as string)) : []);

  // Pass permissions to client

  // Fetch initial statistics
  let totalMovies = 0;
  let totalUsers = 0;
  let totalComments = 0;
  let pendingReports = 0;
  let pendingRequests = 0;
  let totalEpisodes = 0;
  let onlineCount = 0;
  let todayUsersCount = 0;
  let recentComments: any[] = [];
  let recentReports: any[] = [];
  let settings: Record<string, string> = {};

  try {
    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
    const todayStr = new Date().toLocaleDateString('sv-SE');
    const startOfToday = new Date(todayStr + 'T00:00:00Z');

    const [moviesCount, usersCount, commentsCount, reportsCount, episodesCount, commentsList, reportsList, settingsList, activeOnline, activeToday, requestsCount] = await prisma.$transaction([
      prisma.movies.count(),
      prisma.users.count(),
      prisma.comments.count(),
      prisma.error_reports.count({ where: { status: 'pending' } }),
      prisma.episodes.count(),
      prisma.comments.findMany({
        orderBy: { created_at: 'desc' },
        take: 5,
        include: {
          users: { select: { name: true, avatar: true } },
          movies: { select: { title: true } }
        }
      }),
      prisma.error_reports.findMany({
        orderBy: { created_at: 'desc' },
        take: 5,
        include: {
          users: { select: { name: true } },
          movies: { select: { title: true } }
        }
      }),
      prisma.settings.findMany(),
      prisma.active_sessions.count({
        where: {
          last_active: { gte: fiveMinsAgo }
        }
      }),
      prisma.active_sessions.count({
        where: {
          is_member: true,
          last_active: { gte: startOfToday }
        }
      }),
      prisma.movie_requests.count({ where: { status: 'pending' } })
    ]);

    totalMovies = moviesCount;
    totalUsers = usersCount;
    totalComments = commentsCount;
    pendingReports = reportsCount;
    pendingRequests = requestsCount;
    totalEpisodes = episodesCount;
    recentComments = commentsList;
    recentReports = reportsList;
    onlineCount = activeOnline;
    todayUsersCount = activeToday;

    settingsList.forEach((s: any) => {
      settings[s.key] = s.value || '';
    });
  } catch (err) {
    console.error("Failed to fetch admin stats:", err);
  }

  let allCategories: any[] = [];
  try {
    allCategories = await prisma.categories.findMany({
      orderBy: [
        { type: 'asc' },
        { name: 'asc' }
      ]
    });
  } catch (err) {
    console.error("Failed to fetch categories:", err);
  }

  return (
    <AdminDashboardClient
      stats={{
        totalMovies,
        totalUsers,
        totalComments,
        pendingReports,
        pendingRequests,
        totalEpisodes,
        onlineCount,
        todayUsersCount
      }}
      recentComments={recentComments}
      recentReports={recentReports}
      initialSettings={settings}
      currentUser={{ ...user, permissions: userPermissions }}
      allCategories={allCategories}
    />
  );
}
