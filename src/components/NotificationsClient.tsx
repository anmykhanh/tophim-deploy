'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  link: string | null;
  created_at: string;
  is_read: boolean;
}

export default function NotificationsClient() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedNotif, setSelectedNotif] = useState<Notification | null>(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      if (res.ok) {
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReadAll = async () => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read_all' })
      });
      if (res.ok) {
        setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRead = async (notif: Notification) => {
    setSelectedNotif(notif);
    if (!notif.is_read) {
      // Cập nhật state trước
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
      try {
        await fetch('/api/notifications', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'read', id: notif.id })
        });
      } catch (err) {
        console.error(err);
      }
    }
  };

  const getFilteredNotifications = () => {
    switch (activeTab) {
      case 'unread':
        return notifications.filter(n => !n.is_read);
      case 'system':
        return notifications.filter(n => n.type === 'system' || n.type === 'maintenance');
      case 'like':
        return notifications.filter(n => n.type === 'like');
      case 'reply':
        return notifications.filter(n => n.type === 'reply');
      case 'premium':
        return notifications.filter(n => n.type === 'premium');
      case 'family':
        return notifications.filter(n => n.type === 'family');
      default:
        return notifications;
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'premium':
        return (
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl border border-amber-500/20">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
            </svg>
          </div>
        );
      case 'like':
        return (
          <div className="p-3 bg-pink-500/10 text-pink-500 rounded-xl border border-pink-500/20">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path>
            </svg>
          </div>
        );
      case 'reply':
        return (
          <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl border border-blue-500/20">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
            </svg>
          </div>
        );
      case 'family':
        return (
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/20">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
            </svg>
          </div>
        );
      default:
        return (
          <div className="p-3 bg-purple-500/10 text-purple-500 rounded-xl border border-purple-500/20">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
            </svg>
          </div>
        );
    }
  };

  const tabs = [
    { id: 'all', label: 'Tất cả' },
    { id: 'unread', label: 'Chưa đọc' },
    { id: 'system', label: 'Hệ thống' },
    { id: 'like', label: 'Lượt thích' },
    { id: 'reply', label: 'Phản hồi' },
    { id: 'premium', label: 'Premium' },
    { id: 'family', label: 'Gia đình' }
  ];

  const filtered = getFilteredNotifications();

  return (
    <div className="min-h-screen bg-[#07070a] text-zinc-100 pt-[100px] pb-12">
      <div className="max-w-4xl mx-auto px-4">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
              Thông Báo Hệ Thống
            </h1>
            <p className="text-zinc-400 text-sm mt-1">Cập nhật những hoạt động, thay đổi mới nhất về tài khoản của bạn</p>
          </div>
          {notifications.some(n => !n.is_read) && (
            <button
              onClick={handleReadAll}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white rounded-lg border border-zinc-800 hover:border-zinc-700 transition-all shadow-md shrink-0 self-start md:self-center"
            >
              <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path>
              </svg>
              Đọc tất cả
            </button>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-3 mb-6 scrollbar-thin border-b border-zinc-900">
          {tabs.map((tab) => {
            const count = tab.id === 'unread' 
              ? notifications.filter(n => !n.is_read).length
              : tab.id === 'all'
                ? 0
                : notifications.filter(n => {
                    if (n.is_read) return false;
                    if (tab.id === 'system') return n.type === 'system' || n.type === 'maintenance';
                    return n.type === tab.id;
                  }).length;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-4 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/20'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                    activeTab === tab.id ? 'bg-white text-indigo-600' : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-zinc-500">Đang tải thông báo...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-zinc-950/30 rounded-2xl border border-zinc-900/50">
            <div className="w-16 h-16 bg-zinc-900/50 rounded-2xl flex items-center justify-center text-zinc-600 border border-zinc-800/50 mb-4 animate-pulse">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z"></path>
              </svg>
            </div>
            <h3 className="text-sm font-bold text-zinc-300">Không có thông báo</h3>
            <p className="text-xs text-zinc-500 max-w-xs mt-1">Không tìm thấy thông báo nào trong danh mục này.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleRead(notif)}
                className={`flex gap-4 p-4 rounded-xl border transition-all cursor-pointer group ${
                  notif.is_read
                    ? 'bg-zinc-950/20 border-zinc-900 hover:border-zinc-800 hover:bg-zinc-950/40'
                    : 'bg-[#0f0f18] border-violet-500/10 hover:border-violet-500/30 shadow-[0_0_15px_rgba(139,92,246,0.03)]'
                }`}
              >
                {getIcon(notif.type)}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className={`text-sm font-bold truncate group-hover:text-white transition-colors ${
                      notif.is_read ? 'text-zinc-300' : 'text-zinc-100'
                    }`}>
                      {notif.title}
                    </h3>
                    <span className="text-[10px] text-zinc-500 whitespace-nowrap mt-0.5">
                      {new Date(notif.created_at).toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                    {notif.message}
                  </p>
                </div>

                {!notif.is_read && (
                  <div className="flex items-center justify-center shrink-0">
                    <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 animate-pulse"></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Modal Dialog Details */}
        {selectedNotif && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedNotif(null)} />
            
            <div className="relative w-full max-w-md bg-[#0d0d13] border border-zinc-800 rounded-2xl shadow-2xl p-6 overflow-hidden animate-zoomIn">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  {getIcon(selectedNotif.type)}
                  <div>
                    <span className="text-[10px] font-bold tracking-wider text-violet-400 uppercase">
                      {selectedNotif.type}
                    </span>
                    <span className="text-[10px] text-zinc-500 block">
                      {new Date(selectedNotif.created_at).toLocaleString('vi-VN')}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedNotif(null)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>

              <h2 className="text-lg font-bold text-white mb-2 leading-snug">
                {selectedNotif.title}
              </h2>
              
              <div className="text-xs text-zinc-300 leading-relaxed space-y-2 whitespace-pre-wrap max-h-[300px] overflow-y-auto scrollbar-thin pr-1 border-t border-zinc-900 pt-3">
                {selectedNotif.message}
              </div>

              {selectedNotif.link && (
                <div className="mt-6">
                  <Link
                    href={selectedNotif.link}
                    onClick={() => setSelectedNotif(null)}
                    className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-xs font-bold text-white rounded-xl shadow-lg shadow-violet-500/25 transition-all text-center"
                  >
                    Xem chi tiết
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"></path>
                    </svg>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
