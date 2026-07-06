'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getProxyImageUrl } from '@/lib/image';
import WatchPartyPlayer from '@/components/WatchPartyPlayer';

interface WatchRoomClientProps {
  room: any;
  currentUser: { id: number; name: string; avatar: string | null } | null;
}

export default function WatchRoomClient({ room, currentUser }: WatchRoomClientProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const isHost = currentUser ? currentUser.id === room.host_id : false;
  const [messages, setMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const [syncStatus, setSyncStatus] = useState<'synced' | 'unsynced'>('synced');
  const [loadingClose, setLoadingClose] = useState<boolean>(false);
  const [currentSyncTime, setCurrentSyncTime] = useState<number>(room.current_time || 0);
  const [currentSyncStatus, setCurrentSyncStatus] = useState<'playing' | 'paused'>(room.status || 'playing');

  const [countdown, setCountdown] = useState<number>(0);
  const [isWaiting, setIsWaiting] = useState<boolean>(false);

  useEffect(() => {
    if (room.scheduled_at) {
      const targetTime = new Date(room.scheduled_at).getTime();
      const updateCountdown = () => {
        const now = Date.now();
        if (targetTime > now) {
          setCountdown(Math.floor((targetTime - now) / 1000));
          setIsWaiting(true);
        } else {
          setCountdown(0);
          setIsWaiting(false);
        }
      };

      updateCountdown();
      const interval = setInterval(updateCountdown, 1000);
      return () => clearInterval(interval);
    }
  }, [room.scheduled_at]);

  const formatCountdown = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor(seconds % (3600 * 24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    const s = Math.floor(seconds % 60);

    if (d > 0) return `${d} ngày ${h} giờ ${m} phút ${s} giây`;
    if (h > 0) return `${h} giờ ${m} phút ${s} giây`;
    return `${m} phút ${s} giây`;
  };

  const lastMsgIdRef = useRef<number>(0);
  const isSyncingRef = useRef<boolean>(false);
  const isInitializedRef = useRef<boolean>(false);

  const videoUrl = room.episodes.video_url;

  // Handle movie ended
  const handleMovieEnded = async () => {
    alert('Phim đã kết thúc! Phòng xem chung này hiện đã hết hạn.');
    try {
      await fetch('/api/watch-room/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_code: room.room_id, is_ended: true })
      });
    } catch (e) {
      console.error(e);
    }
    router.push('/xem-chung');
  };

  // Sync polling function
  const triggerSync = async (force: boolean = false) => {
    if (isSyncingRef.current) return;

    const video = videoRef.current;
    const currentTime = video ? video.currentTime : 0;
    const status = video ? (video.paused ? 'paused' : 'playing') : 'paused';

    // Host only reports progress after initialization from server
    const shouldSendHostUpdate = isHost && isInitializedRef.current && !isWaiting;

    let url = `/api/watch-room/sync?room_code=${room.room_id}&last_msg_id=${lastMsgIdRef.current}`;
    if (shouldSendHostUpdate) {
      url += `&is_host=1&current_time=${currentTime}&status=${status}`;
    }

    try {
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.success) {
        setCurrentSyncTime(data.current_time || 0);
        setCurrentSyncStatus(data.status || 'playing');

        // Initialize player time from server on first run
        if (!isInitializedRef.current) {
          isSyncingRef.current = true;
          if (video) {
            video.currentTime = data.current_time || 0;
            if (data.status === 'playing') {
              video.play().catch(() => { });
            } else {
              video.pause();
            }
          }
          isInitializedRef.current = true;
          setTimeout(() => {
            isSyncingRef.current = false;
          }, 250);
          setSyncStatus('synced');
        } else if (!isHost) {
          // Sync player status if Guest
          isSyncingRef.current = true;
          if (video) {
            const timeDiff = Math.abs(video.currentTime - data.current_time);

            if (timeDiff > 3 || force) {
              video.currentTime = data.current_time;
            }

            if (data.status === 'playing' && video.paused) {
              video.play().catch(() => { });
            } else if (data.status === 'paused' && !video.paused) {
              video.pause();
            }
          }

          // Buffer delay
          setTimeout(() => {
            isSyncingRef.current = false;
          }, 250);
          setSyncStatus('synced');
        } else {
          setSyncStatus('synced');
        }

        // Process chat messages
        if (data.messages && data.messages.length > 0) {
          setMessages(prev => {
            const next = [...prev];
            data.messages.forEach((msg: any) => {
              if (!next.some(m => m.id === msg.id)) {
                next.push(msg);
                lastMsgIdRef.current = Math.max(lastMsgIdRef.current, msg.id);
              }
            });
            return next;
          });

          // Scroll to bottom
          setTimeout(() => {
            if (chatContainerRef.current) {
              chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
            }
          }, 100);
        }
      } else if (data.message === 'Phòng không tồn tại hoặc đã bị đóng') {
        alert(data.message);
        router.push('/xem-chung');
      }
    } catch (err) {
      console.error('Watch Sync Error:', err);
    }
  };

  // Start polling loops
  useEffect(() => {
    // Initial sync
    triggerSync(true);

    // Setup polling every 1.5s
    const timer = setInterval(() => triggerSync(false), 1500);

    return () => clearInterval(timer);
  }, [isHost, room.room_id]);

  // Handle local video changes if host
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isHost) return;

    const onPlay = () => triggerSync();
    const onPause = () => triggerSync();
    const onSeeked = () => triggerSync();

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('seeked', onSeeked);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('seeked', onSeeked);
    };
  }, [isHost]);

  // Send message handler
  const sendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      alert('Bạn cần đăng nhập để gửi tin nhắn.');
      return;
    }
    const msg = chatInput.trim();
    if (!msg) return;

    setChatInput('');

    try {
      const res = await fetch('/api/watch-room/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_code: room.room_id,
          message: msg
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        // Trigger sync immediately to fetch new messages
        triggerSync();
      } else {
        alert(data.message || 'Lỗi gửi tin nhắn.');
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  // Close room handler (host only)
  const closeRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm('Bạn có chắc muốn đóng phòng chiếu phim này?')) return;

    setLoadingClose(true);
    try {
      const res = await fetch('/api/watch-room/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_code: room.room_id })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        router.push('/xem-chung');
      } else {
        alert(data.message || 'Lỗi đóng phòng.');
      }
    } catch (err) {
      console.error('Failed to close room:', err);
    } finally {
      setLoadingClose(false);
    }
  };

  // Copy invite link
  const copyInviteLink = () => {
    const inviteUrl = window.location.href;
    navigator.clipboard.writeText(inviteUrl).then(() => {
      alert('Đã sao chép liên kết mời!');
    });
  };

  return (
    <div className="min-h-screen pb-16 bg-[#09090b] text-white pt-24 select-none text-left">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8">
        {/* Top Nav Back */}
        <div className="w-full pt-4 flex items-center justify-between">
          <Link className="inline-flex items-center text-zinc-400 hover:text-white transition-colors text-xs font-semibold decoration-none" href="/xem-chung">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 mr-1">
              <path d="m15 18-6-6 6-6" />
            </svg>
            Quay lại Xem Chung
          </Link>
        </div>

        {/* Active Watch Layout Split */}
        <div className="w-full pt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Video Player Column (Span 8) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="relative bg-black rounded-2xl overflow-hidden border border-zinc-900 aspect-video shadow-2xl flex items-center justify-center">
              {isWaiting ? (
                <div className="text-center p-6 space-y-4">
                  <div className="w-20 h-20 mx-auto bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-800">
                    <svg className="w-10 h-10 text-yellow-500 animate-pulse" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                  </div>
                  <h3 className="text-2xl font-bold text-white uppercase tracking-wider">Phim sắp chiếu</h3>
                  <p className="text-zinc-400">Vui lòng chờ ở sảnh. Phim sẽ tự động bắt đầu sau:</p>
                  <div className="text-4xl font-black text-yellow-500 tabular-nums">
                    {formatCountdown(countdown)}
                  </div>
                </div>
              ) : (
                <WatchPartyPlayer
                  url={videoUrl}
                  currentTime={currentSyncTime}
                  status={currentSyncStatus}
                  movieTitle={room.title}
                  episodeName={room.episodes?.name || ''}
                  posterUrl={getProxyImageUrl(room.movies.poster_url || room.movies.thumb_url || '', 200)}
                  isHost={isHost}
                  videoRef={videoRef}
                  onEnded={handleMovieEnded}
                />
              )}
            </div>

            {/* Player Status & Sync Controls Row */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-zinc-950/60 border border-zinc-800/60 rounded-2xl p-4 backdrop-blur-md">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900/80 border border-zinc-800/60 rounded-xl">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-[#ffd875]">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                  <span className="text-[10px] font-bold text-zinc-400">
                    Mã phòng: <span className="text-white select-all">{room.room_id}</span>
                  </span>
                </div>
                <button
                  onClick={copyInviteLink}
                  className="px-3.5 py-2 bg-[#ffd875]/10 hover:bg-[#ffd875]/20 border border-[#ffd875]/25 text-[#ffd875] font-bold rounded-xl text-[10px] transition-all cursor-pointer outline-none active:scale-95"
                >
                  Sao chép link mời
                </button>
                <button
                  onClick={() => triggerSync(true)}
                  className={`px-3.5 py-2 font-bold rounded-xl text-[10px] transition-all cursor-pointer border outline-none active:scale-95 ${syncStatus === 'synced'
                      ? 'bg-[#ffd875]/10 border-[#ffd875]/25 text-[#ffd875]'
                      : 'bg-red-500/10 border-red-500/25 text-red-400'
                    }`}
                >
                  {syncStatus === 'synced' ? 'Đã đồng bộ' : 'Chưa đồng bộ'}
                </button>
              </div>

              <div className="flex items-center gap-3">
                {isHost ? (
                  <form onSubmit={closeRoom}>
                    <button
                      type="submit"
                      disabled={loadingClose}
                      className="px-4 py-2 bg-red-650 hover:bg-red-600 border border-red-700/50 text-white font-bold rounded-xl text-[10px] transition-all cursor-pointer disabled:opacity-50 outline-none active:scale-95"
                    >
                      {loadingClose ? 'ĐANG ĐÓNG...' : 'Đóng phòng chiếu'}
                    </button>
                  </form>
                ) : (
                  <Link href="/xem-chung" className="px-4 py-2 bg-zinc-800/80 hover:bg-zinc-700/90 border border-zinc-700/50 text-zinc-300 hover:text-white font-bold rounded-xl text-[10px] transition-all decoration-none active:scale-95">
                    Thoát phòng
                  </Link>
                )}
                <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[9px] font-black bg-red-600/10 text-red-500 border border-red-500/20 uppercase tracking-widest">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
                  </span>LIVE
                </span>
              </div>
            </div>

            {/* Movie Description Details */}
            <div className="bg-zinc-900/20 border border-zinc-800/60 rounded-2xl p-5 space-y-3">
              <h2 className="text-base font-extrabold text-white tracking-tight">{room.title}</h2>
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500">
                <span>Phim: {room.movies.title}</span>
                <span>•</span>
                <span>Tập {room.episodes.name}</span>
                <span>•</span>
                <span>Chủ phòng: {room.users.name}</span>
              </div>
              <hr className="border-zinc-800/65" />
              <p className="text-xs text-zinc-400 leading-relaxed font-medium">
                {room.movies.description || 'Không có mô tả chi tiết cho phim này.'}
              </p>
            </div>
          </div>

          {/* Chat Column (Span 4) */}
          <div className="lg:col-span-4 flex flex-col bg-zinc-950/40 backdrop-blur-md border border-zinc-800/85 rounded-3xl h-[65vh] lg:h-[80vh] overflow-hidden">
            {/* Chat Header */}
            <div className="px-5 py-4 border-b border-zinc-800/60 bg-zinc-950/50 flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                💬 Live Chat
              </h3>
              <span className="text-[10px] text-zinc-500 font-bold">
                phòng xem chung
              </span>
            </div>

            {/* Messages Window */}
            <div ref={chatContainerRef} className="flex-1 p-5 overflow-y-auto space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-[10px] text-zinc-650 font-semibold">Hãy gửi tin nhắn đầu tiên để chào đón bạn bè nhé!</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = currentUser ? currentUser.id === msg.user_id : false;
                  const avatar = msg.user_avatar ? getProxyImageUrl(msg.user_avatar, 64) : 'https://github.com/shadcn.png';

                  return (
                    <div key={msg.id} className={`flex gap-3 items-start ${isMe ? 'flex-row-reverse' : ''}`}>
                      <img src={avatar} alt="Avatar" className="w-7 h-7 rounded-full object-cover shrink-0 border border-zinc-800" />
                      <div className="space-y-0.5 max-w-[80%]">
                        <span className={`block text-[8px] text-zinc-500 font-bold ${isMe ? 'text-right' : ''}`}>
                          {msg.user_name}
                        </span>
                        <div className={`px-3 py-2 rounded-2xl text-xs font-medium leading-relaxed shadow-md ${isMe
                            ? 'bg-[#ffd875] text-zinc-950 rounded-tr-none font-semibold'
                            : 'bg-zinc-900/90 text-zinc-200 border border-zinc-800/50 rounded-tl-none'
                          }`}>
                          {msg.message}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Message Form Input */}
            <div className="p-4 border-t border-zinc-800/60 bg-zinc-950/40">
              {currentUser ? (
                <form onSubmit={sendChatMessage} className="flex gap-2 items-center bg-zinc-950/80 border border-zinc-800 rounded-xl p-1.5 focus-within:border-[#ffd875]/80 transition-all duration-255">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Nhập tin nhắn chat..."
                    className="flex-1 bg-transparent text-white text-xs px-3 focus:outline-none placeholder-zinc-650 font-medium border-none"
                  />
                  <button type="submit" className="w-8 h-8 rounded-lg bg-[#ffd875] hover:bg-[#ffe39c] text-zinc-950 flex items-center justify-center shrink-0 border-none transition-all cursor-pointer active:scale-95">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  </button>
                </form>
              ) : (
                <div className="text-center py-2">
                  <Link href="/pages/login" className="text-xs font-bold text-[#ffd875] hover:text-[#ffe39c] decoration-none">
                    Đăng nhập để tham gia trò chuyện
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
