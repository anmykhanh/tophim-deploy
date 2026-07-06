import Link from 'next/link';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { getProxyImageUrl, getPosterUrl } from '@/lib/image';

// Since Next.js requires handling post redirects differently, we can use a client component or server action.
// To keep it simple, we can make a form that redirects using a server action or client-side form.
// Let's implement a clean Server Action inside the page.

async function handleJoinRoom(formData: FormData) {
  'use server';
  const roomCode = formData.get('room_code')?.toString().trim();
  if (roomCode) {
    redirect(`/xem-chung/room/${encodeURIComponent(roomCode)}`);
  }
}

export default async function XemChungLobbyPage() {
  const cookieStore = await cookies();
  const { getSession } = await import('@/lib/auth');
  const session = await getSession();
  const userIdStr = session?.userId?.toString();
  const currentUserId = userIdStr ? parseInt(userIdStr, 10) : 0;

  // Automatically delete rooms older than 24 hours
  try {
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);
    await prisma.watch_rooms.deleteMany({
      where: {
        created_at: { lt: oneDayAgo }
      }
    });
  } catch (err) {
    console.error('Failed to auto-cleanup expired rooms:', err);
  }

  // Fetch active public rooms
  const roomsRaw = await prisma.watch_rooms.findMany({
    where: { is_public: true },
    include: {
      movies: {
        select: {
          title: true,
          poster_url: true,
          thumb_url: true
        }
      },
      users: {
        select: {
          name: true,
          avatar: true
        }
      }
    },
    orderBy: { created_at: 'desc' }
  });

  const rooms = JSON.parse(JSON.stringify(roomsRaw));

  return (
    <div id="wrapper" className="live-category min-h-screen pt-20">
      <div className="live-background">
        <div className="light-blur"></div>
        <img alt="live-cover" src="/images/live-cover2.webp" />
      </div>
      
      <div className="fluid-gap">
        {/* Buttons Centered in Hero Area */}
        <div className="cards-row wide live-manager">
          <div className="buttons line-center gap-3">
            <Link className="btn btn-xl btn-rounded btn-light" href="/xem-chung/quan-ly">
              <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                <path d="M319.4 372c48.5-31.3 80.6-85.9 80.6-148c0-97.2-78.8-176-176-176S48 126.8 48 224c0 62.1 32.1 116.6 80.6 148c1.2 17.3 4 38 7.2 57.1l.2 1C56 395.8 0 316.5 0 224C0 100.3 100.3 0 224 0S448 100.3 448 224c0 92.5-56 171.9-136 206.1l.2-1.1c3.1-19.2 6-39.8 7.2-57zm-2.3-38.1c-1.6-5.7-3.9-11.1-7-16.2c-5.8-9.7-13.5-17-21.9-22.4c19.5-17.6 31.8-43 31.8-71.3c0-53-43-96-96-96s-96 43-96 96c0 28.3 12.3 53.8 31.8 71.3c-8.4 5.4-16.1 12.7-21.9 22.4c-3.1 5.1-5.4 10.5-7 16.2C99.8 307.5 80 268 80 224c0-79.5 64.5-144 144-144s144 64.5 144 144c0 44-19.8 83.5-50.9 109.9zM224 312c32.9 0 64 8.6 64 43.8c0 33-12.9 104.1-20.6 132.9c-5.1 19-24.5 23.4-43.4 23.4s-38.2-4.4-43.4-23.4c-7.8-28.5-20.6-99.7-20.6-132.8c0-35.1 31.1-43.8 64-43.8zm0-144a56 56 0 1 1 0 112 56 56 0 1 1 0-112z"></path>
              </svg>
              <span>Quản lý</span>
            </Link>
            <Link className="btn btn-xl btn-rounded btn-outline" href="/xem-chung/select-movie">
              <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                <path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM232 344l0-64-64 0c-13.3 0-24-10.7-24-24s10.7-24 24-24l64 0 0-64c0-13.3 10.7-24 24-24s24 10.7 24 24l0 64 64 0c13.3 0 24 10.7 24 24s-10.7 24-24 24l-64 0 0 64c0 13.3-10.7 24-24 24s-24-10.7-24-24z"></path>
              </svg>
              <span>Tạo mới</span>
            </Link>
          </div>
        </div>

        {/* Công Chiếu Section */}
        <div className="cards-row wide">
          <div className="row-header">
            <h3 className="category-name me-3">Công Chiếu</h3>
          </div>
          <div className="row-content">
            <div className="w2g-live">
              <div className="live-grid live-grid-big">
                {/* Dynamically empty or populated depending on premiere schedule */}
              </div>
            </div>
          </div>
        </div>

        {/* Xem Chung Section */}
        <div className="cards-row wide">
          <div className="row-header">
            <h3 className="category-name me-3">Xem Chung</h3>
            <div className="model-tabs">
              <a className="item active">Mới nhất</a>
              <a className="item">Phổ biến</a>
            </div>
            <div className="is-option dropdown">
              <a className="btn haha btn-sm btn-circle btn-outline dropdown-toggle" id="options-dropdown" aria-expanded="false">
                <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 192 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                  <path d="M96 184c39.8 0 72 32.2 72 72s-32.2 72-72 72-72-32.2-72-72 32.2-72 72-72zM24 80c0 39.8 32.2 72 72 72s72-32.2 72-72S135.8 8 96 8 24 40.2 24 80zm0 352c0 39.8 32.2 72 72 72s72-32.2 72-72-32.2-72-72-72-72 32.2-72 72z"></path>
                </svg>
              </a>
            </div>
          </div>
          
          <div className="row-content">
            <div className="w2g-live">
              {rooms.length === 0 ? (
                <div className="text-center py-16 bg-zinc-900/30 border border-zinc-900/50 rounded-2xl">
                  <p className="text-zinc-500 text-sm font-medium">Hiện tại chưa có phòng chiếu công khai nào đang hoạt động.</p>
                  <Link href="/xem-chung/select-movie" className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-all decoration-none">
                    Khởi chiếu ngay
                  </Link>
                </div>
              ) : (
                <div className="live-grid live-grid-small">
                  {rooms.map((r: any) => {
                    const roomUrl = `/xem-chung/room/${r.room_id}`;
                    const poster = getProxyImageUrl(getPosterUrl(r.movies) || '', 300);
                    const hostAvatar = r.users.avatar ? getProxyImageUrl(r.users.avatar, 64) : '/images/avatars/default.png';
                    
                    // Formatted Time ago
                    const formatTimeAgo = (dateStr: string) => {
                      const date = new Date(dateStr);
                      const now = new Date();
                      const diffMs = now.getTime() - date.getTime();
                      const diffSecs = Math.floor(diffMs / 1000);
                      const diffMins = Math.floor(diffSecs / 60);
                      const diffHours = Math.floor(diffMins / 60);
                      const diffDays = Math.floor(diffHours / 24);

                      if (diffDays > 0) return `${diffDays} ngày trước`;
                      if (diffHours > 0) return `${diffHours} giờ trước`;
                      if (diffMins > 0) return `${diffMins} phút trước`;
                      return 'vài giây trước';
                    };

                    const timeAgo = formatTimeAgo(r.created_at);
                    const isLive = r.status === 'playing' || r.status === 'paused';

                    return (
                      <div key={r.room_id} className={`card-live ${isLive ? 'card-live-air' : 'card-live-end'}`}>
                        <div className="v-thumbnail">
                          {isLive ? (
                            <div className="live-tag blink">LIVE</div>
                          ) : (
                            <div className="current-status status-end">
                              <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 640 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                                <path d="M38.8 5.1C28.4-3.1 13.3-1.2 5.1 9.2S-1.2 34.7 9.2 42.9l592 464c10.4 8.2 25.5 6.3 33.7-4.1s6.3-25.5-4.1-33.7l-86.4-67.7 13.8 9.2c9.8 6.5 22.4 7.2 32.9 1.6s16.9-16.4 16.9-28.2l0-256c0-11.8-6.5-22.6-16.9-28.2s-23-5-32.9 1.6l-96 64L448 174.9l0 17.1 0 128 0 5.8-32-25.1L416 128c0-35.3-28.7-64-64-64L113.9 64 38.8 5.1zM407 416.7L32.3 121.5c-.2 2.1-.3 4.3-.3 6.5l0 256c0 35.3 28.7 64 64 64l256 0c23.4 0 43.9-12.6 55-31.3z"></path>
                              </svg>
                              <span>Đã kết thúc</span>
                            </div>
                          )}
                          <Link className="live-mask" title={r.title} href={roomUrl}></Link>
                          <img alt={r.title} loading="lazy" src={poster} />
                          <div className="thumb-small" style={{ backgroundImage: `url(${poster})` }}></div>
                        </div>
                        <div className="card-live-detail">
                          <div className={`user-avatar ${isLive ? 'o-live' : ''}`}>
                            <img alt={r.users.name} src={hostAvatar} />
                          </div>
                          <div className="is-info">
                            <h4 className="live-name lim-2">
                              <Link title={r.title} href={roomUrl}>
                                {r.title}
                              </Link>
                            </h4>
                            <h5 className="source-name lim-1">{r.movies.title}</h5>
                            <div className="info-line">
                              <div className="tag-small tag-user">
                                <a><span className="user-name">{r.users.name}</span></a>
                              </div>
                              <div className="tag-small">{timeAgo}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
