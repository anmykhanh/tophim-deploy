'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getProxyImageUrl } from '@/lib/image';

interface MovieItem {
  id: number;
  title: string;
  slug: string;
  original_title: string | null;
  poster_url: string | null;
  thumb_url: string | null;
  quality: string | null;
  latest_episode: string | null;
  episode_id?: number | null;
  watch_time?: number;
  duration?: number;
  action_time?: string;
}

interface FolderItem {
  id: number;
  name: string;
  slug: string;
  is_public: boolean | null;
  created_at: string;
  movie_count: number;
  movies: MovieItem[];
}

interface LibraryClientProps {
  currentTab: 'history' | 'watch_later' | 'favorite' | 'folder' | 'actor';
  movies: MovieItem[];
  folders: FolderItem[];
  actors?: any[];
}

export default function LibraryClient({
  currentTab,
  movies: initialMovies,
  folders: initialFolders,
  actors: initialActors = [],
}: LibraryClientProps) {
  const [movies, setMovies] = useState<MovieItem[]>(initialMovies);
  const [folders, setFolders] = useState<FolderItem[]>(initialFolders);
  const [expandedFolders, setExpandedFolders] = useState<Record<number, boolean>>({});

  const [actors, setActors] = useState<any[]>(initialActors);

  useEffect(() => {
    setMovies(initialMovies);
    setFolders(initialFolders);
    setActors(initialActors);
  }, [initialMovies, initialFolders, initialActors]);

  // Folder creation modal state
  const [showModal, setShowModal] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [isPublic, setIsPublic] = useState('1');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleFolderDetails = (folderId: number) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/folder-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          name: folderName,
          is_public: isPublic === '1',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        setFolderName('');
        // Reload page to reflect new folder
        window.location.reload();
      } else {
        alert(data.message || 'Lỗi khi tạo thư mục.');
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi kết nối máy chủ.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteFolder = async (folderId: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa thư mục này? Tất cả các liên kết phim bên trong cũng sẽ bị xóa.')) {
      return;
    }

    try {
      const res = await fetch('/api/folder-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          folder_id: folderId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setFolders((prev) => prev.filter((f) => f.id !== folderId));
        alert(data.message);
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi kết nối máy chủ.');
    }
  };

  const handleRemoveMovieFromFolder = async (folderId: number, movieId: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa phim này khỏi thư mục?')) {
      return;
    }

    try {
      const res = await fetch('/api/folder-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove_movie',
          folder_id: folderId,
          movie_id: movieId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        // Update local state
        setFolders((prev) =>
          prev.map((f) => {
            if (f.id === folderId) {
              return {
                ...f,
                movie_count: Math.max(0, f.movie_count - 1),
                movies: f.movies.filter((m) => m.id !== movieId),
              };
            }
            return f;
          })
        );
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi kết nối máy chủ.');
    }
  };

  const copyShareLink = (slug: string) => {
    const link = `${window.location.origin}/thu-vien/thu-muc/${slug}`;
    navigator.clipboard.writeText(link).then(() => {
      alert(`Đã sao chép liên kết chia sẻ: ${link}`);
    }).catch((err) => {
      console.error(err);
      alert('Lỗi khi sao chép liên kết.');
    });
  };

  return (
    <div className="min-h-screen pt-24 pb-16 bg-[#0f111a] text-white">
      {/* Banner / Title Row */}
      <div className="relative py-12 px-4 border-b border-zinc-900 bg-gradient-to-b from-blue-900/10 to-transparent">
        <div className="container mx-auto max-w-6xl">
          <Link 
            className="inline-flex items-center text-zinc-400 hover:text-white mb-4 transition-colors text-sm font-medium" 
            href="/pages/profile"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 mr-1.5"><path d="m15 18-6-6 6-6"></path></svg>
            Quay lại trang cá nhân
          </Link>
          <h1 className="text-3xl md:text-5xl font-black text-white drop-shadow-xl tracking-tight mb-8">Thư viện của bạn</h1>
          
          {/* Navigation tabs */}
          <div className="flex flex-nowrap gap-1 md:gap-4 border-b border-white/10 w-full overflow-x-auto pb-1 custom-scrollbar">
            <Link 
              href="/thu-vien?tab=history" 
              className={`flex items-center gap-2 px-4 py-3 border-b-2 font-semibold transition-all whitespace-nowrap shrink-0 text-sm md:text-base ${currentTab === 'history' ? 'border-white text-white' : 'border-transparent text-zinc-400 hover:text-white'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><path d="M12 7v5l4 2"></path></svg>
              Lịch sử
            </Link>
            <Link 
              href="/thu-vien?tab=watch_later" 
              className={`flex items-center gap-2 px-4 py-3 border-b-2 font-semibold transition-all whitespace-nowrap shrink-0 text-sm md:text-base ${currentTab === 'watch_later' ? 'border-white text-white' : 'border-transparent text-zinc-400 hover:text-white'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>
              Xem tiếp
            </Link>
            <Link 
              href="/thu-vien?tab=favorite" 
              className={`flex items-center gap-2 px-4 py-3 border-b-2 font-semibold transition-all whitespace-nowrap shrink-0 text-sm md:text-base ${currentTab === 'favorite' ? 'border-white text-white' : 'border-transparent text-zinc-400 hover:text-white'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5"></path></svg>
              Yêu thích
            </Link>
            <Link 
              href="/thu-vien?tab=folder" 
              className={`flex items-center gap-2 px-4 py-3 border-b-2 font-semibold transition-all whitespace-nowrap shrink-0 text-sm md:text-base ${currentTab === 'folder' ? 'border-white text-white' : 'border-transparent text-zinc-400 hover:text-white'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
              Thư mục
            </Link>
            <Link 
              href="/thu-vien?tab=actor" 
              className={`flex items-center gap-2 px-4 py-3 border-b-2 font-semibold transition-all whitespace-nowrap shrink-0 text-sm md:text-base ${currentTab === 'actor' ? 'border-white text-white' : 'border-transparent text-zinc-400 hover:text-white'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              Diễn viên
            </Link>
          </div>

        </div>
      </div>

      {/* Main Content Area */}
      <div className="container mx-auto max-w-6xl px-4 py-8">
        {currentTab === 'actor' && (
          <div>
            {!actors || actors.length === 0 ? (
              <div className="text-center py-20 text-zinc-500 bg-zinc-900/10 rounded-2xl border border-white/[0.03]">
                Bạn chưa yêu thích diễn viên nào.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 lg:gap-6 max-w-[1400px]">
                {actors.map((actor) => {
                  const savedTimeStr = actor.action_time 
                    ? new Date(actor.action_time).toLocaleDateString('vi-VN', { 
                        day: '2-digit', 
                        month: '2-digit', 
                        year: 'numeric', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })
                    : '';

                  return (
                    <div key={actor.id} className="group relative flex flex-col bg-zinc-900/40 border border-white/5 rounded-xl p-3 transition-all hover:bg-zinc-800/60 hover:border-white/10 hover:shadow-xl hover:-translate-y-1">
                      <Link href={`/dien-vien/${actor.slug}`} className="w-full aspect-[2/3] rounded-lg overflow-hidden mb-3 shadow-lg group-hover:ring-2 group-hover:ring-[#FFD166] transition-all duration-300 relative">
                        <img 
                          src={actor.avatar && actor.avatar.trim() !== '' ? actor.avatar : `https://ui-avatars.com/api/?name=${encodeURIComponent(actor.name || 'A')}&background=1a1a2e&color=ffc107&size=300`} 
                          alt={actor.name} 
                          className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </Link>
                      <Link href={`/dien-vien/${actor.slug}`} className="text-white font-bold text-base sm:text-lg text-center leading-tight mb-1 group-hover:text-[#FFD166] transition-colors line-clamp-1">
                        {actor.name}
                      </Link>
                      {savedTimeStr && (
                        <p className="text-xs text-zinc-500 mt-1 text-center">Đã lưu: {savedTimeStr}</p>
                      )}
                      
                      <button 
                        className="absolute top-2 right-2 p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-full transition-colors active:scale-95 opacity-0 group-hover:opacity-100"
                        title="Xóa khỏi yêu thích"
                        onClick={async (e) => {
                          e.preventDefault();
                          if (confirm(`Bạn muốn bỏ yêu thích diễn viên ${actor.name}?`)) {
                            try {
                              const res = await fetch('/api/user/favorite-actor', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ actor_id: actor.id }),
                              });
                              if (res.ok) {
                                setActors(prev => prev.filter(a => a.id !== actor.id));
                              }
                            } catch (err) {
                              console.error(err);
                            }
                          }
                        }}
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {currentTab === 'folder' && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <h2 className="text-xl font-bold text-white m-0">Thư mục phim của bạn</h2>
              <button 
                onClick={() => setShowModal(true)} 
                className="flex items-center justify-center gap-2 bg-[#00ac47] hover:bg-[#00c250] text-white font-bold px-5 py-2.5 rounded-xl transition-all shadow-md active:scale-[0.98]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4.5 h-4.5"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>
                Tạo thư mục mới
              </button>
            </div>

            {folders.length === 0 ? (
              <div className="text-center py-20 text-zinc-500 bg-zinc-900/30 rounded-2xl border border-white/5">
                Bạn chưa tạo thư mục phim nào. Bấm nút phía trên để tạo ngay!
              </div>
            ) : (
              <div className="space-y-6">
                {folders.map((folder) => {
                  const isExpanded = !!expandedFolders[folder.id];
                  const createdDateStr = new Date(folder.created_at).toLocaleDateString('vi-VN');

                  return (
                    <div 
                      key={folder.id} 
                      className="bg-[#0f1118]/80 backdrop-blur-[20px] border border-white/[0.06] rounded-[20px] p-6 transition-all hover:border-white/10 shadow-lg"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-[#00ac47]/10 rounded-xl text-[#00ac47]">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"></path><path d="M2 10h20"></path></svg>
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-white mb-1 mt-0">{folder.name}</h3>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                              <span>{folder.movie_count} phim</span>
                              <span className="text-zinc-600">•</span>
                              <span>Ngày tạo: {createdDateStr}</span>
                              <span className="text-zinc-600">•</span>
                              {folder.is_public ? (
                                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full font-semibold">Công khai</span>
                              ) : (
                                <span className="px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded-full font-semibold">Riêng tư</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button 
                            onClick={() => toggleFolderDetails(folder.id)} 
                            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-lg transition-colors"
                          >
                            {isExpanded ? 'Thu gọn' : 'Chi tiết'}
                          </button>
                          {folder.is_public && (
                            <button 
                              onClick={() => copyShareLink(folder.slug)} 
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                              Chia sẻ
                            </button>
                          )}
                          <button 
                            onClick={() => handleDeleteFolder(folder.id)} 
                            className="px-4 py-2 bg-rose-600/10 hover:bg-rose-600 text-rose-400 hover:text-white text-xs font-bold rounded-lg transition-all"
                          >
                            Xóa
                          </button>
                        </div>
                      </div>

                      {/* Expanded movies list */}
                      {isExpanded && (
                        <div className="mt-6 pt-6 border-t border-white/5 animate-fadeIn">

                          {folder.movies.length === 0 ? (
                            <p className="text-sm text-zinc-500 text-center py-4">Chưa có phim nào trong thư mục này.</p>
                          ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 lg:gap-6">
                              {folder.movies.map((m) => (
                                <div key={m.id} className="relative group flex flex-col">
                                  <Link href={`/phim/${m.slug}`} className="block">
                                    <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden mb-2 shadow-lg border border-white/5">
                                      <span className="absolute bottom-2.5 left-2.5 bg-[#00ac47]/90 text-white text-[10px] font-bold px-2 py-0.5 rounded backdrop-blur-sm z-10">
                                        {m.latest_episode || m.quality || 'HD'}
                                      </span>
                                      <img 
                                        src={getProxyImageUrl(m.poster_url || m.thumb_url || '', 200)} 
                                        alt={m.title} 
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 bg-zinc-900" 
                                      />
                                    </div>
                                    <h3 className="text-sm font-bold text-white mb-0.5 truncate">{m.title}</h3>
                                    <p className="text-xs text-zinc-400 truncate">{m.original_title || m.title}</p>
                                  </Link>
                                  {/* Delete movie overlay */}
                                  <button 
                                    onClick={() => handleRemoveMovieFromFolder(folder.id, m.id)} 
                                    className="absolute top-2.5 right-2.5 bg-red-600 hover:bg-red-700 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-lg" 
                                    title="Xóa khỏi thư mục"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {currentTab !== 'actor' && currentTab !== 'folder' && (
          <div>
            {movies.length === 0 ? (
              <div className="text-center py-20 text-zinc-500 bg-zinc-900/10 rounded-2xl border border-white/[0.03]">
                Không có phim trong danh sách này.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 lg:gap-6 max-w-[1400px]">
                {movies.map((m) => {
                  const savedTimeStr = m.action_time 
                    ? new Date(m.action_time).toLocaleDateString('vi-VN', { 
                        day: '2-digit', 
                        month: '2-digit', 
                        year: 'numeric', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })
                    : '';

                  // Helper function to format watch duration
                  const formatDuration = (seconds: number) => {
                    if (!seconds) return '';
                    const h = Math.floor(seconds / 3600);
                    const m = Math.floor((seconds % 3600) / 60);
                    const s = seconds % 60;
                    if (h > 0) return `Đã xem: ${h}h ${m}m`;
                    if (m > 0) return `Đã xem: ${m}m ${s}s`;
                    return `Đã xem: ${s}s`;
                  };

                  const formattedWatchTime = currentTab === 'history' && m.watch_time ? formatDuration(m.watch_time) : '';

                  const progressPercent = currentTab === 'watch_later' && m.duration && m.duration > 0
                    ? Math.min(Math.round((m.watch_time || 0) / m.duration * 100), 100)
                    : 0;

                  const href = currentTab === 'watch_later' && m.episode_id
                    ? `/xem/${m.slug}?ep=${m.episode_id}`
                    : `/phim/${m.slug}`;

                  return (
                    <Link key={m.id} href={href} className="group flex flex-col">
                      <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden mb-2 shadow-lg border border-white/5">
                        <span className="absolute bottom-2.5 left-2.5 bg-[#00ac47]/90 text-white text-[10px] font-bold px-2 py-0.5 rounded backdrop-blur-sm z-10">
                          {m.latest_episode || m.quality || 'HD'}
                        </span>
                        <img 
                          src={getProxyImageUrl(m.poster_url || m.thumb_url || '', 200)} 
                          alt={m.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 bg-zinc-900" 
                        />
                        {currentTab === 'watch_later' && progressPercent > 0 && (
                          <div className="absolute bottom-0 left-0 w-full h-1.5 bg-white/20 z-20">
                            <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${progressPercent}%` }} />
                          </div>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-white mb-0.5 truncate">{m.title}</h3>
                      <p className="text-xs text-zinc-400 truncate">{m.original_title || m.title}</p>
                      {currentTab === 'history' && (
                        <div className="flex flex-col gap-0.5 mt-1">
                          {formattedWatchTime && (
                            <p className="text-[10px] text-amber-400 font-medium">{formattedWatchTime}</p>
                          )}
                          {savedTimeStr && (
                            <p className="text-[10px] text-zinc-500">Xem lúc: {savedTimeStr}</p>
                          )}
                        </div>
                      )}
                      {currentTab === 'watch_later' && progressPercent > 0 && (
                        <p className="text-[10px] text-[#00ac47] font-semibold mt-1">Đã xem {progressPercent}%</p>
                      )}
                      {currentTab !== 'history' && currentTab !== 'watch_later' && savedTimeStr && (
                        <p className="text-[10px] text-zinc-500 mt-1">Thêm lúc: {savedTimeStr}</p>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal: Create Folder */}
      {showModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn" 
          onClick={() => setShowModal(false)}
        >
          <div 
            className="bg-[#0f1118] border border-white/[0.08] rounded-2xl p-6 w-full max-w-md shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white mb-4 mt-0">Tạo thư mục phim mới</h3>
            <button 
              onClick={() => setShowModal(false)} 
              className="absolute top-4 right-4 bg-transparent border-none text-zinc-400 hover:text-white text-xl cursor-pointer"
            >
              ×
            </button>
            <form onSubmit={handleCreateFolder}>
              <div className="mb-4">
                <label className="block text-sm text-zinc-400 mb-2">Tên thư mục</label>
                <input 
                  type="text" 
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  placeholder="Ví dụ: Phim Hành Động Hay Nhất" 
                  required 
                  className="w-full bg-zinc-950 border border-white/10 rounded-lg px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-colors text-sm"
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm text-zinc-400 mb-2">Quyền riêng tư</label>
                <select 
                  value={isPublic} 
                  onChange={(e) => setIsPublic(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-lg px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-colors text-sm"
                >
                  <option value="1">Công khai (Bất kỳ ai cũng có thể xem)</option>
                  <option value="0">Riêng tư (Chỉ mình bạn xem)</option>
                </select>
              </div>
              <div className="flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)} 
                  className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-lg cursor-pointer border-none text-sm"
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-4 py-2.5 bg-[#00ac47] hover:bg-[#00c250] text-white font-semibold rounded-lg cursor-pointer border-none text-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Đang tạo...' : 'Tạo thư mục'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
