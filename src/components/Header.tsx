'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getProxyImageUrl } from '@/lib/image';
import AdBanner from '@/components/AdBanner';

interface HeaderProps {
  genres: any[];
  countries: any[];
  logoUrl: string;
  siteName: string;
  user?: {
    id: number;
    name: string;
    email: string;
    role: string;
    avatar: string | null;
  } | null;
  adsBelowHeaderEnabled?: boolean;
  adsBelowHeaderImage?: string;
  adsBelowHeaderLink?: string;
}

export default function Header({ genres, countries, logoUrl, siteName, user, adsBelowHeaderEnabled = false, adsBelowHeaderImage = '', adsBelowHeaderLink = '' }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<{ movies: any[], actors: any[] }>({ movies: [], actors: [] });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const mobileSearchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        setIsSearching(true);
        try {
          const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(searchQuery)}`);
          if (res.ok) {
            const data = await res.json();
            setSuggestions(data);
          }
        } catch (error) {
          console.error('Search suggestion error:', error);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSuggestions({ movies: [], actors: [] });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
      if (mobileSearchContainerRef.current && !mobileSearchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    if (!user) return;
    setLoadingNotifs(true);
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      if (res.ok && data.success) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoadingNotifs(false);
    }
  };

  const handleReadNotif = async (id: number) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);

    const target = notifications.find(n => n.id === id);
    if (target && !target.is_read) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));

      try {
        await fetch('/api/notifications', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'read', id })
        });
      } catch (err) {
        console.error('Error marking notification as read:', err);
      }
    }
  };

  const handleReadAllNotifs = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read_all' })
      });
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest('.notif-container')) {
        setShowNotifDropdown(false);
      }
    }
    if (showNotifDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifDropdown]);

  useEffect(() => {
    if (!user) return;
    const fetchUnreadCount = async () => {
      try {
        const res = await fetch('/api/notifications');
        const data = await res.json();
        if (res.ok) {
          setUnreadCount(data.unreadCount || 0);
        }
      } catch (err) {
        console.error('Error fetching unread notifications count:', err);
      }
    };
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.reload();
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
      if (scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    // Initial check
    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  const renderSuggestionsDropdown = () => {
    if (!showSuggestions || searchQuery.trim().length < 2) return null;
    if (!isSearching && suggestions.movies.length === 0 && suggestions.actors.length === 0) return null;

    return (
      <div className="absolute top-full left-0 mt-2 w-full min-w-[280px] sm:min-w-[340px] bg-[#12121a] border border-white/10 rounded-xl py-2 shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-[9999] max-h-[80vh] overflow-y-auto hidden-scrollbar">
        {isSearching ? (
          <div className="flex items-center justify-center p-6">
            <svg className="animate-spin h-6 w-6 text-[#FFD166]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : (
          <>
            {suggestions.movies.length > 0 && (
              <div className="mb-2">
                <div className="text-[11px] font-bold text-white/40 uppercase tracking-wider mb-1.5 px-3">Phim</div>
                <div className="flex flex-col">
                  {suggestions.movies.map((m) => (
                    <Link
                      key={m.id}
                      href={`/phim/${m.slug}`}
                      onClick={() => setShowSuggestions(false)}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-white/5 transition-colors group"
                    >
                      <img src={getProxyImageUrl(m.thumb_url)} alt={m.title} className="w-10 h-14 object-cover rounded shadow-sm shrink-0" />
                      <div className="flex-1 min-w-0 flex flex-col">
                        <span className="text-[14px] font-bold text-white group-hover:text-[#FFD166] transition-colors truncate">{m.title}</span>
                        <span className="text-[12px] text-white/50 truncate">{m.original_title}</span>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-white/40">
                          {m.year && <span>{m.year}</span>}
                          {m.year && m.episode_current && <span>•</span>}
                          {m.episode_current && <span>{m.episode_current}</span>}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {suggestions.actors.length > 0 && (
              <div>
                <div className="text-[11px] font-bold text-white/40 uppercase tracking-wider mb-1.5 px-3 border-t border-white/5 pt-3">Diễn viên</div>
                <div className="flex flex-col">
                  {suggestions.actors.map((a) => (
                    <Link
                      key={a.id}
                      href={`/dien-vien/${a.slug}`}
                      onClick={() => setShowSuggestions(false)}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-white/5 transition-colors group"
                    >
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800 shrink-0 border border-white/10">
                        {a.thumb_url ? (
                          <img src={getProxyImageUrl(a.thumb_url)} alt={a.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white/30 uppercase">{a.name.charAt(0)}</div>
                        )}
                      </div>
                      <span className="text-[14px] font-semibold text-white group-hover:text-[#FFD166] transition-colors truncate">{a.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 
        ${isScrolled || showMobileSearch
          ? 'bg-[#0a0a0f]/95 backdrop-blur-md border-b border-zinc-900/50 shadow-lg'
          : 'bg-[#0a0a0f] border-b border-zinc-900/50 shadow-lg lg:bg-transparent lg:border-transparent lg:backdrop-blur-none lg:shadow-none'
        }`}
      >
        <div className="w-full px-2 lg:px-4 flex flex-col justify-center pt-2 min-h-[68px] lg:min-h-[76px]">



          <div className="w-full flex items-center justify-between h-[68px] lg:h-[76px]">
            {/* Mobile Header (Left Menu & Logo) */}
            <div className="flex items-center gap-2 lg:hidden">
              <button
                onClick={() => setShowMobileMenu(true)}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-zinc-950 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-zinc-800 h-10 w-10 lg:hidden text-zinc-400 hover:text-green-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-menu h-6 w-6" aria-hidden="true">
                  <line x1="4" x2="20" y1="12" y2="12"></line>
                  <line x1="4" x2="20" y1="6" y2="6"></line>
                  <line x1="4" x2="20" y1="18" y2="18"></line>
                </svg>
              </button>

              <Link className="flex items-center shrink-0" href="/">
                <img
                  alt={siteName}
                  width="160"
                  height="45"
                  className="h-10 w-auto object-contain"
                  src={logoUrl}
                  loading="lazy"
                />
              </Link>
            </div>

            {/* Mobile Search Icon */}
            <div className="flex items-center gap-1 lg:hidden shrink-0">

              {user && (
                <div className="relative notif-container">
                  <button
                    onClick={() => {
                      setShowNotifDropdown(!showNotifDropdown);
                      if (!showNotifDropdown) {
                        fetchNotifications();
                      }
                    }}
                    className="relative p-2 text-zinc-400 hover:text-white transition-colors bg-transparent border-none cursor-pointer outline-none"
                    title="Thông báo"
                  >
                    <svg className={`w-5.5 h-5.5 ${unreadCount > 0 ? 'text-yellow-400 animate-pulse' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
                    </svg>
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center border border-zinc-950">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {showNotifDropdown && (
                    <div className="absolute right-0 mt-2 w-[290px] max-w-[calc(100vw-20px)] bg-[#0f1118]/95 backdrop-blur-[20px] border border-white/10 rounded-2xl shadow-2xl py-3 z-50 animate-fadeIn text-white">
                      <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between">
                        <span className="font-extrabold text-sm text-white">Thông báo</span>
                        <div className="flex items-center gap-2">
                          {unreadCount > 0 && (
                            <button
                              onClick={handleReadAllNotifs}
                              className="text-[10px] text-amber-400 hover:text-amber-300 font-bold bg-transparent border-none cursor-pointer outline-none"
                            >
                              Đọc tất cả
                            </button>
                          )}
                          <Link href="/thong-bao" className="text-[10px] text-zinc-400 hover:text-white font-bold" onClick={() => setShowNotifDropdown(false)}>
                            Xem tất cả
                          </Link>
                        </div>
                      </div>
                      <div className="max-h-[260px] overflow-y-auto divide-y divide-white/5">
                        {loadingNotifs ? (
                          <div className="px-4 py-6 text-center text-xs text-zinc-500">Đang tải...</div>
                        ) : notifications.length === 0 ? (
                          <div className="px-4 py-6 text-center text-xs text-zinc-500">Không có thông báo nào.</div>
                        ) : (
                          notifications.map((n) => {
                            const isExpanded = expandedId === n.id;
                            return (
                              <div
                                key={n.id}
                                onClick={() => handleReadNotif(n.id)}
                                className={`p-3 text-left transition-colors cursor-pointer hover:bg-white/[0.03] ${!n.is_read ? 'bg-white/[0.01]' : ''}`}
                              >
                                <div className="flex items-start gap-2.5">
                                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${!n.is_read ? 'bg-amber-400' : 'bg-transparent'}`}></div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-1">
                                      <span className={`text-[11px] font-bold text-zinc-200 truncate ${!n.is_read ? 'text-white' : ''}`}>{n.title}</span>
                                      <span className="text-[8px] text-zinc-500 font-semibold shrink-0">{new Date(n.created_at).toLocaleDateString('vi-VN')}</span>
                                    </div>
                                    <p className={`text-[10px] text-zinc-400 mt-0.5 leading-normal ${isExpanded ? '' : 'line-clamp-2'}`}>
                                      {n.message}
                                    </p>
                                    {isExpanded && n.link && (
                                      <Link
                                        href={n.link}
                                        onClick={(e) => { e.stopPropagation(); setShowNotifDropdown(false); }}
                                        className="inline-block mt-1 text-[9px] text-amber-400 font-bold hover:underline"
                                      >
                                        Xem chi tiết →
                                      </Link>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <button
                className={`p-2 rounded-full transition-colors ${showMobileSearch ? 'text-yellow-400 bg-white/5' : 'text-zinc-400 hover:text-white'}`}
                aria-label="Search"
                onClick={() => setShowMobileSearch(!showMobileSearch)}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </button>
            </div>

            {/* Desktop Header */}
            <div className="hidden lg:flex items-center w-full justify-between h-full">
              <div className="flex items-center h-full flex-1 min-w-0">

                {/* Logo */}
                <Link className="flex items-center gap-2 shrink-0 pr-1 xl:pr-3" href="/">
                  <img
                    alt={siteName}
                    width="200"
                    height="60"
                    className="h-10 xl:h-14 w-auto object-contain"
                    src={logoUrl}
                  />
                </Link>

                {/* Search Box */}
                <div className="ml-1 xl:ml-2 w-[240px] xl:w-[340px] 2xl:w-[400px] shrink-0 transition-all duration-300">
                  <div className="relative" ref={searchContainerRef}>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      const search = formData.get('search') as string;
                      if (search && search.trim() !== '') {
                        router.push(`/filter?search=${encodeURIComponent(search.trim())}`);
                        setShowSuggestions(false);
                      }
                    }}>
                      <div className="relative">
                        <input
                          name="search"
                          placeholder="Tìm kiếm phim, diễn viên"
                          className="h-[42px] bg-white/10 text-[15px] text-white placeholder:text-[#FFFFFF]/60 focus:outline-none border transition-all w-full pl-10 pr-4 border-white/0 focus:border-white focus:bg-zinc-900 rounded-[8px]"
                          type="search"
                          autoComplete="off"
                          value={searchQuery}
                          onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setShowSuggestions(true);
                          }}
                          onFocus={() => setShowSuggestions(true)}
                        />
                        <button type="submit" className="hidden" aria-hidden="true">Submit</button>
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                      </div>
                    </form>
                    {renderSuggestionsDropdown()}
                  </div>
                </div>

                {/* Navigation links */}
                <nav className="flex items-center gap-0.5 xl:gap-1 ml-4 xl:ml-8">
                  <Link className="px-2 xl:px-2.5 py-2 text-[13px] text-[#FFFFFF] hover:text-white transition-colors rounded-lg hover:bg-white/5 whitespace-nowrap" href="/phim-le">
                    Phim Lẻ
                  </Link>
                  <Link className="px-2 xl:px-2.5 py-2 text-[13px] text-[#FFFFFF] hover:text-white transition-colors rounded-lg hover:bg-white/5 whitespace-nowrap" href="/phim-bo">
                    Phim Bộ
                  </Link>
                  <Link className="px-2 xl:px-2.5 py-2 text-[13px] text-[#FFFFFF] hover:text-white transition-colors rounded-lg hover:bg-white/5 whitespace-nowrap" href="/hoat-hinh">
                    Hoạt Hình
                  </Link>
                  <Link className="px-2 xl:px-2.5 py-2 text-[13px] text-[#FFFFFF] hover:text-white transition-colors rounded-lg hover:bg-white/5 whitespace-nowrap" href="/tv-shows">
                    TV Shows
                  </Link>
                  <Link className="px-2 xl:px-2.5 py-2 text-[13px] text-[#FFFFFF] hover:text-white transition-colors rounded-lg hover:bg-white/5 whitespace-nowrap" href="/bai-viet">
                    Bài Viết
                  </Link>

                  {/* Thể loại Dropdown */}
                  <div className="nav-item relative group">
                    <button className="px-2 xl:px-2.5 py-2 text-[13px] text-[#FFFFFF] hover:text-white transition-colors rounded-lg hover:bg-white/5 whitespace-nowrap">
                      Thể Loại ▾
                    </button>
                    <div className="nav-dropdown absolute top-full left-0 mt-1 w-[480px] bg-zinc-900 border border-zinc-800 rounded-xl p-4 shadow-2xl invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200">
                      <div className="grid grid-cols-3 gap-1">
                        {genres.map((g) => (
                          <Link
                            key={g.id}
                            className="px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-left"
                            href={`/filter?category=${g.id}`}
                          >
                            {g.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Quốc gia Dropdown */}
                  <div className="nav-item relative group">
                    <button className="px-2 xl:px-2.5 py-2 text-[13px] text-[#FFFFFF] hover:text-white transition-colors rounded-lg hover:bg-white/5 whitespace-nowrap">
                      Quốc Gia ▾
                    </button>
                    <div className="nav-dropdown absolute top-full left-0 mt-1 w-[400px] bg-zinc-900 border border-zinc-800 rounded-xl p-4 shadow-2xl invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200">
                      <div className="grid grid-cols-3 gap-1">
                        {countries.map((c) => (
                          <Link
                            key={c.id}
                            className="px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-left"
                            href={`/filter?category=${c.id}`}
                          >
                            {c.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Thêm Dropdown */}
                  <div className="nav-item relative group">
                    <button className="px-2 xl:px-2.5 py-2 text-[13px] text-[#FFFFFF] hover:text-white transition-colors rounded-lg hover:bg-white/5 whitespace-nowrap">
                      Thêm ▾
                    </button>
                    <div className="nav-dropdown absolute top-full left-0 mt-1 w-[210px] bg-zinc-900 border border-zinc-800 rounded-xl p-2 shadow-2xl invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200">
                      <div className="flex flex-col gap-0.5">

                        <Link className="px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-left" href="/xem-chung">
                          Xem Chung
                        </Link>
                        <Link className="px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-left" href="/dien-vien">
                          Diễn viên
                        </Link>
                        <Link className="px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-left" href="/lich-chieu">
                          Lịch chiếu
                        </Link>
                        <Link className="px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-left" href="/yeu-cau">
                          Yêu cầu phim
                        </Link>
                      </div>
                    </div>
                  </div>

                </nav>
              </div>

              {/* Download App & User Profile Actions */}
              <div className="ml-2 xl:ml-auto flex items-center gap-2 xl:gap-4 shrink-0 relative">
                <Link
                  className="hidden xl:flex items-center gap-2.5 py-1 px-2 hover:opacity-80 transition-opacity cursor-pointer"
                  href="/tai-app"
                >
                  <div className="relative w-8 h-8 flex items-center justify-center text-[#FFD166] shrink-0">
                    <svg id="Pc" width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" clipRule="evenodd" d="M10.9998 16.8992C11.1655 16.8992 11.2998 16.7649 11.2998 16.5992V11.5982C11.2998 9.28322 13.1838 7.39922 15.4998 7.39922H18.7998C18.9238 7.39922 19.0446 7.41106 19.1616 7.43327C19.3745 7.47368 19.5998 7.32682 19.5998 7.11012V6.69922C19.5998 6.67022 19.5968 6.64022 19.5918 6.61222C19.2488 4.66722 17.4468 3.19922 15.4008 3.19922H6.79982C4.42882 3.19922 2.49982 5.12822 2.49982 7.49922V12.5982C2.49982 14.9692 4.42882 16.8992 6.79982 16.8992H8.24282L7.86182 19.2492H5.85982C5.44582 19.2492 5.10982 19.5852 5.10982 19.9992C5.10982 20.4132 5.44582 20.7492 5.85982 20.7492H10.7598C11.1738 20.7492 11.5098 20.4132 11.5098 19.9992C11.5098 19.5852 11.1738 19.2492 10.7598 19.2492H9.38082L9.76182 16.8992H10.9998Z" fill="currentColor"></path>
                      <path fillRule="evenodd" clipRule="evenodd" d="M17.1912 18.4564C16.7712 18.4564 16.4302 18.1154 16.4302 17.6954C16.4302 17.2754 16.7712 16.9344 17.1912 16.9344C17.6112 16.9344 17.9522 17.2754 17.9522 17.6954C17.9522 18.1154 17.6112 18.4564 17.1912 18.4564ZM18.8002 8.90039H15.5002C14.0362 8.90039 12.8002 10.1364 12.8002 11.5994V18.0994C12.8002 19.5884 14.0112 20.7994 15.5002 20.7994H18.8002C20.2892 20.7994 21.5002 19.5884 21.5002 18.0994V11.5994C21.5002 10.1364 20.2642 8.90039 18.8002 8.90039Z" fill="#ffffff"></path>
                    </svg>
                  </div>
                  <div className="text-left flex-1">
                    <p className="text-[11px] text-white/70 mb-0.5" style={{ lineHeight: '11px' }}>Tải ứng dụng</p>
                    <p className="text-[14px] font-bold text-white leading-none">Tô Phim</p>
                  </div>
                </Link>
                {user ? (
                  <div className="flex items-center gap-2.5">
                    <div className="relative notif-container">
                      <button
                        onClick={() => {
                          setShowNotifDropdown(!showNotifDropdown);
                          if (!showNotifDropdown) {
                            fetchNotifications();
                          }
                        }}
                        className="relative p-2.5 text-zinc-400 hover:text-white transition-colors rounded-full hover:bg-white/5 shrink-0 cursor-pointer outline-none border-none bg-transparent"
                        title="Thông báo"
                      >
                        <svg className={`w-5 h-5 ${unreadCount > 0 ? 'text-yellow-400 animate-pulse' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
                        </svg>
                        {unreadCount > 0 && (
                          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-zinc-950">
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </span>
                        )}
                      </button>

                      {showNotifDropdown && (
                        <div className="absolute right-0 mt-2 w-[340px] bg-[#0f1118]/95 backdrop-blur-[20px] border border-white/10 rounded-2xl shadow-2xl py-3 z-50 animate-fadeIn text-white">
                          <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between">
                            <span className="font-extrabold text-sm text-white">Thông báo</span>
                            <div className="flex items-center gap-2">
                              {unreadCount > 0 && (
                                <button
                                  onClick={handleReadAllNotifs}
                                  className="text-[10px] text-amber-400 hover:text-amber-300 font-bold bg-transparent border-none cursor-pointer outline-none"
                                >
                                  Đọc tất cả
                                </button>
                              )}
                              <Link href="/thong-bao" className="text-[10px] text-zinc-400 hover:text-white font-bold" onClick={() => setShowNotifDropdown(false)}>
                                Xem tất cả
                              </Link>
                            </div>
                          </div>
                          <div className="max-h-[300px] overflow-y-auto divide-y divide-white/5">
                            {loadingNotifs ? (
                              <div className="px-4 py-6 text-center text-xs text-zinc-500">Đang tải...</div>
                            ) : notifications.length === 0 ? (
                              <div className="px-4 py-6 text-center text-xs text-zinc-500">Không có thông báo nào.</div>
                            ) : (
                              notifications.map((n) => {
                                const isExpanded = expandedId === n.id;
                                return (
                                  <div
                                    key={n.id}
                                    onClick={() => handleReadNotif(n.id)}
                                    className={`p-3 text-left transition-colors cursor-pointer hover:bg-white/[0.03] ${!n.is_read ? 'bg-white/[0.01]' : ''}`}
                                  >
                                    <div className="flex items-start gap-2.5">
                                      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${!n.is_read ? 'bg-amber-400' : 'bg-transparent'}`}></div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-1">
                                          <span className={`text-[11px] font-bold text-zinc-200 truncate ${!n.is_read ? 'text-white' : ''}`}>{n.title}</span>
                                          <span className="text-[8px] text-zinc-500 font-semibold shrink-0">{new Date(n.created_at).toLocaleDateString('vi-VN')}</span>
                                        </div>
                                        <p className={`text-[10px] text-zinc-400 mt-0.5 leading-normal ${isExpanded ? '' : 'line-clamp-2'}`}>
                                          {n.message}
                                        </p>
                                        {isExpanded && n.link && (
                                          <Link
                                            href={n.link}
                                            onClick={(e) => { e.stopPropagation(); setShowNotifDropdown(false); }}
                                            className="inline-block mt-1 text-[9px] text-amber-400 font-bold hover:underline"
                                          >
                                            Xem chi tiết →
                                          </Link>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="relative">
                      <button
                        onClick={() => setShowUserDropdown(!showUserDropdown)}
                        onBlur={() => setTimeout(() => setShowUserDropdown(false), 200)}
                        className="flex items-center gap-2 h-9 xl:h-10 px-3 xl:px-4 bg-white/10 hover:bg-white/20 text-white rounded-full font-medium transition-colors text-[13px] xl:text-sm shrink-0 border border-white/10"
                      >
                        <div className="w-5 h-5 rounded-full bg-[#00ac47] flex items-center justify-center text-xs font-bold text-white uppercase overflow-hidden shrink-0">
                          {user.avatar ? (
                            <img src={getProxyImageUrl(user.avatar, 64)} alt={user.name} className="w-full h-full object-cover" />
                          ) : (
                            user.name.charAt(0)
                          )}
                        </div>
                        <span className="max-w-[100px] truncate">{user.name}</span>
                        <svg className={`w-3.5 h-3.5 opacity-60 transition-transform ${showUserDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path>
                        </svg>
                      </button>

                      {showUserDropdown && (
                        <div className="absolute right-0 mt-2 w-48 bg-[#0a0a0f] border border-zinc-800 rounded-xl shadow-2xl py-1 z-50 animate-fadeIn">
                          <Link
                            href="/pages/profile"
                            className="flex items-center gap-2 px-4 py-2.5 text-xs text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
                          >
                            Trang cá nhân
                          </Link>
                          <Link
                            href="/thu-vien"
                            className="flex items-center gap-2 px-4 py-2.5 text-xs text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
                          >
                            Thư viện
                          </Link>
                          <Link
                            href="/lich-su"
                            className="flex items-center gap-2 px-4 py-2.5 text-xs text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
                          >
                            Lịch sử xem
                          </Link>
                          <Link
                            href="/xem-sau"
                            className="flex items-center gap-2 px-4 py-2.5 text-xs text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
                          >
                            Xem tiếp
                          </Link>
                          <Link
                            href="/pages/profile?tab=utils"
                            className="flex items-center gap-2 px-4 py-2.5 text-xs text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
                          >
                            Cài đặt bảo mật
                          </Link>
                          <Link
                            href="/pages/profile?tab=logs"
                            className="flex items-center gap-2 px-4 py-2.5 text-xs text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
                          >
                            Nhật ký hoạt động
                          </Link>
                          <Link
                            href="/pages/lien-ket-tv"
                            className="flex items-center gap-2 px-4 py-2.5 text-xs text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
                          >
                            Liên kết Smart TV
                          </Link>
                          {user.role === 'admin' && (
                            <a
                              href="/admin"
                              className="flex items-center gap-2 px-4 py-2.5 text-xs text-zinc-300 hover:text-white hover:bg-white/5 transition-colors border-t border-white/5"
                            >
                              Quản trị viên
                            </a>
                          )}
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-colors text-left font-medium border-t border-white/5"
                          >
                            Đăng xuất
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <Link
                    href="/pages/login"
                    className="flex justify-center items-center gap-1.5 h-9 xl:h-10 px-3 xl:px-4 bg-[#F2F4F7] hover:bg-white text-[#1c1c1c] rounded-full font-medium transition-colors text-[13px] xl:text-sm shadow-sm hover:shadow shrink-0"
                  >
                    <svg className="w-4 h-4 xl:w-5 xl:h-5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"></path>
                    </svg>
                    <span>Thành viên</span>
                  </Link>
                )}
              </div>

            </div>

          </div>

          {/* Mobile Search Input Row */}
          {showMobileSearch && (
            <div className="w-full bg-[#12121a] p-3 border-b border-zinc-900/50 relative" ref={mobileSearchContainerRef}>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const search = formData.get('search') as string;
                if (search && search.trim() !== '') {
                  router.push(`/filter?search=${encodeURIComponent(search.trim())}`);
                  setShowMobileSearch(false);
                  setShowSuggestions(false);
                }
              }}>
                <div className="relative flex gap-2">
                  <div className="relative flex-1">
                    <input
                      name="search"
                      autoFocus
                      placeholder="Tìm kiếm phim, diễn viên..."
                      className="h-[42px] bg-white/10 text-[15px] text-white placeholder:text-white/60 focus:outline-none border transition-all w-full pl-10 pr-4 border-white/20 focus:border-yellow-400 focus:bg-zinc-900 rounded-[8px]"
                      type="search"
                      autoComplete="off"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                    />
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                  </div>
                  <button type="submit" className="h-[42px] px-4 bg-amber-400 hover:bg-amber-500 text-zinc-950 font-bold rounded-[8px] shrink-0 transition-colors">
                    Tìm
                  </button>
                </div>
              </form>
              {renderSuggestionsDropdown()}
            </div>
          )}

        </div>

        {/* Below-header ad banner */}
        {adsBelowHeaderEnabled && adsBelowHeaderImage && (
          <div className="absolute top-[100%] left-0 right-0 w-full flex justify-center pt-2 pb-2 bg-transparent pointer-events-none">
            <div className="w-full max-w-[1400px] px-2 lg:px-4 pointer-events-auto">
              <AdBanner
                image={adsBelowHeaderImage}
                link={adsBelowHeaderLink}
                position="below_header"
                className="rounded-lg shadow-[0_5px_20px_rgba(0,0,0,0.5)] border border-white/10 [&>img]:!max-h-[60px] sm:[&>img]:!max-h-[80px]"
              />
            </div>
          </div>
        )}
      </header>

      {/* Mobile Drawer Menu */}
      {showMobileMenu && (
        <>
          {/* Overlay */}
          <div className="fixed inset-0 z-[99998] bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setShowMobileMenu(false)} />

          {/* Bottom Drawer Content */}
          <div className="fixed bottom-0 left-0 right-0 z-[99999] bg-zinc-950 border-t border-zinc-900 rounded-t-3xl p-3 lg:hidden max-h-[85vh] overflow-y-auto" style={{ transform: 'none' }}>
            <div
              className="w-12 h-1.5 bg-zinc-800 rounded-full mx-auto mb-8 cursor-grab active:cursor-grabbing touch-none"
              onClick={() => setShowMobileMenu(false)}
            />
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Khám Phá</h2>
              <button
                className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white"
                onClick={() => setShowMobileMenu(false)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x w-5 h-5" aria-hidden="true">
                  <path d="M18 6 6 18"></path>
                  <path d="m6 6 12 12"></path>
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <Link
                className="relative group flex items-center justify-between p-4 rounded-xl border transition-all duration-300 overflow-visible bg-gradient-to-b from-amber-950 via-amber-950/60 to-transparent border-amber-500/30 hover:scale-[1.02]"
                href="/chu-de"
                onClick={() => setShowMobileMenu(false)}
              >
                <div className="flex-1 pr-6 relative z-20">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1 rounded-lg bg-black/20 border border-white/10 text-amber-500">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-hash w-4 h-4" aria-hidden="true">
                        <line x1="4" x2="20" y1="9" y2="9"></line>
                        <line x1="4" x2="20" y1="15" y2="15"></line>
                        <line x1="10" x2="8" y1="3" y2="21"></line>
                        <line x1="16" x2="14" y1="3" y2="21"></line>
                      </svg>
                    </div>
                    <h2 className="font-bold text-xs text-white">Chủ đề</h2>
                  </div>
                </div>
                <div className="absolute bottom-0 right-2 w-18 h-32 z-10 pointer-events-none">
                  <img alt="Chủ đề" className="w-full h-full object-contain object-bottom drop-shadow-xl transition-transform group-hover:scale-110 origin-bottom" src="https://sf-static.onflixcdn.com/images/pic/1767296206_url.webp" />
                </div>
                <div className="absolute inset-0 z-15 rounded-xl bg-gradient-to-t from-amber-950 via-amber-950/60 to-transparent border-amber-500/30"></div>
              </Link>

              <Link
                className="relative group flex items-center justify-between p-4 rounded-xl border transition-all duration-300 overflow-visible bg-gradient-to-b from-blue-950 via-blue-950/60 to-transparent border-blue-500/30 hover:scale-[1.02]"
                href="/phim-bo"
                onClick={() => setShowMobileMenu(false)}
              >
                <div className="flex-1 pr-6 relative z-20">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1 rounded-lg bg-black/20 border border-white/10 text-blue-500">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-tv w-4 h-4" aria-hidden="true">
                        <path d="m17 2-5 5-5-5"></path>
                        <rect width="20" height="15" x="2" y="7" rx="2"></rect>
                      </svg>
                    </div>
                    <h2 className="font-bold text-xs text-white">Phim Bộ</h2>
                  </div>
                </div>
                <div className="absolute bottom-0 right-2 w-18 h-32 z-10 pointer-events-none">
                  <img alt="Phim Bộ" className="w-full h-full object-contain object-bottom drop-shadow-xl transition-transform group-hover:scale-110 origin-bottom" src="https://sf-static.onflixcdn.com/images/chinh_1749641591_68496977bded3.webp" />
                </div>
                <div className="absolute inset-0 z-15 rounded-xl bg-gradient-to-t from-blue-950 via-blue-950/60 to-transparent border-blue-500/30"></div>
              </Link>

              <Link
                className="relative group flex items-center justify-between p-4 rounded-xl border transition-all duration-300 overflow-visible bg-gradient-to-b from-green-950 via-green-950/60 to-transparent border-green-500/30 hover:scale-[1.02]"
                href="/phim-le"
                onClick={() => setShowMobileMenu(false)}
              >
                <div className="flex-1 pr-6 relative z-20">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1 rounded-lg bg-black/20 border border-white/10 text-green-500">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-film w-4 h-4" aria-hidden="true">
                        <rect width="18" height="18" x="3" y="3" rx="2"></rect>
                        <path d="M7 3v18"></path>
                        <path d="M3 7.5h4"></path>
                        <path d="M3 12h18"></path>
                        <path d="M3 16.5h4"></path>
                        <path d="M17 3v18"></path>
                        <path d="M17 7.5h4"></path>
                        <path d="M17 16.5h4"></path>
                      </svg>
                    </div>
                    <h2 className="font-bold text-xs text-white">Phim Lẻ</h2>
                  </div>
                </div>
                <div className="absolute bottom-0 right-2 w-18 h-32 z-10 pointer-events-none">
                  <img alt="Phim Lẻ" className="w-full h-full object-contain object-bottom drop-shadow-xl transition-transform group-hover:scale-110 origin-bottom" src="https://sf-static.onflixcdn.com/images/pic/1757092595_url.webp" />
                </div>
                <div className="absolute inset-0 z-15 rounded-xl bg-gradient-to-t from-green-950 via-green-950/60 to-transparent border-green-500/30"></div>
              </Link>

              <Link
                className="relative group flex items-center justify-between p-4 rounded-xl border transition-all duration-300 overflow-visible bg-gradient-to-b from-indigo-900 via-indigo-900/60 to-transparent border-indigo-500/30 hover:scale-[1.02]"
                href="/filter?country=40"
                onClick={() => setShowMobileMenu(false)}
              >
                <div className="flex-1 pr-6 relative z-20">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1 rounded-lg bg-black/20 border border-white/10 text-pink-500">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-globe w-4 h-4" aria-hidden="true">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path>
                        <path d="M2 12h20"></path>
                      </svg>
                    </div>
                    <h2 className="font-bold text-xs text-white">Phim Hàn</h2>
                  </div>
                </div>
                <div className="absolute bottom-0 right-2 w-18 h-32 z-10 pointer-events-none">
                  <img alt="Phim Hàn" className="w-full h-full object-contain object-bottom drop-shadow-xl transition-transform group-hover:scale-110 origin-bottom" src="https://sf-static.onflixcdn.com/images/chinh_1749641594_6849697aaf31d.webp" />
                </div>
                <div className="absolute inset-0 z-15 rounded-xl bg-gradient-to-t from-indigo-900 via-indigo-900/60 to-transparent border-indigo-500/30"></div>
              </Link>

              <Link
                className="relative group flex items-center justify-between p-4 rounded-xl border transition-all duration-300 overflow-visible bg-gradient-to-b from-red-950 via-red-950/60 to-transparent border-red-500/30 hover:scale-[1.02]"
                href="/filter?country=28"
                onClick={() => setShowMobileMenu(false)}
              >
                <div className="flex-1 pr-6 relative z-20">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1 rounded-lg bg-black/20 border border-white/10 text-red-500">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-globe w-4 h-4" aria-hidden="true">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path>
                        <path d="M2 12h20"></path>
                      </svg>
                    </div>
                    <h2 className="font-bold text-xs text-white">Phim Trung</h2>
                  </div>
                </div>
                <div className="absolute bottom-0 right-2 w-18 h-32 z-10 pointer-events-none">
                  <img alt="Phim Trung" className="w-full h-full object-contain object-bottom drop-shadow-xl transition-transform group-hover:scale-110 origin-bottom" src="https://sf-static.onflixcdn.com/images/pic/1767983418_url.webp" />
                </div>
                <div className="absolute inset-0 z-15 rounded-xl bg-gradient-to-t from-red-950 via-red-950/60 to-transparent border-red-500/30"></div>
              </Link>

              <Link
                className="relative group flex items-center justify-between p-4 rounded-xl border transition-all duration-300 overflow-visible bg-gradient-to-b from-yellow-950 via-yellow-950/60 to-transparent border-yellow-500/30 hover:scale-[1.02]"
                href="/hoat-hinh"
                onClick={() => setShowMobileMenu(false)}
              >
                <div className="flex-1 pr-6 relative z-20">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1 rounded-lg bg-black/20 border border-white/10 text-yellow-500">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-circle-play w-4 h-4" aria-hidden="true">
                        <path d="M9 9.003a1 1 0 0 1 1.517-.859l4.997 2.997a1 1 0 0 1 0 1.718l-4.997 2.997A1 1 0 0 1 9 14.996z"></path>
                        <circle cx="12" cy="12" r="10"></circle>
                      </svg>
                    </div>
                    <h2 className="font-bold text-xs text-white">Hoạt Hình</h2>
                  </div>
                </div>
                <div className="absolute bottom-0 right-2 w-18 h-32 z-10 pointer-events-none">
                  <img alt="Hoạt Hình" className="w-full h-full object-contain object-bottom drop-shadow-xl transition-transform group-hover:scale-110 origin-bottom" src="https://sf-static.onflixcdn.com/images/1753429603_url.webp" />
                </div>
                <div className="absolute inset-0 z-15 rounded-xl bg-gradient-to-t from-yellow-950 via-yellow-950/60 to-transparent border-yellow-500/30"></div>
              </Link>

              <Link
                className="relative group flex items-center justify-between p-4 rounded-xl border transition-all duration-300 overflow-visible bg-gradient-to-b from-purple-950 via-purple-950/60 to-transparent border-purple-500/30 hover:scale-[1.02]"
                href="/dien-vien"
                onClick={() => setShowMobileMenu(false)}
              >
                <div className="flex-1 pr-6 relative z-20">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1 rounded-lg bg-black/20 border border-white/10 text-purple-500">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-star w-4 h-4" aria-hidden="true">
                        <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"></path>
                      </svg>
                    </div>
                    <h2 className="font-bold text-xs text-white">Diễn viên</h2>
                  </div>
                </div>
                <div className="absolute bottom-0 right-2 w-18 h-32 z-10 pointer-events-none">
                  <img alt="Diễn viên" className="w-full h-full object-contain object-bottom drop-shadow-xl transition-transform group-hover:scale-110 origin-bottom" src="https://sf-static.onflixcdn.com/images/pic/1756520409_url.webp" />
                </div>
                <div className="absolute inset-0 z-15 rounded-xl bg-gradient-to-t from-purple-950 via-purple-950/60 to-transparent border-purple-500/30"></div>
              </Link>

              <Link
                className="relative group flex items-center justify-between p-4 rounded-xl border transition-all duration-300 overflow-visible bg-gradient-to-b from-blue-950 via-blue-950/60 to-transparent border-blue-500/30 hover:scale-[1.02]"
                href="/lich-su"
                onClick={() => setShowMobileMenu(false)}
              >
                <div className="flex-1 pr-6 relative z-20">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1 rounded-lg bg-black/20 border border-white/10 text-blue-500">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-history w-4 h-4" aria-hidden="true">
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                        <path d="M3 3v5h5"></path>
                        <path d="M12 7v5l4 2"></path>
                      </svg>
                    </div>
                    <h2 className="font-bold text-xs text-white">Lịch sử</h2>
                  </div>
                </div>
                <div className="absolute bottom-0 right-2 w-18 h-32 z-10 pointer-events-none">
                  <img alt="Lịch sử" className="w-full h-full object-contain object-bottom drop-shadow-xl transition-transform group-hover:scale-110 origin-bottom" src="https://sf-static.onflixcdn.com/images/pic/1755686803_url.webp" />
                </div>
                <div className="absolute inset-0 z-15 rounded-xl bg-gradient-to-t from-blue-950 via-blue-950/60 to-transparent border-blue-500/30"></div>
              </Link>

              <Link
                className="relative group flex items-center justify-between p-4 rounded-xl border transition-all duration-300 overflow-visible bg-gradient-to-b from-pink-950 via-pink-950/60 to-transparent border-pink-500/30 hover:scale-[1.02]"
                href="/thu-vien"
                onClick={() => setShowMobileMenu(false)}
              >
                <div className="flex-1 pr-6 relative z-20">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1 rounded-lg bg-black/20 border border-white/10 text-pink-500">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-library w-4 h-4" aria-hidden="true">
                        <path d="m16 6 4 14"></path>
                        <path d="M12 6v14"></path>
                        <path d="M8 8v12"></path>
                        <path d="M4 4v16"></path>
                      </svg>
                    </div>
                    <h2 className="font-bold text-xs text-white">Thư viện</h2>
                  </div>
                </div>
                <div className="absolute bottom-0 right-2 w-18 h-32 z-10 pointer-events-none">
                  <img alt="Thư viện" className="w-full h-full object-contain object-bottom drop-shadow-xl transition-transform group-hover:scale-110 origin-bottom" src="https://sf-static.onflixcdn.com/images/default/1767962758_url.webp" />
                </div>
                <div className="absolute inset-0 z-15 rounded-xl bg-gradient-to-t from-pink-950 via-pink-950/60 to-transparent border-pink-500/30"></div>
              </Link>

              <Link
                className="relative group flex items-center justify-between p-4 rounded-xl border transition-all duration-300 overflow-visible bg-gradient-to-b from-yellow-950 via-yellow-950/60 to-transparent border-yellow-500/30 hover:scale-[1.02]"
                href="/xem-chung"
                onClick={() => setShowMobileMenu(false)}
              >
                <div className="flex-1 pr-6 relative z-20">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1 rounded-lg bg-black/20 border border-white/10 text-yellow-500">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-users-round w-4 h-4" aria-hidden="true">
                        <path d="M18 21a8 8 0 0 0-16 0"></path>
                        <circle cx="10" cy="8" r="5"></circle>
                        <path d="M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3"></path>
                      </svg>
                    </div>
                    <h2 className="font-bold text-xs text-white">Xem chung</h2>
                  </div>
                </div>
                <div className="absolute bottom-0 right-2 w-18 h-32 z-10 pointer-events-none">
                  <img alt="Xem chung" className="w-full h-full object-contain object-bottom drop-shadow-xl transition-transform group-hover:scale-110 origin-bottom" src="https://sf-static.onflixcdn.com/images/chinh_1749641601_68496981326ff.webp" />
                </div>
                <div className="absolute inset-0 z-15 rounded-xl bg-gradient-to-t from-yellow-950 via-yellow-950/60 to-transparent border-yellow-500/30"></div>
              </Link>

              <Link
                className="relative group flex items-center justify-between p-4 rounded-xl border transition-all duration-300 overflow-visible bg-gradient-to-b from-emerald-950 via-emerald-950/60 to-transparent border-emerald-500/30 hover:scale-[1.02]"
                href="/yeu-cau"
                onClick={() => setShowMobileMenu(false)}
              >
                <div className="flex-1 pr-6 relative z-20">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1 rounded-lg bg-black/20 border border-white/10 text-emerald-500">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-file-text w-4 h-4" aria-hidden="true">
                        <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path>
                        <path d="M14 2v4a2 2 0 0 0 2 2h4"></path>
                        <path d="M10 9H8"></path>
                        <path d="M16 13H8"></path>
                        <path d="M16 17H8"></path>
                      </svg>
                    </div>
                    <h2 className="font-bold text-xs text-white">Yêu cầu</h2>
                  </div>
                </div>
                <div className="absolute bottom-0 right-2 w-18 h-32 z-10 pointer-events-none">
                  <img alt="Yêu cầu" className="w-full h-full object-contain object-bottom drop-shadow-xl transition-transform group-hover:scale-110 origin-bottom" src="https://sf-static.onflixcdn.com/images/default/1767962758_url.webp" />
                </div>
                <div className="absolute inset-0 z-15 rounded-xl bg-gradient-to-t from-emerald-950 via-emerald-950/60 to-transparent border-emerald-500/30"></div>
              </Link>

              <Link
                className="relative group flex items-center justify-between p-4 rounded-xl border transition-all duration-300 overflow-visible bg-gradient-to-b from-teal-950 via-teal-950/60 to-transparent border-teal-500/30 hover:scale-[1.02]"
                href="/bai-viet"
                onClick={() => setShowMobileMenu(false)}
              >
                <div className="flex-1 pr-6 relative z-20">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1 rounded-lg bg-black/20 border border-white/10 text-teal-500">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-book-open w-4 h-4" aria-hidden="true">
                        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                      </svg>
                    </div>
                    <h2 className="font-bold text-xs text-white">Bài Viết</h2>
                  </div>
                </div>
                <div className="absolute bottom-0 right-2 w-18 h-32 z-10 pointer-events-none">
                  <img alt="Bài Viết" className="w-full h-full object-contain object-bottom drop-shadow-xl transition-transform group-hover:scale-110 origin-bottom" src="https://sf-static.onflixcdn.com/images/default/1767962758_url.webp" />
                </div>
                <div className="absolute inset-0 z-15 rounded-xl bg-gradient-to-t from-teal-950 via-teal-950/60 to-transparent border-teal-500/30"></div>
              </Link>
            </div>

            <div className="mt-8 pt-6 border-t border-zinc-800 text-center">
              <p className="text-xs text-zinc-600">Kéo xuống để đóng</p>
            </div>
          </div>
        </>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 lg:hidden">
        <div className="flex items-center gap-1.5 p-1 bg-neutral-950/70 backdrop-blur-md border border-white/10 rounded-[32px] shadow-2xl shadow-black/80">
          <Link
            className={`relative flex flex-col items-center justify-center gap-0 px-4 py-2 rounded-2xl transition-colors z-10 min-w-[64px] ${pathname === '/' ? 'text-white font-bold' : 'text-white/85 hover:text-white'}`}
            href="/"
          >
            {pathname === '/' && (
              <div className="absolute inset-0 bg-[#00ac47]/80 backdrop-blur-sm -z-10 rounded-[32px]" />
            )}
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-house h-5 w-5 relative z-10" aria-hidden="true"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"></path><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>
            <span className="text-[9px] whitespace-nowrap relative z-10 mt-0.5">Trang ch?</span>
          </Link>

          <Link
            className={`relative flex flex-col items-center justify-center gap-0 px-4 py-2 rounded-2xl transition-colors z-10 min-w-[64px] ${pathname === '/filter' ? 'text-white font-bold' : 'text-white/85 hover:text-white'}`}
            href="/filter"
          >
            {pathname === '/filter' && (
              <div className="absolute inset-0 bg-[#00ac47]/80 backdrop-blur-sm -z-10 rounded-[32px]" />
            )}
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-layout-dashboard h-5 w-5 relative z-10" aria-hidden="true"><rect width="7" height="9" x="3" y="3" rx="1"></rect><rect width="7" height="5" x="14" y="3" rx="1"></rect><rect width="7" height="9" x="14" y="12" rx="1"></rect><rect width="7" height="5" x="3" y="16" rx="1"></rect></svg>
            <span className="text-[9px] whitespace-nowrap relative z-10 mt-0.5">Khám Phá</span>
          </Link>

          <Link
            className={`relative flex flex-col items-center justify-center gap-0 px-4 py-2 rounded-2xl transition-colors z-10 min-w-[64px] ${pathname === '/thu-vien' ? 'text-white font-bold' : 'text-white/85 hover:text-white'}`}
            href="/thu-vien"
          >
            {pathname === '/thu-vien' && (
              <div className="absolute inset-0 bg-[#00ac47]/80 backdrop-blur-sm -z-10 rounded-[32px]" />
            )}
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-library h-5 w-5 relative z-10" aria-hidden="true">
              <path d="m16 6 4 14"></path>
              <path d="M12 6v14"></path>
              <path d="M8 8v12"></path>
              <path d="M4 4v16"></path>
            </svg>
            <span className="text-[9px] whitespace-nowrap relative z-10 mt-0.5">Thư viện</span>
          </Link>

          <Link
            className={`relative flex flex-col items-center justify-center gap-0 px-4 py-2 rounded-2xl transition-colors z-10 min-w-[64px] ${pathname === '/pages/profile' ? 'text-white font-bold' : 'text-white/85 hover:text-white'}`}
            href="/pages/profile"
          >
            {pathname === '/pages/profile' && (
              <div className="absolute inset-0 bg-[#00ac47]/80 backdrop-blur-sm -z-10 rounded-[32px]" />
            )}
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-user h-5 w-5 relative z-10" aria-hidden="true"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            <span className="text-[9px] whitespace-nowrap relative z-10 mt-0.5">Tài Khoản</span>
          </Link>
        </div>
      </div>
    </>
  );
}

