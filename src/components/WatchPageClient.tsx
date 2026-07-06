'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import VideoPlayer from '@/components/VideoPlayer';
import AdBanner from '@/components/AdBanner';
import AdPopup from '@/components/AdPopup';
import { getPosterUrl, getProxyImageUrl } from '@/lib/image';
import ActorCard from '@/components/ActorCard';

// Remove hardcoded GIPHY key
const DEFAULT_ANON_AVATAR = '/avt/meme/avatar-hai-huoc-vo-tri-0.jpg';

function getAvatarSrc(avatar: string | null | undefined, fallback?: string) {
  if (!avatar) return fallback || DEFAULT_ANON_AVATAR;
  if (avatar.startsWith('http')) return avatar;
  return avatar;
}

function formatTime(dateStr: string) {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return 'Vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} ngày trước`;
  return date.toLocaleDateString('vi-VN');
}

interface WatchPageClientProps {
  movie: any;
  episodes: any[];
  currentEpisode: any;
  currentUser?: { id: number; name: string; avatar: string | null; role: string; permissions?: any } | null;
  comments: any[];
  actors?: any[];
  recommendations?: any[];
  giphyApiKey?: string;
  facebookGroupUrl?: string;
  seasons?: any[];
  adsConfig?: Record<string, string>;
  initialProgress?: number;
}

function formatMovieStatus(movie: any, maxEpisodes: number): string {
  if (!movie) return 'Full';
  const status = (movie.status || '').toLowerCase().trim();
  const currentStr = (movie.episode_current || '').trim();

  if (status === 'trailer') return 'Sắp chiếu';

  let total = 0;
  const match = currentStr.match(/\d+\s*\/\s*(\d+)/);
  if (match) {
    total = parseInt(match[1], 10);
  } else {
    const htMatch = currentStr.match(/\((\d+)\s*\/\s*(\d+)\)/);
    if (htMatch) {
      total = parseInt(htMatch[2], 10);
    } else {
      const parts = currentStr.match(/\d+/g);
      if (parts && parts.length === 2 && currentStr.includes('/')) {
        total = parseInt(parts[1], 10);
      }
    }
  }

  if (total === 0 && movie.duration) {
    const durMatch = movie.duration.match(/^(\d+)\s*Tập/i);
    if (durMatch) {
      total = parseInt(durMatch[1], 10);
    }
  }

  if (total === 0 && movie.showtimes) {
    try {
      const showtimesData = JSON.parse(movie.showtimes);
      if (showtimesData.type === 'tmdb_showtimes') {
        let maxEpInShowtimes = 0;
        if (showtimesData.upcoming && showtimesData.upcoming.length > 0) {
          const lastUpcoming = showtimesData.upcoming[showtimesData.upcoming.length - 1];
          const m = lastUpcoming.episode.match(/\d+/);
          if (m) maxEpInShowtimes = parseInt(m[0], 10);
        } else if (showtimesData.next) {
          const m = showtimesData.next.match(/Tập (\d+)/);
          if (m) maxEpInShowtimes = parseInt(m[1], 10);
        }
        if (maxEpInShowtimes > total) {
          total = maxEpInShowtimes;
        }
      }
    } catch {
      // ignore
    }
  }

  if (total === 0 && movie.tmdb_total_episodes > 0) {
    total = movie.tmdb_total_episodes;
  }

  const isCompleted = status === 'completed' || 
                      currentStr.toLowerCase().includes('hoàn tất') || 
                      currentStr.toLowerCase() === 'full' ||
                      (total > 0 && maxEpisodes >= total);
  
  if (isCompleted) {
    const finalTotal = total > 0 ? total : maxEpisodes;
    if (finalTotal > 0) return `Hoàn tất: ${maxEpisodes} / ${finalTotal} tập`;
    return 'Hoàn tất';
  } else {
    if (total > 0 && maxEpisodes > 0) return `Đã chiếu: ${maxEpisodes} / ${total} tập`;
    if (maxEpisodes > 0) return `Đã chiếu: ${maxEpisodes} / ?? tập`;
    return currentStr || 'Đang chiếu';
  }
}

export default function WatchPageClient({
  movie,
  episodes,
  currentEpisode,
  currentUser,
  comments,
  actors,
  recommendations,
  giphyApiKey = 'dc6zaTOxFJmzC',
  facebookGroupUrl,
  seasons = [],
  adsConfig = {},
  initialProgress = 0,
}: WatchPageClientProps & { comments: any[]; actors: any[]; recommendations: any[] }) {
  const [selectedServer, setSelectedServer] = useState<string>('');
  const [selectedEdition, setSelectedEdition] = useState<string>('');
  const [currentPlayerTime, setCurrentPlayerTime] = useState<number>(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showSeasonDropdown, setShowSeasonDropdown] = useState(false);
  const [autoPlayNext, setAutoPlayNext] = useState(true);
  const [autoSkipIntro, setAutoSkipIntro] = useState(false);
  const [cinemaMode, setCinemaMode] = useState(false);
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [showShortcutsPanel, setShowShortcutsPanel] = useState(false);
  const [showtimesExpanded, setShowtimesExpanded] = useState(false);

  let showtimesData: any = null;
  if (movie.showtimes) {
    try {
      showtimesData = JSON.parse(movie.showtimes);
    } catch {
      // Not JSON, it's a plain string
    }
  }

  const isDateInPast = (text: string) => {
    if (!text) return false;
    const match1 = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (match1) {
      const day = parseInt(match1[1], 10);
      const month = parseInt(match1[2], 10);
      const year = parseInt(match1[3], 10);
      if (day <= 31 && month <= 12) {
        const date = new Date(year, month - 1, day, 23, 59, 59);
        return date.getTime() < Date.now();
      }
    }
    const match2 = text.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (match2) {
      const year = parseInt(match2[1], 10);
      const month = parseInt(match2[2], 10);
      const day = parseInt(match2[3], 10);
      const date = new Date(year, month - 1, day, 23, 59, 59);
      return date.getTime() < Date.now();
    }
    return false;
  };

  const showtimesText = showtimesData?.type === 'tmdb_showtimes' ? showtimesData.next : movie.showtimes;
  const isShowtimesExpired = showtimesText ? isDateInPast(showtimesText) : false;

  const [activeEpisode, setActiveEpisode] = useState(currentEpisode);
  const [targetProgress, setTargetProgress] = useState(initialProgress);

  // Sync activeEpisode if currentEpisode prop changes from outside (e.g. navigation)
  useEffect(() => {
    setActiveEpisode(currentEpisode);
  }, [currentEpisode]);

  // Sync targetProgress if initialProgress prop changes from outside
  useEffect(() => {
    setTargetProgress(initialProgress);
  }, [initialProgress]);

  // Increment views only when user actually visits the page (client-side)
  const watchViewCounted = useRef(false);
  useEffect(() => {
    if (watchViewCounted.current) return;
    watchViewCounted.current = true;
    fetch('/api/movies/views', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ movieId: movie.id })
    }).catch(console.error);
  }, [movie.id]);

  const [globalServers, setGlobalServers] = useState<any[]>([]);
  useEffect(() => {
    fetch('/api/servers').then(r => r.json()).then(data => {
      if (data.success) {
        setGlobalServers(data.servers || []);
      }
    }).catch(console.error);
  }, []);

  const groupedForCount: Record<string, number> = {};
  episodes.forEach(ep => {
    groupedForCount[ep.server_name] = (groupedForCount[ep.server_name] || 0) + 1;
  });
  const maxEpisodes = Object.values(groupedForCount).reduce((max, count) => Math.max(max, count), 0);

  const displayEpisodeCurrent = (() => {
    const rawCurrent = (movie.episode_current || '').trim();
    
    // Parse total episodes
    let total = 0;
    const match = rawCurrent.match(/\d+\s*\/\s*(\d+)/);
    if (match) {
      total = parseInt(match[1], 10);
    } else {
      const htMatch = rawCurrent.match(/\((\d+)\s*\/\s*(\d+)\)/);
      if (htMatch) {
        total = parseInt(htMatch[2], 10);
      } else {
        const parts = rawCurrent.match(/\d+/g);
        if (parts && parts.length === 2 && rawCurrent.includes('/')) {
          total = parseInt(parts[1], 10);
        }
      }
    }
    if (total === 0 && movie.tmdb_total_episodes > 0) {
      total = movie.tmdb_total_episodes;
    }

    // Parse current number from raw string (e.g. "Tập 11/12" -> 11)
    let currentNum = 0;
    const numMatch = rawCurrent.match(/tập\s*(\d+)/i) || rawCurrent.match(/(\d+)/);
    if (numMatch) {
      currentNum = parseInt(numMatch[1], 10);
    }

    const finalCurrent = Math.max(currentNum, maxEpisodes);

    const isCompleted = movie.status === 'completed' || 
                        rawCurrent.toLowerCase().includes('hoàn tất') || 
                        rawCurrent.toLowerCase().includes('hoàn thành') || 
                        rawCurrent.toLowerCase() === 'full' || 
                        (total > 0 && finalCurrent >= total);

    if (isCompleted) {
      if (total > 0) return `Tập ${finalCurrent}/${total}`;
      return `Tập ${finalCurrent}/${finalCurrent}`;
    }

    if (total > 0) {
      return `Tập ${finalCurrent}/${total}`;
    }
    return `Tập ${finalCurrent}`;
  })();

  const seasonDropdownRef = useRef<HTMLDivElement>(null);
  const serverDropdownRef = useRef<HTMLDivElement>(null);
  const playerSectionRef = useRef<HTMLDivElement>(null);

  // Auto-scroll and toggle body class for cinemaMode
  useEffect(() => {
    if (cinemaMode) {
      document.body.classList.add('cinema-active');
      if (playerSectionRef.current) {
        playerSectionRef.current.scrollIntoView({ behavior: 'auto', block: 'start' });
      }
    } else {
      document.body.classList.remove('cinema-active');
    }
    return () => {
      document.body.classList.remove('cinema-active');
    };
  }, [cinemaMode]);

  // Listen to keyboard shortcut "?" to toggle shortcuts panel below video
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl instanceof HTMLElement && activeEl.isContentEditable))
      ) {
        return;
      }
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setShowShortcutsPanel(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (seasonDropdownRef.current && !seasonDropdownRef.current.contains(event.target as Node)) {
        setShowSeasonDropdown(false);
      }
      if (serverDropdownRef.current && !serverDropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (gifPickerRef.current && !gifPickerRef.current.contains(event.target as Node)) {
        setShowGifPicker(false);
      }
      if (replyGifPickerRef.current && !replyGifPickerRef.current.contains(event.target as Node)) {
        setReplyShowGifPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  function getSeasonDisplayName(title: string) {
    const match = title.match(/Phần\s+(\d+)/i);
    if (match) {
      return `Phần ${match[1]}`;
    }
    const seasonMatch = title.match(/Season\s+(\d+)/i);
    if (seasonMatch) {
      return `Phần ${seasonMatch[1]}`;
    }
    return title;
  }

  // Favorites and Folders State
  const [isFavorited, setIsFavorited] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [userFolders, setUserFolders] = useState<any[]>([]);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState('Lỗi video (không tải, giật lag, đen màn hình)');
  const [reportDesc, setReportDesc] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showBanner, setShowBanner] = useState(true);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const handleRedirectAd = () => {
    if (adsConfig.ads_redirect_enabled === 'true' && adsConfig.ads_redirect_url) {
      let url = adsConfig.ads_redirect_url;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      window.open(url, '_blank');
    }
  };

  const handleSendReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsSubmittingReport(true);
    try {
      const res = await fetch('/api/user/report-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movie_id: movie.id,
          episode_id: currentEpisode?.id,
          error_type: reportType,
          description: reportDesc
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message, 'success');
        setShowReportModal(false);
        setReportDesc('');
      } else {
        showToast(data.message || 'Gửi báo lỗi thất bại.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Lỗi kết nối.', 'error');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  useEffect(() => {
    const fetchFavoriteStatus = async () => {
      try {
        const res = await fetch(`/api/user/favorite?movie_id=${movie.id}`);
        if (res.ok) {
          const data = await res.json();
          setIsFavorited(data.favorited);
        }
      } catch (err) {
        console.error(err);
      }
    };

    if (currentUser) {
      fetchFavoriteStatus();
    }
  }, [movie.id, currentUser]);

  const handleToggleFavorite = async () => {
    if (!currentUser) {
      showToast('Bạn cần đăng nhập để thực hiện chức năng này.', 'error');
      return;
    }
    try {
      const res = await fetch('/api/user/favorite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movie_id: movie.id })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsFavorited(data.favorited);
        showToast(data.message, 'success');
      } else {
        showToast(data.message || 'Thực hiện thất bại.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Lỗi kết nối.', 'error');
    }
  };

  const handleOpenFolderModal = async () => {
    if (!currentUser) {
      showToast('Bạn cần đăng nhập để thực hiện chức năng này.', 'error');
      return;
    }
    setShowFolderModal(true);
    try {
      const res = await fetch(`/api/folder-action?movie_id=${movie.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setUserFolders(data.folders);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFolderCheckboxChange = async (folderId: number, isChecked: boolean) => {
    setUserFolders(prev => prev.map(f => f.id === folderId ? { ...f, has_movie: isChecked ? 1 : 0 } : f));

    const checkedFolderIds = userFolders
      .map(f => f.id === folderId ? (isChecked ? f.id : null) : (f.has_movie ? f.id : null))
      .filter((id): id is number => id !== null);

    try {
      const res = await fetch('/api/folder-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync_movie',
          movie_id: movie.id,
          folder_ids: checkedFolderIds
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.message || 'Đồng bộ thư mục thất bại.');
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi kết nối.');
    }
  };

  const handleCreateFolderFromModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    setIsCreatingFolder(true);
    try {
      const res = await fetch('/api/folder-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          name: newFolderName,
          is_public: true
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNewFolderName('');
        const resFolders = await fetch(`/api/folder-action?movie_id=${movie.id}`);
        if (resFolders.ok) {
          const dataFolders = await resFolders.json();
          if (dataFolders.success) {
            setUserFolders(dataFolders.folders);
          }
        }
      } else {
        alert(data.message || 'Tạo thư mục thất bại.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreatingFolder(false);
    }
  };

  // Comment state
  const [commentList, setCommentList] = useState<any[]>(comments || []);
  const [visibleCommentsCount, setVisibleCommentsCount] = useState(5);
  const [commentText, setCommentText] = useState('');
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  // Reply states
  const [activeReplyId, setActiveReplyId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyIsSpoiler, setReplyIsSpoiler] = useState(false);
  const [replyShowGifPicker, setReplyShowGifPicker] = useState(false);
  const [replySelectedGif, setReplySelectedGif] = useState<{ url: string; preview: string } | null>(null);
  const [replySearch, setReplySearch] = useState('');
  const [replyGifResults, setReplyGifResults] = useState<any[]>([]);
  const [replyGifLoading, setReplyGifLoading] = useState(false);
  const replyGifPickerRef = useRef<HTMLDivElement>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<number>>(new Set());
  const [revealedSpoilers, setRevealedSpoilers] = useState<Set<number>>(new Set());
  const [activeActionMenuId, setActiveActionMenuId] = useState<number | null>(null);

  const handleCommentAction = async (commentId: number, action: 'pin' | 'unpin' | 'delete' | 'ban', type: 'movie' | 'article' = 'movie') => {
    let banDays = 0;
    if (action === 'ban') {
      const daysStr = window.prompt("Nhập số ngày cấm bình luận (để trống hoặc 0 để cấm vĩnh viễn):", "7");
      if (daysStr === null) return; // Cancelled
      banDays = parseInt(daysStr) || 0;
    } else if (action === 'delete') {
      if (!confirm('Bạn có chắc chắn muốn xóa bình luận này?')) return;
    }

    try {
      const res = await fetch('/api/admin/comments/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId, action, banDays, type })
      });
      const data = await res.json();
      if (data.success) {
        if (action === 'delete') {
          setCommentList(prev => prev.filter(c => c.id !== commentId && c.parent_id !== commentId));
        } else if (action === 'pin' || action === 'unpin') {
          setCommentList(prev => prev.map(c => c.id === commentId ? { ...c, is_pinned: action === 'pin' } : c));
        } else if (action === 'ban') {
          alert('Đã cấm thành viên bình luận thành công!');
        }
      } else {
        alert(data.error || 'Có lỗi xảy ra');
      }
    } catch (e) {
      alert('Lỗi kết nối');
    }
    setActiveActionMenuId(null);
  };

  const searchReplyGifs = useCallback(async (query: string) => {
    setReplyGifLoading(true);
    try {
      const endpoint = query.trim()
        ? `https://api.giphy.com/v1/gifs/search?api_key=${giphyApiKey}&q=${encodeURIComponent(query)}&limit=18&rating=pg-13&lang=vi`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${giphyApiKey}&limit=18&rating=pg-13`;
      const res = await fetch(endpoint);
      const json = await res.json();
      setReplyGifResults(json.data || []);
    } catch {
      setReplyGifResults([]);
    } finally {
      setReplyGifLoading(false);
    }
  }, [giphyApiKey]);

  useEffect(() => {
    if (replyShowGifPicker) {
      searchReplyGifs(replySearch);
    }
  }, [replyShowGifPicker, replySearch, searchReplyGifs]);

  const handleLikeComment = async (commentId: number) => {
    if (!currentUser) {
      router.push('/pages/login');
      return;
    }
    try {
      const res = await fetch('/api/user/comment/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId })
      });
      const data = await res.json();
      if (data.success) {
        setCommentList(prev => prev.map((c: any) => {
          if (c.id === commentId) {
            return { ...c, isLiked: data.liked, likeCount: data.likeCount };
          }
          return c;
        }));
      }
    } catch (err) {
      console.error('Failed to like comment', err);
    }
  };

  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const handleSubmitReply = async (e: React.FormEvent, parentId: number) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!replyText.trim() && !replySelectedGif) return;

    setIsSubmittingReply(true);
    try {
      const res = await fetch('/api/user/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movieId: movie.id,
          content: replyText,
          isSpoiler: replyIsSpoiler,
          gifUrl: replySelectedGif?.url || null,
          parentId
        })
      });
      const data = await res.json();
      if (data.success) {
        setCommentList(prev => [
          ...prev,
          {
            ...data.comment,
            parent_id: parentId,
            likeCount: 0,
            isLiked: false
          }
        ]);
        setReplyText('');
        setReplySelectedGif(null);
        setActiveReplyId(null);
        setReplyShowGifPicker(false);
      }
    } catch (err) {
      console.error('Failed to submit reply', err);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  // GIF picker state
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearch, setGifSearch] = useState('');
  const [gifResults, setGifResults] = useState<any[]>([]);
  const [gifLoading, setGifLoading] = useState(false);
  const [selectedGif, setSelectedGif] = useState<{ url: string; preview: string } | null>(null);
  const gifPickerRef = useRef<HTMLDivElement>(null);
  const gifSearchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // GIF search
  const searchGifs = useCallback(async (query: string) => {
    setGifLoading(true);
    try {
      const endpoint = query.trim()
        ? `https://api.giphy.com/v1/gifs/search?api_key=${giphyApiKey}&q=${encodeURIComponent(query)}&limit=18&rating=pg-13&lang=vi`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${giphyApiKey}&limit=18&rating=pg-13`;
      const res = await fetch(endpoint);
      const json = await res.json();
      setGifResults(json.data || []);
    } catch {
      setGifResults([]);
    } finally {
      setGifLoading(false);
    }
  }, []);

  useEffect(() => {
    if (showGifPicker) {
      searchGifs(gifSearch);
    }
  }, [showGifPicker, searchGifs]);

  useEffect(() => {
    if (!showGifPicker) return;
    clearTimeout(gifSearchTimeout.current);
    gifSearchTimeout.current = setTimeout(() => searchGifs(gifSearch), 500);
    return () => clearTimeout(gifSearchTimeout.current);
  }, [gifSearch, showGifPicker, searchGifs]);

  // Close gif picker on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (gifPickerRef.current && !gifPickerRef.current.contains(e.target as Node)) {
        setShowGifPicker(false);
      }
    }
    if (showGifPicker) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showGifPicker]);

  async function handleSubmitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser) return;
    if (!commentText.trim() && !selectedGif) {
      setSubmitError('Vui lòng nhập nội dung hoặc chọn GIF!');
      return;
    }
    setIsSubmitting(true);
    setSubmitError('');
    setSubmitSuccess('');
    try {
      const res = await fetch('/api/user/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movieId: movie.id,
          content: commentText.trim(),
          isSpoiler,
          gifUrl: selectedGif?.url || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setSubmitError(json.error || 'Đã xảy ra lỗi!');
      } else {
        setCommentList(prev => [json.comment, ...prev]);
        setCommentText('');
        setSelectedGif(null);
        setSubmitSuccess('Bình luận đã được đăng!');
        setTimeout(() => setSubmitSuccess(''), 3000);
      }
    } catch {
      setSubmitError('Lỗi kết nối, vui lòng thử lại!');
    } finally {
      setIsSubmitting(false);
    }
  }

  function cleanServerIndicator(name: string): string {
    return name
      .replace(/\s*\(?(nguonc|ophim|kkphim|kk|op|nc|vsmov|vs|ssplay|sn|vicdn)\)?\s*$/gi, '')
      .replace(/\s*\(?(nguonc|ophim|kkphim|kk|op|nc|vsmov|vs|ssplay|sn|vicdn)\)?\s+/gi, ' ')
      .replace(/^(nguonc|ophim|kkphim|kk|op|nc|vsmov|vs|ssplay|sn|vicdn)\s*-\s*/gi, '')
      .trim();
  }

  // Group episodes by provider/server type
  const groupedServers: Record<string, {
    name: string;
    editions: Record<string, {
      name: string;
      episodes: any[]
    }>
  }> = {};

  episodes.forEach(ep => {
    let serverKey = '';
    let serverLabel = '';

    const lowerName = ep.server_name.toLowerCase();

    let isKnown = false;
    let customPrefix = '';

    if (ep.server_name.includes(' - ')) {
      const parts = ep.server_name.split(' - ');
      customPrefix = parts[0].trim();
    }

    if (lowerName.includes('ophim') && (!customPrefix || customPrefix.toLowerCase().includes('ophim'))) {
      serverKey = 'OP';
      serverLabel = 'Máy chủ 1';
      isKnown = true;
    } else if (lowerName.includes('nguonc') && (!customPrefix || customPrefix.toLowerCase().includes('nguonc'))) {
      serverKey = 'NC';
      serverLabel = 'Máy chủ 3';
      isKnown = true;
    } else if (lowerName.includes('vsmov') && (!customPrefix || customPrefix.toLowerCase().includes('vsmov'))) {
      serverKey = 'VS';
      serverLabel = 'Máy chủ 4';
      isKnown = true;
    } else if (
      (lowerName.includes('ssplay') ||
        lowerName.includes('song ngữ') ||
        lowerName.includes('songngữ') ||
        lowerName.includes('songngù') ||
        lowerName.includes('sn -') ||
        lowerName.startsWith('sn') ||
        lowerName.includes('vicdn')) &&
      (!customPrefix || ['ssplay', 'vicdn', 'sn'].some(k => customPrefix.toLowerCase().includes(k)))
    ) {
      serverKey = 'SN';
      serverLabel = 'Song Ngữ + Thuyết Minh AI';
      isKnown = true;
    } else if (
      lowerName.includes('vietsub') ||
      lowerName.includes('thuyết minh') ||
      lowerName.includes('lồng tiếng') ||
      lowerName.includes('kkphim') ||
      lowerName.includes('máy chủ 2')
    ) {
      if (customPrefix && !['vietsub', 'thuyết minh', 'lồng tiếng', 'kkphim'].some(k => customPrefix.toLowerCase().includes(k))) {
        isKnown = false;
      } else {
        serverKey = 'KK';
        serverLabel = 'Máy chủ 2';
        isKnown = true;
      }
    }

    if (!isKnown) {
      if (customPrefix) {
        serverKey = `CUSTOM_${customPrefix}`;
        serverLabel = customPrefix;
      } else {
        serverKey = `CUSTOM_${ep.server_name}`;
        serverLabel = ep.server_name;
      }
    }

    if (!groupedServers[serverKey]) {
      groupedServers[serverKey] = { name: serverLabel, editions: {} };
    }

    let editionKey = ep.server_name;
    let cleanEditionName = cleanServerIndicator(ep.server_name);

    if (!isKnown && customPrefix) {
      const parts = ep.server_name.split(' - ');
      const editionPart = parts.slice(1).join(' - ').trim();
      if (editionPart) {
        editionKey = editionPart;
        cleanEditionName = editionPart;
      }
    }

    if (!groupedServers[serverKey].editions[editionKey]) {
      groupedServers[serverKey].editions[editionKey] = { name: cleanEditionName, episodes: [] };
    }

    groupedServers[serverKey].editions[editionKey].episodes.push({
      data: ep
    });
  });

  const getEpNum = (name: string) => {
    const matches = name.match(/(\d+)/);
    return matches ? parseInt(matches[1], 10) : 999999;
  };

  // Sort episodes in each edition numerically
  Object.keys(groupedServers).forEach(serverKey => {
    Object.keys(groupedServers[serverKey].editions).forEach(editionKey => {
      groupedServers[serverKey].editions[editionKey].episodes.sort((a, b) => {
        return getEpNum(a.data.name) - getEpNum(b.data.name);
      });
    });
  });

  const serverKeys = Object.keys(groupedServers).sort((a, b) => {
    const nameA = groupedServers[a].name.toLowerCase();
    const nameB = groupedServers[b].name.toLowerCase();

    // 1. Per-movie priority
    if (movie.server_priority) {
      const priorities = movie.server_priority.split(',').map((s: string) => s.trim().toLowerCase());
      const idxA = priorities.findIndex((p: string) => nameA.includes(p) || a.toLowerCase().includes(p));
      const idxB = priorities.findIndex((p: string) => nameB.includes(p) || b.toLowerCase().includes(p));
      
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
    }

    // 2. Global priority
    if (globalServers.length > 0) {
      const getGlobalPriority = (name: string, key: string) => {
        const found = globalServers.find(s => 
          name.includes(s.name.toLowerCase()) || 
          key.toLowerCase().includes(s.name.toLowerCase()) ||
          (s.display_name && name.includes(s.display_name.toLowerCase()))
        );
        return found ? found.priority : -1;
      };
      
      const prioA = getGlobalPriority(nameA, a);
      const prioB = getGlobalPriority(nameB, b);
      
      if (prioA !== prioB) {
        return prioB - prioA; // higher priority first
      }
    }

    // 3. Fallback
    const order: Record<string, number> = { 'OP': 1, 'KK': 2, 'NC': 3, 'VS': 4 };
    return (order[a] || 99) - (order[b] || 99);
  });
  const initialServerKey = serverKeys[0] || '';

  // Handle selected server state
  const currentServerKey = selectedServer || initialServerKey;
  const currentServer = groupedServers[currentServerKey];

  const editionKeys = currentServer ? Object.keys(currentServer.editions) : [];
  const currentEditionKey = editionKeys.includes(selectedEdition) ? selectedEdition : (editionKeys[0] || '');
  const currentEdition = currentServer?.editions[currentEditionKey];

  const posterUrl = getProxyImageUrl(getPosterUrl(movie));
  const router = useRouter();

  const getServerKey = (serverName: string) => {
    const lower = serverName.toLowerCase();

    let customPrefix = '';
    if (serverName.includes(' - ')) {
      const parts = serverName.split(' - ');
      customPrefix = parts[0].trim();
    }

    if (lower.includes('ophim') && (!customPrefix || customPrefix.toLowerCase().includes('ophim'))) return 'OP';
    if (lower.includes('nguonc') && (!customPrefix || customPrefix.toLowerCase().includes('nguonc'))) return 'NC';
    if (lower.includes('vsmov') && (!customPrefix || customPrefix.toLowerCase().includes('vsmov'))) return 'VS';
    if (
      (lower.includes('ssplay') ||
        lower.includes('song ngữ') ||
        lower.includes('songngữ') ||
        lower.includes('songngù') ||
        lower.includes('sn -') ||
        lower.startsWith('sn') ||
        lower.includes('vicdn')) &&
      (!customPrefix || ['ssplay', 'vicdn', 'sn'].some(k => customPrefix.toLowerCase().includes(k)))
    ) {
      return 'SN';
    }
    if (
      lower.includes('vietsub') ||
      lower.includes('thuyết minh') ||
      lower.includes('lồng tiếng') ||
      lower.includes('kkphim') ||
      lower.includes('máy chủ 2')
    ) {
      if (customPrefix && !['vietsub', 'thuyết minh', 'lồng tiếng', 'kkphim'].some(k => customPrefix.toLowerCase().includes(k))) {
        return `CUSTOM_${customPrefix}`;
      }
      return 'KK';
    }

    if (customPrefix) return `CUSTOM_${customPrefix}`;
    return `CUSTOM_${serverName}`;
  };

  const getUrlTime = () => {
    if (typeof window === 'undefined') return 0;
    const t = new URLSearchParams(window.location.search).get('t');
    return t ? parseFloat(t) || 0 : 0;
  };

  const getTimeQueryParam = () => getUrlTime();

  const getCurrentTime = () => {
    return currentPlayerTime > 0 ? currentPlayerTime : getUrlTime();
  };

  const buildWatchUrl = (episodeId: number, time: number) => {
    const searchParams = new URLSearchParams();
    searchParams.set('ep', String(episodeId));
    if (time > 0) {
      searchParams.set('t', String(Math.floor(time)));
    }
    return `/xem/${movie.slug}?${searchParams.toString()}`;
  };

  const handleServerChange = (serverKey: string) => {
    const match = getEpisodeForServer(serverKey);
    if (!match) return;
    setSelectedServer(serverKey);
    setSelectedEdition(match.editionKey);

    const newTime = getCurrentTime();
    console.log('[WatchPageClient] handleServerChange newTime:', newTime, 'match:', match);
    setTargetProgress(newTime);

    const serverInfo = groupedServers[serverKey];
    if (serverInfo) {
      const editionInfo = serverInfo.editions[match.editionKey];
      if (editionInfo) {
        const newEp = editionInfo.episodes.find((ep: any) => ep.data.id === match.episodeId);
        if (newEp) {
          setActiveEpisode(newEp.data);
          window.history.pushState(null, '', buildWatchUrl(match.episodeId, newTime));
          return;
        }
      }
    }
    router.push(buildWatchUrl(match.episodeId, newTime));
  };

  const handleEditionButtonClick = (editionKey: string) => {
    const episodeId = getEpisodeForEdition(editionKey);
    if (episodeId === null) return;
    setSelectedEdition(editionKey);

    const newTime = getCurrentTime();
    console.log('[WatchPageClient] handleEditionButtonClick newTime:', newTime, 'episodeId:', episodeId);
    setTargetProgress(newTime);

    const newEp = currentServer?.editions[editionKey]?.episodes.find((ep: any) => ep.data.id === episodeId);
    if (newEp) {
      setActiveEpisode(newEp.data);
      window.history.pushState(null, '', buildWatchUrl(episodeId, newTime));
    }
  };



  const getEpisodeForServer = (serverKey: string) => {
    const server = groupedServers[serverKey];
    if (!server) return null;

    const currentEpisodeNumber = getEpNum(activeEpisode.name);
    const currentEpisodeOrder = activeEpisode.order_num;

    const matchingEp = Object.values(server.editions)
      .flatMap((edition: any) => edition.episodes)
      .find((ep: any) => {
        if (typeof currentEpisodeOrder === 'number' && currentEpisodeOrder > 0) {
          return ep.data.order_num === currentEpisodeOrder;
        }
        if (currentEpisodeNumber !== 999999) {
          return getEpNum(ep.data.name) === currentEpisodeNumber;
        }
        return ep.data.name === activeEpisode.name;
      });

    if (matchingEp) {
      const editionKey = Object.keys(server.editions).find(key =>
        server.editions[key].episodes.some((ep: any) => ep.data.id === matchingEp.data.id)
      );
      return { episodeId: matchingEp.data.id, editionKey: editionKey || '' };
    }

    const firstEditionKey = Object.keys(server.editions)[0];
    const fallback = server.editions[firstEditionKey]?.episodes[0];
    if (!fallback) return null;
    return { episodeId: fallback.data.id, editionKey: firstEditionKey };
  };

  const getEpisodeForEdition = (editionKey: string) => {
    if (!currentServer) return null;
    const edition = currentServer.editions[editionKey];
    if (!edition) return null;

    const currentEpisodeNumber = getEpNum(activeEpisode.name);
    const currentEpisodeOrder = activeEpisode.order_num;

    const matchingEp = edition.episodes.find((ep: any) => {
      if (typeof currentEpisodeOrder === 'number' && currentEpisodeOrder > 0) {
        return ep.data.order_num === currentEpisodeOrder;
      }
      if (currentEpisodeNumber !== 999999) {
        return getEpNum(ep.data.name) === currentEpisodeNumber;
      }
      return ep.data.name === activeEpisode.name;
    });
    if (matchingEp) return matchingEp.data.id;
    return edition.episodes[0]?.data.id || null;
  };

  useEffect(() => {
    if (!activeEpisode?.server_name) return;
    setSelectedServer(getServerKey(activeEpisode.server_name));
    setSelectedEdition(activeEpisode.server_name);
  }, [activeEpisode]);

  const handleNextEpisode = () => {
    if (!currentEdition) return;
    const episodesList = currentEdition.episodes;
    const currentIndex = episodesList.findIndex(ep => ep.data.id === activeEpisode.id);
    if (currentIndex >= 0 && currentIndex < episodesList.length - 1) {
      const nextEp = episodesList[currentIndex + 1];
      router.push(buildWatchUrl(nextEp.data.id, 0));
    }
  };

  // Build edition list for the player mic button
  // Only show when current server has ≥2 editions and current episode name exists in those editions
  const editionsForPlayer = (() => {
    if (!currentServer || editionKeys.length < 2) return [];
    return editionKeys
      .map(key => {
        const edition = currentServer.editions[key];
        return {
          editionKey: key,
          editionName: edition.name,
          episodeId: edition.episodes[0].data.id as number,
        };
      });
  })();

  const handleVideoEnded = () => {
    if (autoPlayNext) {
      handleNextEpisode();
    }
  };

  return (
    <div
      ref={playerSectionRef}
      className={`mx-auto transition-all duration-500 ${cinemaMode ? 'w-full max-w-full px-0 py-0' : 'max-w-[1400px] px-4 sm:px-4 sm:py-6'}`}>
      {/* Popup ad */}
      {adsConfig.ads_popup_enabled === 'true' && adsConfig.ads_popup_image && (
        <AdPopup
          image={adsConfig.ads_popup_image}
          link={adsConfig.ads_popup_link}
          delaySeconds={adsConfig.ads_popup_delay ? parseInt(adsConfig.ads_popup_delay, 10) : 3}
        />
      )}
      <div className={`flex flex-col transition-all duration-500 ${cinemaMode ? 'mb-0 rounded-none shadow-none border-none relative z-50 bg-black' : 'mb-6 -mx-4 sm:mx-0 sm:rounded-xl shadow-2xl border border-white/5'}`}>

        <div className={`relative bg-black w-full transition-all duration-500 ${cinemaMode ? 'h-screen' : 'aspect-video'}`}>
          <VideoPlayer
            key={`player-${movie.id}`}
            url={(() => {
              let videoUrl = activeEpisode.video_url || '';

              // Step 1: Extract the actual m3u8 URL if wrapped in phimapi player embed
              // e.g. "https://player.phimapi.com/player/?url=https://...m3u8"
              if (videoUrl.includes('player.phimapi.com/player/?url=')) {
                try {
                  const parsed = new URL(videoUrl);
                  const extracted = parsed.searchParams.get('url');
                  if (extracted) videoUrl = extracted;
                } catch { }
              }

              return videoUrl;
            })()}
            movieTitle={movie.title}
            episodeName={activeEpisode.name}
            episodes={currentEdition?.episodes || []}
            posterUrl={posterUrl}
            movieId={movie.id}
            movieSlug={movie.slug}
            cinemaMode={cinemaMode}
            episodeId={activeEpisode.id}
            subtitles={activeEpisode.episode_subtitles || []}
            autoSkipIntro={autoSkipIntro}
            initialProgress={targetProgress}
            onEnded={handleVideoEnded}
            onNext={handleNextEpisode}
            editions={editionsForPlayer}
            currentEditionKey={currentEditionKey}
            onTimeUpdate={(time) => setCurrentPlayerTime(time)}
            onEditionChange={(editionKey) => {
              handleEditionButtonClick(editionKey);
            }}
            adsVideoEnabled={adsConfig.ads_video_enabled === 'true'}
            adsVideoUrl={adsConfig.ads_video_url}
            adsVideoLink={adsConfig.ads_video_link}
            adsVideoSkipTime={adsConfig.ads_video_skip_time ? parseInt(adsConfig.ads_video_skip_time, 10) : 5}
            adsVideo2Enabled={adsConfig.ads_video2_enabled === 'true'}
            adsVideo2Url={adsConfig.ads_video2_url}
            adsVideo2Link={adsConfig.ads_video2_link}
            adsVideo2SkipTime={adsConfig.ads_video2_skip_time ? parseInt(adsConfig.ads_video2_skip_time, 10) : 5}
            onToggleShortcuts={() => setShowShortcutsPanel(prev => !prev)}
          />
        </div>

        {/* Watch-page inline banner ad */}
        {adsConfig.ads_banner_watch_enabled === 'true' && adsConfig.ads_banner_watch_image && (
          <AdBanner
            image={adsConfig.ads_banner_watch_image}
            link={adsConfig.ads_banner_watch_link}
            position="watch"
            className="sm:rounded-b-xl"
          />
        )}

        <div className="bg-[#000000] text-white py-3 md:py-4 border-t border-white/5">
          <div className={`flex items-center justify-between overflow-x-auto hide-scrollbar gap-10 md:gap-0 w-full px-4 ${cinemaMode ? 'max-w-[1400px] mx-auto sm:px-6' : 'md:px-6 xl:px-8'}`}>
            <div className="flex items-center gap-6 md:gap-8 shrink-0">
              <button onClick={handleToggleFavorite} className="group/fav flex items-center justify-center gap-2.5 transition-all outline-none active:scale-95" title="Yêu thích">
                <svg className={`transition-all duration-500 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] w-4 h-4 group-hover/fav:scale-110 ${isFavorited ? 'text-red-500 fill-red-500' : 'text-white/90 fill-none'}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path></svg>
                <span className="hidden sm:inline-block text-[13px] font-medium transition-colors text-white">Yêu thích</span>
              </button>
              <div className="relative">
                <button onClick={handleOpenFolderModal} className="group/add flex items-center justify-center gap-2.5 transition-all outline-none active:scale-95" title="Thêm vào thư mục">
                  <svg className="transition-all duration-300 w-4 h-4 group-hover/add:scale-110 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"></path></svg>
                  <span className="hidden sm:inline-block text-[13px] font-medium transition-colors text-white">Thêm vào</span>
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3 md:gap-4 shrink-0">
              <button
                onClick={() => setAutoPlayNext(!autoPlayNext)}
                className="flex items-center gap-2 hover:bg-white/10 transition-colors group outline-none py-1.5 px-2 md:px-3 rounded-lg cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`w-5 h-5 transition-colors ${autoPlayNext ? 'text-[#FFD166]' : 'text-white/70 group-hover:text-white'}`}><path d="M21 4v16"></path><path d="M6.029 4.285A2 2 0 0 0 3 6v12a2 2 0 0 0 3.029 1.715l9.997-5.998a2 2 0 0 0 .003-3.432z"></path></svg>
                <span className={`hidden md:inline-block text-[13px] font-medium transition-colors ${autoPlayNext ? 'text-[#FFD166]' : 'text-white/90 group-hover:text-white'}`}>Tự động chuyển tập</span>
                <span className={`hidden md:inline-block text-[10px] font-bold px-1.5 py-[3px] rounded transition-colors ${autoPlayNext ? 'text-[#FECF59] bg-[#FECF59]/10' : 'text-white/40'}`}>{autoPlayNext ? 'ON' : 'OFF'}</span>
              </button>
              <button
                onClick={() => setAutoSkipIntro(!autoSkipIntro)}
                className="flex items-center gap-2 hover:bg-white/10 transition-colors group outline-none py-1.5 px-2 md:px-3 rounded-lg cursor-pointer" title="Tự động bỏ qua intro"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`w-5 h-5 transition-colors ${autoSkipIntro ? 'text-[#FFD166]' : 'text-white/70 group-hover:text-white'}`}><path d="m7 18 6-6-6-6"></path><path d="M17 6v12"></path></svg>
                <span className={`hidden md:inline-block text-[13px] font-medium transition-colors ${autoSkipIntro ? 'text-[#FFD166]' : 'text-white/90 group-hover:text-white'}`}>Auto skip intro</span>
                <span className={`hidden md:inline-block text-[10px] font-bold px-1.5 py-[3px] rounded transition-colors ${autoSkipIntro ? 'text-[#FECF59] bg-[#FECF59]/10' : 'text-white/40'}`}>{autoSkipIntro ? 'ON' : 'OFF'}</span>
              </button>
              <button
                onClick={() => setCinemaMode(!cinemaMode)}
                className="flex items-center gap-2 hover:bg-white/10 transition-colors group outline-none py-1.5 px-2 md:px-3 rounded-lg cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`w-5 h-5 transition-colors ${cinemaMode ? 'text-[#FFD166]' : 'text-white/70 group-hover:text-white'}`}><path d="m12.296 3.464 3.02 3.956"></path><path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3z"></path><path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><path d="m6.18 5.276 3.1 3.899"></path></svg>
                <span className={`hidden md:inline-block text-[13px] font-medium transition-colors ${cinemaMode ? 'text-[#FFD166]' : 'text-white/90 group-hover:text-white'}`}>Rạp phim</span>
                <span className={`hidden md:inline-block text-[10px] font-bold px-1.5 py-[3px] rounded transition-colors ${cinemaMode ? 'text-[#FECF59] bg-[#FECF59]/10' : 'text-white/40'}`}>{cinemaMode ? 'ON' : 'OFF'}</span>
              </button>
              <button
                onClick={() => {
                  if (!currentUser) {
                    router.push('/pages/login');
                  } else {
                    setShowReportModal(true);
                  }
                }}
                className="flex items-center gap-2 hover:bg-white/10 transition-colors group outline-none py-1.5 px-2 md:px-3 rounded-lg cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-bug w-5 h-5 text-white/70 group-hover:text-[#eab308] transition-colors"><path d="M12 20v-9"></path><path d="M14 7a4 4 0 0 1 4 4v3a6 6 0 0 1-12 0v-3a4 4 0 0 1 4-4z"></path><path d="M14.12 3.88 16 2"></path><path d="M21 21a4 4 0 0 0-3.81-4"></path><path d="M21 5a4 4 0 0 1-3.55 3.97"></path><path d="M22 13h-4"></path><path d="M3 21a4 4 0 0 1 3.81-4"></path><path d="M3 5a4 4 0 0 0 3.55 3.97"></path><path d="M6 13H2"></path><path d="m8 2 1.88 1.88"></path><path d="M9 7.13V6a3 3 0 1 1 6 0v1.13"></path></svg>
                <span className="hidden md:inline-block text-[13px] font-medium text-white/70 group-hover:text-[#eab308] transition-colors">Báo lỗi</span>
              </button>
              <button
                onClick={() => setShowShortcutsPanel(!showShortcutsPanel)}
                className="flex items-center justify-center py-1.5 px-2 rounded-lg hover:bg-white/10 transition-colors group outline-none cursor-pointer"
                title="Hướng dẫn thao tác"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`lucide lucide-circle-question-mark w-5 h-5 transition-colors ${showShortcutsPanel ? 'text-[#FFD166]' : 'text-white/40 group-hover:text-white'}`}><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><path d="M12 17h.01"></path></svg>
              </button>
            </div>
          </div>
        </div>

        {/* Condition shortcuts helper panel */}
        {showShortcutsPanel && (
          <div className="bg-[#000000] border-t border-white/5 px-4 py-4 md:px-6 xl:px-8 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(280px,0.75fr)]">

              <section className="hidden rounded-lg border border-white/[0.06] bg-white/[0.03] p-4 md:block">
                <div className="flex items-center gap-2 text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-keyboard w-4 h-4 text-[#FFD166]" aria-hidden="true"><path d="M10 8h.01"></path><path d="M12 12h.01"></path><path d="M14 8h.01"></path><path d="M16 12h.01"></path><path d="M18 8h.01"></path><path d="M6 8h.01"></path><path d="M7 16h10"></path><path d="M8 12h.01"></path><rect width="20" height="16" x="2" y="4" rx="2"></rect></svg>
                  <h3 className="text-sm font-semibold">Desktop</h3>
                </div>
                <div className="mt-3 grid gap-2 text-[12px] text-white/65 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  <div className="flex items-center justify-between gap-3 rounded-md bg-white/[0.04] px-3 py-2">
                    <span>Phát / tạm dừng</span>
                    <kbd className="rounded border border-white/10 bg-white/[0.06] px-1.5 py-0.5 font-mono text-[11px] text-white/80">Space</kbd>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-md bg-white/[0.04] px-3 py-2">
                    <span>Toàn màn hình</span>
                    <kbd className="rounded border border-white/10 bg-white/[0.06] px-1.5 py-0.5 font-mono text-[11px] text-white/80">F</kbd>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-md bg-white/[0.04] px-3 py-2">
                    <span>Tua lùi / tới 10 giây</span>
                    <kbd className="rounded border border-white/10 bg-white/[0.06] px-1.5 py-0.5 font-mono text-[11px] text-white/80">← / →</kbd>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-md bg-white/[0.04] px-3 py-2">
                    <span>Tăng / giảm âm lượng</span>
                    <kbd className="rounded border border-white/10 bg-white/[0.06] px-1.5 py-0.5 font-mono text-[11px] text-white/80">↑ / ↓</kbd>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-md bg-white/[0.04] px-3 py-2 sm:col-span-2 lg:col-span-1 xl:col-span-2">
                    <span>Chuyển tập kế tiếp</span>
                    <kbd className="rounded border border-white/10 bg-white/[0.06] px-1.5 py-0.5 font-mono text-[11px] text-white/80">N</kbd>
                  </div>
                </div>
              </section>

              <section className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-4">
                <div className="flex items-center gap-2 text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-smartphone w-4 h-4 text-[#FFD166]" aria-hidden="true"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"></rect><path d="M12 18h.01"></path></svg>
                  <h3 className="text-sm font-semibold">Mobile</h3>
                </div>
                <div className="mt-3 grid gap-2 text-[12px] text-white/65">
                  <div className="flex items-start gap-3 rounded-md bg-white/[0.04] px-3 py-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-mouse-pointer-click mt-0.5 h-4 w-4 shrink-0 text-white/40" aria-hidden="true"><path d="M14 4.1 12 6"></path><path d="m5.1 8-2.9-.8"></path><path d="m6 12-1.9 2"></path><path d="M7.2 2.2 8 5.1"></path><path d="M9.037 9.69a.498.498 0 0 1 .653-.653l11 4.5a.5.5 0 0 1-.074.949l-4.349 1.041a1 1 0 0 0-.74.739l-1.04 4.35a.5.5 0 0 1-.95.074z"></path></svg>
                    <span>Chạm một lần để hiện / ẩn thanh điều khiển</span>
                  </div>
                  <div className="flex items-start gap-3 rounded-md bg-white/[0.04] px-3 py-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-mouse-pointer-click mt-0.5 h-4 w-4 shrink-0 text-white/40" aria-hidden="true"><path d="M14 4.1 12 6"></path><path d="m5.1 8-2.9-.8"></path><path d="m6 12-1.9 2"></path><path d="M7.2 2.2 8 5.1"></path><path d="M9.037 9.69a.498.498 0 0 1 .653-.653l11 4.5a.5.5 0 0 1-.074.949l-4.349 1.041a1 1 0 0 0-.74.739l-1.04 4.35a.5.5 0 0 1-.95.074z"></path></svg>
                    <span>Chạm đúp bên trái / phải để tua 10 giây</span>
                  </div>
                  <div className="flex items-start gap-3 rounded-md bg-white/[0.04] px-3 py-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-mouse-pointer-click mt-0.5 h-4 w-4 shrink-0 text-white/40" aria-hidden="true"><path d="M14 4.1 12 6"></path><path d="m5.1 8-2.9-.8"></path><path d="m6 12-1.9 2"></path><path d="M7.2 2.2 8 5.1"></path><path d="M9.037 9.69a.498.498 0 0 1 .653-.653l11 4.5a.5.5 0 0 1-.074.949l-4.349 1.041a1 1 0 0 0-.74.739l-1.04 4.35a.5.5 0 0 1-.95.074z"></path></svg>
                    <span>Nhấn giữ trên video để tua nhanh 2x, thả tay để trở lại tốc độ cũ</span>
                  </div>
                </div>
              </section>

              <section className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-4">
                <div className="flex items-center gap-2 text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-circle-question-mark w-4 h-4 text-[#FFD166]" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><path d="M12 17h.01"></path></svg>
                  <h3 className="text-sm font-semibold">Nút dưới video</h3>
                </div>
                <div className="mt-3 grid gap-2 text-[12px] text-white/65">
                  <div className="flex items-center gap-2.5 rounded-md bg-white/[0.04] px-3 py-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`lucide lucide-skip-forward w-4 h-4 shrink-0 ${autoPlayNext ? 'text-[#FFD166]' : 'text-white/40'}`} aria-hidden="true"><path d="M21 4v16"></path><path d="M6.029 4.285A2 2 0 0 0 3 6v12a2 2 0 0 0 3.029 1.715l9.997-5.998a2 2 0 0 0 .003-3.432z"></path></svg>
                    <span>Tự động chuyển tập</span>
                  </div>
                  <div className="flex items-center gap-2.5 rounded-md bg-white/[0.04] px-3 py-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`lucide lucide-chevron-last w-4 h-4 shrink-0 ${autoSkipIntro ? 'text-[#FFD166]' : 'text-white/40'}`} aria-hidden="true"><path d="m7 18 6-6-6-6"></path><path d="M17 6v12"></path></svg>
                    <span>Tự động bỏ qua intro</span>
                  </div>
                  <div className="flex items-center gap-2.5 rounded-md bg-white/[0.04] px-3 py-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`lucide lucide-clapperboard w-4 h-4 shrink-0 ${cinemaMode ? 'text-[#FFD166]' : 'text-white/40'}`} aria-hidden="true"><path d="m12.296 3.464 3.02 3.956"></path><path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3z"></path><path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><path d="m6.18 5.276 3.1 3.899"></path></svg>
                    <span>Chế độ rạp phim</span>
                  </div>
                  <div className="flex items-center gap-2.5 rounded-md bg-white/[0.04] px-3 py-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-bug w-4 h-4 shrink-0 text-white/40" aria-hidden="true"><path d="M12 20v-9"></path><path d="M14 7a4 4 0 0 1 4 4v3a6 6 0 0 1-12 0v-3a4 4 0 0 1 4-4z"></path><path d="M14.12 3.88 16 2"></path><path d="M21 21a4 4 0 0 0-3.81-4"></path><path d="M21 5a4 4 0 0 1-3.55 3.97"></path><path d="M22 13h-4"></path><path d="M3 21a4 4 0 0 1 3.81-4"></path><path d="M3 5a4 4 0 0 0 3.55 3.97"></path><path d="M6 13H2"></path><path d="m8 2 1.88 1.88"></path><path d="M9 7.13V6a3 3 0 1 1 6 0v1.13"></path></svg>
                    <span>Báo lỗi phim</span>
                  </div>
                </div>
                <p className="text-[11px] text-white/30 mt-3">Vàng = đang bật</p>
              </section>

            </div>
          </div>
        )}
      </div>

      <div className={`transition-all duration-500 ${cinemaMode ? 'max-w-[1400px] mx-auto px-4 sm:px-6 pb-16' : ''}`}>
        <div className="flex flex-col xl:flex-row gap-8 mt-4 xl:mt-8">
          <div className="flex-1 min-w-0">
            <div className="flex sm:hidden items-center mb-4">
              <Link className="flex items-center gap-3 text-white hover:text-accent transition-colors" href={`/phim/${movie.slug}`}>
                <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-left w-4 h-4"><path d="m15 18-6-6 6-6"></path></svg>
                </div>
                <h1 className="text-[13px] font-bold leading-tight line-clamp-1">Xem phim: {movie.title}</h1>
              </Link>
            </div>

            <div className="mb-2.5 flex items-start gap-2.5 rounded-lg border border-[#eab308]/20 bg-[#eab308]/10 px-3 py-2 sm:items-center sm:py-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-info w-4 h-4 text-[#eab308] shrink-0 mt-0.5 sm:mt-0"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
              <p className="text-[12px] md:text-[13px] text-white/80 leading-relaxed font-medium">Phim bị lỗi âm thanh, giật lag, chất lượng kém ? Vui lòng chuyển sang <span className="text-[#eab308]">Máy chủ Dự phòng</span> bên dưới.</p>
            </div>

            <div className="mb-4">
              <a href={facebookGroupUrl || "https://facebook.com"} target="_blank" rel="noopener noreferrer" className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#1877F2]/20 bg-[#1877F2]/10 px-3 py-2.5 text-[12px] font-medium text-[#8bc3ff] transition-colors hover:border-[#1877F2]/35 hover:bg-[#1877F2]/15 hover:text-white sm:w-auto">
                <svg className="h-4 w-4 shrink-0 fill-current text-[#1877F2]" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z" />
                </svg>
                Tham gia group Facebook để tâm sự với Ad nhoa
              </a>
            </div>

            <div className="hidden sm:flex flex-col sm:flex-row items-center sm:items-start gap-6 lg:gap-8">
              <div className="shrink-0 relative w-32 md:w-40 lg:w-[150px] aspect-[2/3] rounded-xl overflow-hidden shadow-2xl">
                <img alt={movie.title} className="object-cover w-full h-full" src={posterUrl} />
              </div>

              <div className="flex-1 flex flex-col gap-4 pt-1 w-full text-center sm:text-left">
                <div>
                  <h1 className="text-2xl md:text-[28px] font-bold text-white mb-2 leading-tight">{movie.title}</h1>
                  <h2 className="text-[#eab308] text-sm md:text-[15px] font-medium opacity-90">{movie.original_title}</h2>
                </div>

                <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2">
                  {movie.sub_docquyen && (
                    <span className="bg-[#F5C518] text-[#0f1115] flex items-center gap-1.5 px-2.5 py-1 rounded font-bold uppercase tracking-wider text-[10px] sm:text-[11px]">
                      <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd"></path>
                      </svg>
                      <span>Vietsub độc quyền</span>
                    </span>
                  )}
                  {movie.imdb_rating && (
                    <div className="flex items-center text-[11px] font-bold rounded overflow-hidden border border-solid border-[rgba(245,197,24,0.5)]">
                      <span className="bg-[#F5C518] text-black px-1.5 py-0.5">IMDb</span>
                      <span className="bg-[rgba(245,197,24,0.1)] text-white px-1.5 py-0.5">{Number(movie.imdb_rating).toFixed(1)}</span>
                    </div>
                  )}
                  {movie.imdb_rating && (
                    <div className="flex items-center text-[11px] font-bold rounded overflow-hidden border border-solid border-[rgba(1,180,228,0.5)]">
                      <span className="bg-[#01B4E4] text-white px-1.5 py-0.5">TMDb</span>
                      <span className="bg-[rgba(1,180,228,0.1)] text-white px-1.5 py-0.5">{(Number(movie.imdb_rating) + 0.1).toFixed(1)}</span>
                    </div>
                  )}
                  <span className="inline-flex items-center justify-center rounded-[4px] text-[#141414] font-black leading-none tracking-normal h-[22px] px-2 text-[11px]" style={{ backgroundColor: '#ffd875', backgroundImage: 'linear-gradient(220deg, #ffd875 0%, #ffe7a8 45%, #ffffff 100%)' }}>
                    {movie.quality || 'FHD'}
                  </span>
                  <span className="text-[11px] font-medium px-2 py-0.5 border border-white/20 rounded text-white/90">{movie.year}</span>
                  {movie.season_name && (
                    <span className="text-[11px] font-medium px-2 py-0.5 border border-white/20 rounded text-white/90">{movie.season_name}</span>
                  )}
                  {movie.status && (
                    <span className="text-[11px] font-medium px-2 py-0.5 border border-white rounded text-white bg-black/40">
                      {displayEpisodeCurrent}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2">
                  {movie.categories && movie.categories.map((c: any) => (
                    <span key={c.id} className="text-[11px] font-medium px-2.5 py-1 bg-white/5 rounded text-white/70">
                      {c.name}
                    </span>
                  ))}
                </div>

                {(() => {
                  const statusStr = formatMovieStatus(movie, maxEpisodes);
                  const isCompleted = statusStr.toLowerCase().startsWith('hoàn tất');
                  if (isCompleted) {
                    return (
                      <div className="inline-flex self-center sm:self-start items-center gap-1.5 px-3 py-1.5 rounded-full mt-2 border bg-[#00b14f]/10 border-[#00b14f]/20 text-[#00b14f]">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-circle-check w-3.5 h-3.5"><circle cx="12" cy="12" r="10"></circle><path d="m9 12 2 2 4-4"></path></svg>
                        <span className="text-xs font-medium">
                          {statusStr}
                        </span>
                      </div>
                    );
                  } else {
                    return (
                      <div className="inline-flex self-center sm:self-start items-center gap-1.5 px-3 py-1.5 rounded-full mt-2 border bg-[#eab308]/10 border-[#eab308]/20 text-[#eab308]">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-loader-circle w-3.5 h-3.5 animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>
                        <span className="text-xs font-medium">
                          {statusStr}
                        </span>
                      </div>
                    );
                  }
                })()}

                <div className="mt-2 text-left">
                  <p className={`text-[13px] md:text-sm text-white/70 leading-relaxed transition-all ${isDescExpanded ? '' : 'line-clamp-3'}`}>
                    {movie.description || 'Chưa có thông tin nội dung.'}
                  </p>
                  <div className="flex items-center gap-4 mt-2">
                    {movie.description && movie.description.length > 150 && (
                      <button
                        onClick={() => setIsDescExpanded(!isDescExpanded)}
                        className="text-white/40 hover:text-white/70 text-[12px] font-medium transition-colors bg-transparent border-none cursor-pointer outline-none"
                      >
                        {isDescExpanded ? 'Thu gọn' : 'Xem thêm'}
                      </button>
                    )}
                    <Link className="inline-flex items-center gap-1 text-[13px] text-[#eab308] hover:text-[#eab308]/80 transition-colors font-medium" href={`/phim/${movie.slug}`}>
                      Thông tin phim <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right w-4 h-4 ml-0.5"><path d="m9 18 6-6-6-6"></path></svg>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Episodes Section */}
            <div id="episodes-section" className="mt-8 mb-12 scroll-mt-24">
              {movie.type === 'phimle' || (episodes.length > 0 && !episodes.some(ep => {
                const name = ep.name || '';
                const num = parseInt(name.replace(/\D/g, ''), 10);
                return !isNaN(num) && num > 1;
              })) ? (
                <div className="animate-in fade-in duration-300">
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <h3 className="text-xl md:text-2xl font-bold text-white leading-tight">Các bản chiếu</h3>
                    
                    {/* SERVER DROPDOWN */}
                    {serverKeys.length > 0 && (
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="text-[13px] text-white/60 font-medium hidden sm:inline-block shrink-0">Chọn Server:</span>
                        <div className="relative min-w-0 sm:w-auto">
                          <button
                            type="button"
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="flex items-center justify-between w-full sm:w-auto sm:min-w-[180px] bg-[#12121a] hover:bg-[#12121a]/80 border border-white/10 text-white text-[13px] md:text-sm font-medium rounded-lg px-3.5 sm:px-4 py-2 focus:outline-none focus:border-[#eab308]/50 transition-colors cursor-pointer"
                          >
                            <span className="truncate mr-2 pointer-events-none">{currentServer?.name || 'Chọn máy chủ'}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`lucide lucide-chevron-down w-4 h-4 text-white/50 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} aria-hidden="true"><path d="m6 9 6 6 6-6"></path></svg>
                          </button>

                          {isDropdownOpen && (
                            <div className="absolute top-full right-0 mt-2 w-full min-w-[200px] bg-[#12121a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                              <div className="py-1">
                                {serverKeys.map(key => {
                                  const isSelected = currentServerKey === key;
                                  const serverInfo = groupedServers[key];
                                  return (
                                    <button
                                      key={key}
                                      onClick={() => {
                                        handleRedirectAd();
                                        handleServerChange(key);
                                        setIsDropdownOpen(false);
                                      }}
                                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between group ${isSelected ? 'bg-[#eab308]/10 text-[#eab308] font-semibold' : 'bg-transparent text-white/80 hover:bg-white/5 hover:text-white'}`}
                                    >
                                      <span className="truncate">{serverInfo.name}</span>
                                      {isSelected && <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-circle-check w-4 h-4 text-[#eab308] shrink-0" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="m9 12 2 2 4-4"></path></svg>}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {episodes
                      .filter(ep => getServerKey(ep.server_name) === currentServerKey)
                      .map(ep => {
                        const isPlaying = ep.id === activeEpisode.id;
                        const isVietsub = ep.server_name.toLowerCase().includes('vietsub');
                        const posterUrl = getProxyImageUrl(getPosterUrl(movie));

                        return (
                          <a
                            key={ep.id}
                            className="relative rounded-2xl overflow-hidden min-h-[140px] md:min-h-[160px] shadow-lg group text-left transition-all block cursor-pointer"
                            href={buildWatchUrl(ep.id, (ep.name === activeEpisode.name || (ep.name.replace(/\D/g, '') !== '' && ep.name.replace(/\D/g, '') === activeEpisode.name.replace(/\D/g, ''))) ? getCurrentTime() : 0)}
                            onClick={(e) => {
                              e.preventDefault();
                              handleRedirectAd();
                              const isSameEp = ep.name === activeEpisode.name || (ep.name.replace(/\D/g, '') !== '' && ep.name.replace(/\D/g, '') === activeEpisode.name.replace(/\D/g, ''));
                              const time = isSameEp ? getCurrentTime() : 0;
                              setTargetProgress(time);
                              setActiveEpisode(ep);
                              window.history.pushState(null, '', buildWatchUrl(ep.id, time));
                            }}
                          >
                            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
                              <div className="absolute inset-0 bg-[#1f2233]"></div>
                              {posterUrl && (
                                <div className="absolute right-0 top-0 bottom-0 w-[110px] sm:w-[130px] md:w-[35%] overflow-hidden">
                                  <img
                                    alt={movie.title}
                                    className="object-cover object-[center_50%] opacity-90 w-full h-full"
                                    src={posterUrl}
                                  />
                                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgb(31, 34, 51) 0%, rgba(31, 34, 51, 0) 50%)' }}></div>
                                </div>
                              )}
                              {isPlaying && (
                                <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(29, 46, 121, 0.9) 0%, rgba(29, 46, 121, 0.6) 50%, rgba(29, 46, 121, 0) 100%)' }}></div>
                              )}
                            </div>
                            <div className="relative h-full flex flex-col justify-between p-4 md:p-5 z-10 w-[75%] md:w-[70%] text-left">
                              <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-1.5">
                                  {isVietsub ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-captions w-4.5 h-4.5 text-white/70 drop-shadow-sm"><rect width="18" height="14" x="3" y="5" rx="2" ry="2"></rect><path d="M7 15h4M15 15h2M7 11h2M13 11h4"></path></svg>
                                  ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-mic w-4.5 h-4.5 text-white/70 drop-shadow-sm"><path d="M12 19v3"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><rect x="9" y="2" width="6" height="13" rx="3"></rect></svg>
                                  )}
                                  <span className="text-[11px] md:text-[12px] font-medium text-white/70 drop-shadow-sm">{cleanServerIndicator(ep.server_name)}</span>
                                </div>
                                <div className="text-[15px] md:text-[16px] font-normal text-white/95 drop-shadow-sm pl-1 tracking-wide line-clamp-2 leading-relaxed">
                                  {movie.title} {ep.name ? `(${ep.name})` : ''}
                                </div>
                              </div>
                              <div className="mt-4">
                                <span className={`inline-flex items-center gap-2 text-[12px] md:text-[13px] font-medium py-2 md:py-2.5 px-4 md:px-5 rounded-md shadow-md transition-all ${isPlaying ? 'bg-[#eab308] text-black font-semibold' : 'bg-white text-black hover:bg-gray-100 hover:scale-[1.02] active:scale-[0.98]'}`}>
                                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-play w-3.5 h-3.5 fill-current" aria-hidden="true"><path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"></path></svg>
                                  {isPlaying ? 'Đang xem bản này' : 'Xem bản này'}
                                </span>
                              </div>
                            </div>
                          </a>
                        );
                      })}
                  </div>
                </div>
              ) : (
                <>
                  {movie.showtimes && !(movie.status?.toLowerCase().includes('completed') || movie.status?.toLowerCase().includes('hoàn tất')) && !isShowtimesExpired && (
                    <div className="relative mb-6" style={{ padding: '0.8rem 1rem 0.8rem 55px', backgroundColor: 'rgb(65, 88, 208)', backgroundImage: 'linear-gradient(90deg, rgb(65, 88, 208), rgb(200, 80, 192))', borderRadius: '0.5rem', color: 'rgb(255, 255, 255)' }}>
                      <div className="absolute flex items-center justify-center rounded-full bg-black/20" style={{ left: '10px', top: '10px', width: '36px', height: '36px', overflow: 'visible' }}>
                        <img alt="Alarm" loading="lazy" width={56} height={56} decoding="async" className="object-contain" src="/gif/alarm.gif" style={{ color: 'transparent', width: '44px', height: '44px', position: 'relative', zIndex: 1 }} />
                      </div>
                      <div className="flex items-center justify-between gap-4 min-h-[36px]">
                        <p className="text-[14px] md:text-[15px] leading-snug" dangerouslySetInnerHTML={{ __html: showtimesData?.type === 'tmdb_showtimes' ? showtimesData.next : movie.showtimes }}></p>

                        {showtimesData?.type === 'tmdb_showtimes' && showtimesData.upcoming?.length > 0 && (
                          <button
                            onClick={() => setShowtimesExpanded(!showtimesExpanded)}
                            className="shrink-0 px-2 py-1 hover:bg-black/10 rounded-full transition-colors flex items-center gap-1 text-[12px] font-medium border border-transparent hover:border-white/20"
                          >
                            <span className="hidden sm:inline">{showtimesExpanded ? 'Thu gọn' : 'Lịch chiếu khác'}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`lucide lucide-chevron-up w-4 h-4 transition-transform duration-300 ${showtimesExpanded ? '' : 'rotate-180'}`} aria-hidden="true"><path d="m18 15-6-6-6 6"></path></svg>
                          </button>
                        )}
                      </div>

                      {showtimesExpanded && showtimesData?.type === 'tmdb_showtimes' && showtimesData.upcoming?.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-white/20 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {showtimesData.upcoming.map((ep: any, idx: number) => (
                            <div key={idx} className="bg-black/10 rounded overflow-hidden flex items-center text-[13px]">
                              <div className="font-bold bg-black/20 px-2.5 py-1.5 shrink-0">{ep.episode}</div>
                              <div className="px-2.5 py-1.5 opacity-90 font-medium">{ep.date}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    {seasons.length > 1 ? (
                      <div className="relative flex min-w-0 items-center gap-1.5 sm:gap-2" ref={seasonDropdownRef}>
                        <div className="flex shrink-0 items-center gap-1 text-[12px] font-semibold text-white/50 sm:mr-1 sm:gap-1.5 sm:text-[13px]">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-layers w-4 h-4" aria-hidden="true">
                            <path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"></path>
                            <path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"></path>
                            <path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"></path>
                          </svg>
                          {seasons.some(s => /Phần\s+\d+/i.test(s.title) || /Season\s+\d+/i.test(s.title)) ? 'Phần:' : 'Cùng bộ:'}
                        </div>
                        <button
                          onClick={() => setShowSeasonDropdown(!showSeasonDropdown)}
                          type="button"
                          className="flex min-w-0 flex-1 sm:flex-none sm:w-auto items-center justify-center sm:justify-start gap-1.5 text-[13px] transition-colors rounded-md px-3 py-2 sm:px-3.5 border border-white/30 text-white bg-white/5 font-medium hover:bg-white/10 disabled:cursor-wait disabled:text-white/60"
                          aria-expanded={showSeasonDropdown}
                          aria-haspopup="menu"
                          title={movie.title}
                        >
                          <span className="truncate">{getSeasonDisplayName(movie.title)}</span>
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`lucide lucide-chevron-down w-4 h-4 transition-transform ${showSeasonDropdown ? 'rotate-180' : ''}`} aria-hidden="true">
                            <path d="m6 9 6 6 6-6"></path>
                          </svg>
                        </button>
                        {showSeasonDropdown && (
                          <div className="absolute left-0 top-full mt-2 w-[240px] bg-[#12121a] border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden py-1">
                            {seasons.map(s => {
                              const isCurrent = s.id === movie.id;
                              return (
                                <Link
                                  key={s.id}
                                  href={`/xem/${s.slug}`}
                                  onClick={() => setShowSeasonDropdown(false)}
                                  className={`flex items-center justify-between w-full px-4 py-2.5 transition-colors hover:bg-white/5 ${isCurrent ? 'bg-white/5' : ''}`}
                                >
                                  <div className="flex flex-col min-w-0 text-left">
                                    <span className={`text-[13px] font-bold ${isCurrent ? 'text-[#eab308]' : 'text-white'}`}>{getSeasonDisplayName(s.title)}</span>
                                    <span className="text-[11px] text-white/50 truncate mt-0.5">{s.title}</span>
                                  </div>
                                  {isCurrent && (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check w-4 h-4 text-[#eab308] shrink-0 ml-2"><path d="M20 6 9 17l-5-5"></path></svg>
                                  )}
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : (
                      <h3 className="text-[17px] md:text-lg font-bold text-white flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-list w-5 h-5 text-[#ffffff]"><path d="M3 5h.01"></path><path d="M3 12h.01"></path><path d="M3 19h.01"></path><path d="M8 5h13"></path><path d="M8 12h13"></path><path d="M8 19h13"></path></svg>
                        Danh sách tập
                      </h3>
                    )}

                    {/* RESTORE SERVER DROPDOWN */}
                    {serverKeys.length > 0 && (
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="text-[13px] text-white/60 font-medium hidden sm:inline-block shrink-0">Chọn Server:</span>
                        <div className="relative min-w-0 sm:w-auto">
                          <button
                            type="button"
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="flex items-center justify-between w-full sm:w-auto sm:min-w-[180px] bg-[#12121a] hover:bg-[#12121a] border border-white/10 text-white text-[13px] md:text-sm font-medium rounded-lg px-3.5 sm:px-4 py-2 focus:outline-none focus:border-[#eab308]/50 transition-colors cursor-pointer"
                          >
                            <span className="truncate mr-2 pointer-events-none">{currentServer?.name || 'Chọn máy chủ'}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`lucide lucide-chevron-down w-4 h-4 text-white/50 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} aria-hidden="true"><path d="m6 9 6 6 6-6"></path></svg>
                          </button>

                          {isDropdownOpen && (
                            <div className="absolute top-full right-0 mt-2 w-full min-w-[200px] bg-[#12121a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                              <div className="py-1">
                                {serverKeys.map(key => {
                                  const isSelected = currentServerKey === key;
                                  const serverInfo = groupedServers[key];
                                  return (
                                    <button
                                      key={key}
                                      onClick={() => {
                                        handleRedirectAd();
                                        handleServerChange(key);
                                        setIsDropdownOpen(false);
                                      }}
                                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between group ${isSelected ? 'bg-[#eab308]/10 text-[#eab308] font-semibold' : 'bg-transparent text-white/80 hover:bg-white/5 hover:text-white'}`}
                                    >
                                      <span className="truncate">{serverInfo.name}</span>
                                      {isSelected && <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-circle-check w-4 h-4 text-[#eab308] shrink-0" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="m9 12 2 2 4-4"></path></svg>}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {editionKeys.length > 1 && (
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      <span className="text-[13px] text-white/60 font-medium hidden sm:inline-block">Bản chiếu:</span>
                      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                        {editionKeys.map(key => {
                          const isSelected = currentEditionKey === key;
                          const editionName = currentServer?.editions[key]?.name || key;
                          return (
                            <button
                              key={key}
                              onClick={() => handleEditionButtonClick(key)}
                              className={`shrink-0 px-3.5 py-1.5 text-[13px] font-semibold rounded-md transition-all ${isSelected
                                ? 'bg-[#FFD166] text-[#1c1c1c] shadow-[0_2px_10px_rgba(255,209,102,0.2)]'
                                : 'bg-[#191b24] border border-white/10 text-white/80 hover:bg-white/10 hover:text-white'
                                }`}
                            >
                              {editionName}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-x-2.5 gap-y-2.5">
                    {currentEdition?.episodes.map(ep => {
                      const epData = ep.data;
                      const isPlaying = epData.id === activeEpisode.id;

                      return (
                        <a
                          key={epData.id}
                          href={buildWatchUrl(epData.id, (epData.name === activeEpisode.name || (epData.name.replace(/\D/g, '') !== '' && epData.name.replace(/\D/g, '') === activeEpisode.name.replace(/\D/g, ''))) ? getCurrentTime() : 0)}
                          onClick={(e) => {
                            e.preventDefault();
                            handleRedirectAd();
                            const isSameEp = epData.name === activeEpisode.name || (epData.name.replace(/\D/g, '') !== '' && epData.name.replace(/\D/g, '') === activeEpisode.name.replace(/\D/g, ''));
                            const time = isSameEp ? getCurrentTime() : 0;
                            setTargetProgress(time);
                            setActiveEpisode(epData);
                            window.history.pushState(null, '', buildWatchUrl(epData.id, time));
                          }}
                          className={`group flex items-center justify-center gap-1.5 rounded-lg transition-all py-2.5 px-2 text-[13px] ${isPlaying ? 'bg-[#FFD166] text-[#1c1c1c] font-semibold shadow-[0_4px_20px_rgba(255,209,102,0.2)]' : 'bg-[#191b24] text-white/90 hover:text-[#FFD166] shadow-sm'}`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`lucide lucide-play shrink-0 w-3 h-3 ${isPlaying ? 'fill-[#1c1c1c]' : 'fill-white/80 group-hover:fill-[#FFD166]'}`}><path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"></path></svg>
                          {epData.name.toLowerCase().includes('tập') ? epData.name : `Tập ${epData.name}`}
                        </a>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* ──────────────── Comments Section ──────────────── */}
            <div className="mb-12" id="comment-section">
              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-2.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-circle w-6 h-6 text-white fill-white"><path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"></path></svg>
                  <h2 className="text-xl font-bold text-white">Bình luận <span className="text-white/60">({commentList.length})</span></h2>
                </div>
              </div>

              {/* Comment Form */}
              {currentUser ? (
                <form onSubmit={handleSubmitComment} className="mb-8 p-3 sm:p-4 bg-[#191b24] border border-white/5 rounded-xl">
                  {/* User row */}
                  <div className="flex items-center gap-2.5 px-1 mb-3">
                    <div className="relative shrink-0">
                      <div className={currentUser.role === 'admin' ? "avatar-ring-premium" : "w-7 h-7 rounded-full overflow-hidden bg-[#FFD166] flex items-center justify-center text-[#1c1c1c] font-bold text-xs shrink-0"}>
                        <div className={currentUser.role === 'admin' ? "w-7 h-7 rounded-full overflow-hidden bg-[#2a2a35] flex items-center justify-center text-white font-bold text-[10px] relative z-10" : "w-full h-full"}>
                          {currentUser.avatar ? (
                            <img alt="" className="w-full h-full object-cover" src={currentUser.avatar} />
                          ) : (
                            <span>{currentUser.name.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                      </div>
                      {currentUser.role === 'admin' && (
                        <div className="absolute -top-[4px] -left-[4px] z-20 bg-[#FFD166] bg-gradient-to-tr from-[#FFD166] to-[#ff9800] rounded-full p-[2px] shadow-md border-[1.5px] border-[#12121a]">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-crown w-[7px] h-[7px] text-[#1c1c1c] fill-[#1c1c1c]" aria-hidden="true"><path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"></path><path d="M5 21h14"></path></svg>
                        </div>
                      )}
                    </div>
                    {currentUser.role === 'admin' && (
                      <span className="inline-flex items-center px-1.5 py-[1px] rounded bg-[#FFD166] text-[#0f111a] text-[9px] font-black tracking-wider shrink-0">ADMIN</span>
                    )}
                    <span className="text-[13px] font-semibold text-white" style={currentUser.role === 'admin' ? { background: 'linear-gradient(rgb(255, 255, 255), rgb(255, 209, 102))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' } : undefined}>
                      {currentUser.name}
                    </span>
                    {currentUser.role === 'admin' && (
                      <img alt="emoji" loading="lazy" width="20" height="20" className="w-[18px] h-[18px] object-contain shrink-0" src="/gif/03.gif" />
                    )}
                  </div>

                  {/* Textarea */}
                  <div className="relative mb-3 sm:mb-4">
                    <textarea
                      placeholder="Viết bình luận..."
                      maxLength={1000}
                      rows={4}
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      className="w-full bg-[#0f111a] border-none rounded-lg px-4 py-3 text-[14px] text-white placeholder:text-zinc-600 resize-none focus:outline-none focus:ring-1 focus:ring-white/20 transition-shadow"
                    />
                    {commentText.length > 0 && (
                      <span className="absolute bottom-3 right-3 text-[11px] text-zinc-600">
                        {commentText.length}/1000
                      </span>
                    )}
                  </div>

                  {/* Selected GIF preview */}
                  {selectedGif && (
                    <div className="relative mb-3 inline-block">
                      <img src={selectedGif.preview} alt="GIF" className="max-h-32 rounded-lg border border-white/10" />
                      <button
                        type="button"
                        onClick={() => setSelectedGif(null)}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {/* GIF Picker Popup */}
                  {showGifPicker && (
                    <div
                      ref={gifPickerRef}
                      className="mb-3 bg-[#0f111a] border border-white/10 rounded-xl overflow-hidden"
                      style={{ maxHeight: '340px' }}
                    >
                      <div className="p-2 border-b border-white/5">
                        <input
                          type="text"
                          placeholder="Tìm GIF..."
                          value={gifSearch}
                          onChange={e => setGifSearch(e.target.value)}
                          className="w-full bg-[#191b24] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20"
                          autoFocus
                        />
                      </div>
                      <div className="overflow-y-auto" style={{ maxHeight: '280px' }}>
                        {gifLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                          </div>
                        ) : gifResults.length === 0 ? (
                          <div className="text-center py-8 text-zinc-600 text-sm">Không tìm thấy GIF nào</div>
                        ) : (
                          <div className="grid grid-cols-3 gap-1 p-2">
                            {gifResults.map((gif: any) => (
                              <button
                                key={gif.id}
                                type="button"
                                onClick={() => {
                                  setSelectedGif({
                                    url: gif.images.original.url,
                                    preview: gif.images.fixed_height_small.url,
                                  });
                                  setShowGifPicker(false);
                                }}
                                className="relative rounded-lg overflow-hidden aspect-video bg-zinc-800 hover:ring-2 hover:ring-[#FFD166] transition-all"
                              >
                                <img
                                  src={gif.images.fixed_height_small.url}
                                  alt={gif.title}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="px-3 py-1.5 border-t border-white/5 flex justify-end">
                        <img src="https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif" alt="Powered by GIPHY" className="h-4 opacity-40" />
                        <span className="text-[10px] text-zinc-600 ml-1 self-center">Powered by GIPHY</span>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-3 px-1 pb-1 sm:flex-row sm:items-center sm:justify-between sm:px-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setIsSpoiler(!isSpoiler)}
                        className={`w-9 h-5 rounded-full relative transition-colors flex items-center px-0.5 ${isSpoiler ? 'bg-amber-500' : 'bg-white/10'}`}
                      >
                        <span className={`w-3.5 h-3.5 rounded-full shadow-sm transition-transform duration-200 ${isSpoiler ? 'bg-[#1a1a24] translate-x-4' : 'bg-white/40 translate-x-0'}`}></span>
                      </button>
                      <div className="flex items-center">
                        <span className={`text-[13px] font-medium mx-1 ${isSpoiler ? 'text-amber-500' : 'text-zinc-500'}`}>{isSpoiler ? 'Không tiết lộ' : 'Tiết lộ'}</span>
                        <div className="relative flex items-center group">
                          <button type="button" className="text-white/40 hover:text-white/80 p-0.5">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-circle-help w-4 h-4" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><path d="M12 17h.01"></path></svg>
                          </button>
                          {/* Tooltip */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-[#2a2a36] text-[13px] text-white rounded-xl shadow-xl border border-white/10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 pointer-events-none">
                            Bật lựa chọn này để làm mờ các bình luận có chứa chi tiết tiết lộ trước cốt truyện phim (Spoiler). Mọi người có thể nhấp chuột vào phần chữ mờ để theo dõi.
                            <div className="mt-2 text-white/50">Ví dụ:</div>
                            <div className="mt-1 p-2 bg-white/5 rounded blur-sm inline-block select-none">Nội dung này đã bị làm mờ</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="relative ml-2 sm:ml-4 ">
                      <button
                        type="button"
                        onClick={() => setShowGifPicker(!showGifPicker)}
                        className={`px-2 py-1.5 sm:p-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${showGifPicker || selectedGif ? 'bg-white/10 text-white' : 'text-white/40 hover:bg-white/5 hover:text-white/80'}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-image w-4 h-4" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path></svg>
                        <span className="text-[12px] font-bold">GIF</span>
                      </button>
                    </div>

                    <div className="hidden sm:block flex-1"></div>

                    <div className="w-full flex items-center justify-between pt-2 border-t border-white/5 sm:w-auto sm:justify-start sm:gap-4 sm:pt-0 sm:border-0">
                      <span className="text-[11px] text-zinc-500">{commentText.length} / 1000</span>
                      <button
                        type="submit"
                        disabled={isSubmitting || (!commentText.trim() && !selectedGif)}
                        className="flex items-center gap-2 px-5 py-2 rounded-lg text-[13px] font-bold text-[#1c1c1c] transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
                        style={{ background: "linear-gradient(135deg, #FFD166, #FFF0B3)" }}
                      >
                        {isSubmitting ? (
                          <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" /></svg>
                        )}
                        Gửi
                      </button>
                    </div>
                  </div>

                  {/* Status messages */}
                  {submitError && (
                    <div className="mt-3 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-[13px] text-red-400">
                      {submitError}
                    </div>
                  )}
                  {submitSuccess && (
                    <div className="mt-3 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[13px] text-emerald-400">
                      {submitSuccess}
                    </div>
                  )}

                </form>
              ) : (
                <div className="flex items-center gap-3 mb-8 p-4 bg-[#1a1a24] border border-white/10 rounded-xl">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-log-in w-5 h-5 text-zinc-500 shrink-0"><path d="m10 17 5-5-5-5"></path><path d="M15 12H3"></path><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path></svg>
                  <p className="text-sm text-zinc-400">
                    <Link href="/pages/login" className="text-[#FFD166] hover:underline font-semibold">Đăng nhập</Link> để bình luận về phim này.
                  </p>
                </div>
              )}

              {/* Comment List */}
              <div className="divide-y divide-white/5">
                {commentList.length > 0 ? (
                  <>
                    {(() => {
                      const topLevelComments = commentList
                        .filter((c: any) => !c.parent_id)
                        .sort((a: any, b: any) => {
                          if (b.is_pinned && !a.is_pinned) return 1;
                          if (!b.is_pinned && a.is_pinned) return -1;
                          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                        });

                      return topLevelComments.slice(0, visibleCommentsCount).map((c: any) => {
                        const avatarSrc = getAvatarSrc(c.users.avatar);
                        const isSpoiler = c.is_spoiler;
                        const isRevealed = revealedSpoilers.has(c.id);

                        const replies = commentList
                          .filter((r: any) => r.parent_id === c.id)
                          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

                        return (
                          <div key={c.id} className={c.is_pinned ? "py-3 sm:py-5 bg-[#FFD166]/[0.04] border border-[#FFD166]/15 rounded-xl px-3 sm:px-4 my-1.5 transition-all duration-1000" : "py-3 sm:py-5 border-b border-white/5 last:border-b-0"}>
                            <div className="flex items-start gap-2.5 sm:gap-3">
                              <div className="shrink-0 mt-0.5">
                                <div className="relative shrink-0">
                                  <div className={c.users.role === 'admin' ? "avatar-ring-premium" : "ring-1 ring-white/15 rounded-full p-[2px] transition-colors"}>
                                    <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-[#2a2a35] overflow-hidden flex items-center justify-center font-bold text-white uppercase text-xs relative z-10">
                                      {avatarSrc ? (
                                        <img src={avatarSrc} alt="" className="w-full h-full object-cover" />
                                      ) : (
                                        <span>{c.users.name?.charAt(0) || '?'}</span>
                                      )}
                                    </div>
                                  </div>
                                  {c.users.role === 'admin' && (
                                    <div className="absolute -top-[4px] -left-[4px] z-20 bg-[#FFD166] bg-gradient-to-tr from-[#FFD166] to-[#ff9800] rounded-full p-[3px] shadow-md border-[2px] border-[#12121a]">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-crown w-[8px] h-[8px] sm:w-[10px] sm:h-[10px] text-[#1c1c1c] fill-[#1c1c1c]" aria-hidden="true"><path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"></path><path d="M5 21h14"></path></svg>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex-1 min-w-0 relative group/comment">
                                {c.is_pinned && (
                                  <div className="flex items-center gap-1.5 mb-1.5 text-[#FFD166] font-bold text-[12px] sm:text-[13px]">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none" className="w-3.5 h-3.5"><path d="M16 11V6.5A4.5 4.5 0 0 0 11.5 2h-1A4.5 4.5 0 0 0 6 6.5V11l-2 4h6.5v7h3v-7H20l-2-4z" /></svg>
                                    Ghim bởi Admin
                                  </div>
                                )}

                                {currentUser && (currentUser.role === 'admin' || currentUser.permissions?.includes('manage_comments')) && (
                                  <div className="absolute top-0 right-0 z-10">
                                    <button
                                      onClick={() => setActiveActionMenuId(activeActionMenuId === c.id ? null : c.id)}
                                      className="p-1 sm:p-1.5 text-zinc-500 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></svg>
                                    </button>
                                    {activeActionMenuId === c.id && (
                                      <div className="absolute right-0 mt-1 w-40 bg-[#1e1e28] border border-white/10 rounded-lg shadow-xl overflow-hidden text-[13px] z-50">
                                        <button onClick={() => handleCommentAction(c.id, c.is_pinned ? 'unpin' : 'pin')} className="w-full text-left px-3 py-2 hover:bg-white/5 text-white flex items-center gap-2">
                                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 11V6.5A4.5 4.5 0 0 0 11.5 2h-1A4.5 4.5 0 0 0 6 6.5V11l-2 4h6.5v7h3v-7H20l-2-4z" /></svg>
                                          {c.is_pinned ? 'Bỏ ghim' : 'Ghim bình luận'}
                                        </button>
                                        <button onClick={() => handleCommentAction(c.id, 'ban')} className="w-full text-left px-3 py-2 hover:bg-amber-500/10 text-amber-500 flex items-center gap-2">
                                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m4.9 4.9 14.2 14.2" /></svg>
                                          Cấm bình luận
                                        </button>
                                        <button onClick={() => handleCommentAction(c.id, 'delete')} className="w-full text-left px-3 py-2 hover:bg-red-500/10 text-red-500 flex items-center gap-2">
                                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>
                                          Xóa bình luận
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                                <div className="flex items-center gap-1.5 flex-wrap pr-6">
                                  {c.users.role === 'admin' && (
                                    <span className="inline-flex items-center px-1.5 py-[1px] rounded bg-[#FFD166] text-[#0f111a] text-[9px] font-black tracking-wider shrink-0">ADMIN</span>
                                  )}
                                  <span className="font-bold text-[12px] sm:text-[13px]" style={c.users.role === 'admin' ? { background: 'linear-gradient(rgb(255, 255, 255), rgb(255, 209, 102))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' } : { color: 'white' }}>
                                    {c.users.name || 'Unknown'}
                                  </span>
                                  {c.users.role === 'admin' && (
                                    <img alt="emoji" loading="lazy" width="20" height="20" className="w-[18px] h-[18px] sm:w-[20px] sm:h-[20px] object-contain shrink-0" src="/gif/03.gif" />
                                  )}
                                  {c.users.user_labels && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold border" style={{ backgroundColor: `${c.users.user_labels.color}20`, color: c.users.user_labels.color, borderColor: `${c.users.user_labels.color}40` }}>
                                      {c.users.user_labels.name}
                                    </span>
                                  )}
                                  {c.users.gender === 'Nữ' ? (
                                    <span className="text-pink-400">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-venus w-4 h-4" aria-hidden="true"><path d="M12 15v7" /><path d="M9 19h6" /><circle cx="12" cy="9" r="6" /></svg>
                                    </span>
                                  ) : c.users.gender === 'Nam' ? (
                                    <span className="text-blue-400">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-mars w-5 h-5" aria-hidden="true"><path d="M16 3h5v5" /><path d="m21 3-6.75 6.75" /><circle cx="10" cy="14" r="6" /></svg>
                                    </span>
                                  ) : (
                                    <span className="text-white/30">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-infinity w-4 h-4" aria-hidden="true"><path d="M6 16c5 0 7-8 12-8a4 4 0 0 1 0 8c-5 0-7-8-12-8a4 4 0 1 0 0 8" /></svg>
                                    </span>
                                  )}
                                  {isSpoiler && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-medium">
                                      Spoiler
                                    </span>
                                  )}
                                  <span className="text-[11px] sm:text-[12px] text-zinc-500 ml-1">
                                    {formatTime(c.created_at)}
                                  </span>
                                </div>
                                <div className="mt-1.5">
                                  {c.content && (
                                    <div className="relative text-[#AAAAAA] leading-[1.7] whitespace-pre-wrap break-words mb-2 sm:mb-2.5 text-[12px] sm:text-[13px] ">
                                      <div
                                        className={`transition-all duration-300 relative z-0 ${isSpoiler && !isRevealed ? 'blur-sm select-none cursor-pointer' : ''}`}
                                        onClick={() => {
                                          if (isSpoiler && !isRevealed) {
                                            setRevealedSpoilers(prev => {
                                              const newSet = new Set(prev);
                                              newSet.add(c.id);
                                              return newSet;
                                            });
                                          }
                                        }}
                                      >
                                        <span>
                                          {c.content.match(/^@\S+/) ? (
                                            <>
                                              <span className="text-[#FFD166] font-semibold">{c.content.split(' ')[0]}</span>
                                              {' ' + c.content.split(' ').slice(1).join(' ')}
                                            </>
                                          ) : c.content}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                  {c.gif_url && (
                                    <div className="mb-2">
                                      <img
                                        src={c.gif_url}
                                        alt="GIF"
                                        className="max-h-48 rounded-lg border border-white/10"
                                        loading="lazy"
                                      />
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 text-xs mt-2">
                                  <button
                                    onClick={() => handleLikeComment(c.id)}
                                    className={`flex items-center gap-1.5 rounded-full text-xs transition-colors ${c.isLiked ? 'text-[#FFD166]' : 'text-zinc-500 hover:text-white'}`}
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={c.isLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-thumbs-up w-4 h-4"><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"></path><path d="M7 10v12"></path></svg>
                                    {c.likeCount > 0 && <span className="font-semibold">{c.likeCount}</span>}
                                  </button>
                                  {currentUser && (
                                    <button
                                      onClick={() => {
                                        if (activeReplyId === c.id) {
                                          setActiveReplyId(null);
                                        } else {
                                          setActiveReplyId(c.id);
                                          setReplyText(`@${c.users.name || 'Ẩn danh'} `);
                                        }
                                      }}
                                      className="text-zinc-500 hover:text-white transition-colors font-medium"
                                    >
                                      Trả lời
                                    </button>
                                  )}
                                </div>

                                {/* Inline Reply Form */}
                                {activeReplyId === c.id && currentUser && (
                                  <form onSubmit={(e) => handleSubmitReply(e, c.id)} className="mt-4 p-3 bg-[#191b24]/60 border border-white/5 rounded-xl">
                                    <div className="relative mb-3">
                                      <textarea
                                        placeholder={`Trả lời ${c.users.name || 'Ẩn danh'}...`}
                                        maxLength={1000}
                                        rows={3}
                                        value={replyText}
                                        onChange={e => setReplyText(e.target.value)}
                                        className="w-full bg-[#0f111a] border-none rounded-lg px-4 py-3 text-[13px] text-white placeholder:text-zinc-600 resize-none focus:outline-none focus:ring-1 focus:ring-white/20 transition-shadow"
                                      />
                                      {replyText.length > 0 && (
                                        <span className="absolute bottom-3 right-3 text-[10px] text-zinc-600">
                                          {replyText.length}/1000
                                        </span>
                                      )}
                                    </div>

                                    {replySelectedGif && (
                                      <div className="relative mb-3 inline-block">
                                        <img src={replySelectedGif.preview} alt="GIF" className="max-h-24 rounded-lg border border-white/10" />
                                        <button
                                          type="button"
                                          onClick={() => setReplySelectedGif(null)}
                                          className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-[10px] transition-colors"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    )}

                                    {replyShowGifPicker && (
                                      <div
                                        ref={replyGifPickerRef}
                                        className="mb-3 bg-[#0f111a] border border-white/10 rounded-xl overflow-hidden"
                                        style={{ maxHeight: '240px' }}
                                      >
                                        <div className="p-2 border-b border-white/5">
                                          <input
                                            type="text"
                                            placeholder="Tìm GIF..."
                                            value={replySearch}
                                            onChange={e => setReplySearch(e.target.value)}
                                            className="w-full bg-[#191b24] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20"
                                            autoFocus
                                          />
                                        </div>
                                        <div className="overflow-y-auto" style={{ maxHeight: '180px' }}>
                                          {replyGifLoading ? (
                                            <div className="flex items-center justify-center py-4">
                                              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                            </div>
                                          ) : replyGifResults.length === 0 ? (
                                            <div className="text-center py-4 text-zinc-600 text-xs">Không tìm thấy GIF nào</div>
                                          ) : (
                                            <div className="grid grid-cols-3 gap-1 p-2">
                                              {replyGifResults.map((gif: any) => (
                                                <button
                                                  key={gif.id}
                                                  type="button"
                                                  onClick={() => {
                                                    setReplySelectedGif({
                                                      url: gif.images.original.url,
                                                      preview: gif.images.fixed_height_small.url,
                                                    });
                                                    setReplyShowGifPicker(false);
                                                  }}
                                                  className="relative rounded-lg overflow-hidden aspect-video bg-zinc-800 hover:ring-2 hover:ring-[#FFD166] transition-all"
                                                >
                                                  <img
                                                    src={gif.images.fixed_height_small.url}
                                                    alt={gif.title}
                                                    className="w-full h-full object-cover"
                                                    loading="lazy"
                                                  />
                                                </button>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}

                                    <div className="flex items-center justify-between flex-wrap gap-3">
                                      <div className="flex items-center gap-3">
                                        <button
                                          type="button"
                                          onClick={() => setReplyIsSpoiler(!replyIsSpoiler)}
                                          className={`w-8 h-4 rounded-full relative transition-colors flex items-center px-0.5 ${replyIsSpoiler ? 'bg-amber-500' : 'bg-white/10'}`}
                                        >
                                          <span className={`w-3 h-3 rounded-full shadow-sm transition-transform duration-200 ${replyIsSpoiler ? 'bg-[#1a1a24] translate-x-4' : 'bg-white/40 translate-x-0'}`}></span>
                                        </button>
                                        <span className={`text-xs font-medium ${replyIsSpoiler ? 'text-amber-500' : 'text-zinc-500'}`}>{replyIsSpoiler ? 'Không tiết lộ' : 'Tiết lộ'}</span>

                                        <button
                                          type="button"
                                          onClick={() => setReplyShowGifPicker(!replyShowGifPicker)}
                                          className={`px-2 py-1 rounded transition-colors flex items-center gap-1 ${replyShowGifPicker || replySelectedGif ? 'bg-white/10 text-white' : 'text-white/40 hover:bg-white/5 hover:text-white/80'}`}
                                        >
                                          <span className="text-[11px] font-bold">GIF</span>
                                        </button>
                                      </div>

                                      <div className="flex gap-2">
                                        <button
                                          type="button"
                                          onClick={() => setActiveReplyId(null)}
                                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
                                        >
                                          Hủy
                                        </button>
                                        <button
                                          type="submit"
                                          disabled={isSubmittingReply || (!replyText.trim() && !replySelectedGif)}
                                          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-[#1c1c1c] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                          style={{ background: "linear-gradient(135deg, #FFD166, #FFF0B3)" }}
                                        >
                                          Gửi
                                        </button>
                                      </div>
                                    </div>
                                  </form>
                                )}

                                {/* Expand/Collapse Replies */}
                                {replies.length > 0 && (
                                  <button
                                    onClick={() => setExpandedReplies(prev => {
                                      const next = new Set(prev);
                                      next.has(c.id) ? next.delete(c.id) : next.add(c.id);
                                      return next;
                                    })}
                                    className="flex items-center gap-1.5 mt-3 text-[13px] text-[#FFD166] hover:text-[#FFD166]/80 font-medium transition-colors"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 transition-transform ${expandedReplies.has(c.id) ? '' : 'rotate-180'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m18 15-6-6-6 6" /></svg>
                                    {expandedReplies.has(c.id) ? 'Ẩn phản hồi' : `Xem ${replies.length} phản hồi`}
                                  </button>
                                )}

                                {/* Replies List */}
                                {replies.length > 0 && expandedReplies.has(c.id) && (
                                  <div className="mt-2 ml-1 border-l-2 border-white/5 pl-3 space-y-3">
                                    {replies.map((r: any) => {
                                      const rAvatarSrc = getAvatarSrc(r.users.avatar);
                                      const rIsSpoiler = r.is_spoiler;
                                      const rIsRevealed = revealedSpoilers.has(r.id);
                                      return (
                                        <div key={r.id} className="flex items-start gap-2 sm:gap-2.5 py-1">
                                          <div className="shrink-0 mt-0.5">
                                            <div className="relative shrink-0">
                                              <div className={r.users.role === 'admin' ? "avatar-ring-premium" : ""}>
                                                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#2a2a35] overflow-hidden flex items-center justify-center font-bold text-white uppercase text-[10px] relative z-10">
                                                  {rAvatarSrc ? (
                                                    <img src={rAvatarSrc} alt="" className="w-full h-full object-cover" />
                                                  ) : (
                                                    <span>{r.users.name?.charAt(0) || '?'}</span>
                                                  )}
                                                </div>
                                              </div>
                                              {r.users.role === 'admin' && (
                                                <div className="absolute -top-[4px] -left-[4px] z-20 bg-[#FFD166] bg-gradient-to-tr from-[#FFD166] to-[#ff9800] rounded-full p-[3px] shadow-md border-[2px] border-[#12121a]">
                                                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-crown w-[8px] h-[8px] sm:w-[10px] sm:h-[10px] text-[#1c1c1c] fill-[#1c1c1c]" aria-hidden="true"><path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"></path><path d="M5 21h14"></path></svg>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                          <div className="flex-1 min-w-0 relative group/reply">
                                            {currentUser && (currentUser.role === 'admin' || currentUser.permissions?.includes('manage_comments')) && (
                                              <div className="absolute top-0 right-0 z-10">
                                                <button
                                                  onClick={() => setActiveActionMenuId(activeActionMenuId === r.id ? null : r.id)}
                                                  className="p-1 sm:p-1.5 text-zinc-500 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                                                >
                                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></svg>
                                                </button>
                                                {activeActionMenuId === r.id && (
                                                  <div className="absolute right-0 mt-1 w-40 bg-[#1e1e28] border border-white/10 rounded-lg shadow-xl overflow-hidden text-[13px] z-50">
                                                    <button onClick={() => handleCommentAction(r.id, 'ban')} className="w-full text-left px-3 py-2 hover:bg-amber-500/10 text-amber-500 flex items-center gap-2">
                                                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m4.9 4.9 14.2 14.2" /></svg>
                                                      Cấm bình luận
                                                    </button>
                                                    <button onClick={() => handleCommentAction(r.id, 'delete')} className="w-full text-left px-3 py-2 hover:bg-red-500/10 text-red-500 flex items-center gap-2">
                                                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>
                                                      Xóa bình luận
                                                    </button>
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                            <div className="flex items-center gap-1.5 flex-wrap pr-6">
                                              {r.users.role === 'admin' && (
                                                <span className="inline-flex items-center px-1.5 py-[1px] rounded bg-[#FFD166] text-[#0f111a] text-[9px] font-black tracking-wider shrink-0">ADMIN</span>
                                              )}
                                              <span className="font-bold text-[11px] sm:text-[12px]" style={r.users.role === 'admin' ? { background: 'linear-gradient(rgb(255, 255, 255), rgb(255, 209, 102))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' } : { color: 'white' }}>
                                                {r.users.name || 'Unknown'}
                                              </span>
                                              {r.users.role === 'admin' && (
                                                <img alt="emoji" loading="lazy" width="20" height="20" className="w-[18px] h-[18px] sm:w-[20px] sm:h-[20px] object-contain shrink-0" src="/gif/03.gif" />
                                              )}
                                              {r.users.user_labels && (
                                                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold border" style={{ backgroundColor: `${r.users.user_labels.color}20`, color: r.users.user_labels.color, borderColor: `${r.users.user_labels.color}40` }}>
                                                  {r.users.user_labels.name}
                                                </span>
                                              )}
                                              {r.users.gender === 'Nữ' ? (
                                                <span className="text-pink-400">
                                                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-venus w-3.5 h-3.5" aria-hidden="true"><path d="M12 15v7" /><path d="M9 19h6" /><circle cx="12" cy="9" r="6" /></svg>
                                                </span>
                                              ) : r.users.gender === 'Nam' ? (
                                                <span className="text-blue-400">
                                                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-mars w-4 h-4" aria-hidden="true"><path d="M16 3h5v5" /><path d="m21 3-6.75 6.75" /><circle cx="10" cy="14" r="6" /></svg>
                                                </span>
                                              ) : (
                                                <span className="text-white/30">
                                                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-infinity w-3.5 h-3.5" aria-hidden="true"><path d="M6 16c5 0 7-8 12-8a4 4 0 0 1 0 8c-5 0-7-8-12-8a4 4 0 1 0 0 8" /></svg>
                                                </span>
                                              )}
                                              {rIsSpoiler && (
                                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-medium">
                                                  Spoiler
                                                </span>
                                              )}
                                              <span className="text-[10px] sm:text-[11px] text-zinc-500">
                                                {formatTime(r.created_at)}
                                              </span>
                                            </div>
                                            <div className="mt-1">
                                              {r.content && (
                                                <div
                                                  className={`relative text-[#AAAAAA] leading-relaxed whitespace-pre-wrap break-words text-[11px] sm:text-[12px] transition-all duration-300 ${rIsSpoiler && !rIsRevealed ? 'blur-sm select-none cursor-pointer' : ''}`}
                                                  onClick={() => {
                                                    if (rIsSpoiler && !rIsRevealed) {
                                                      setRevealedSpoilers(prev => {
                                                        const newSet = new Set(prev);
                                                        newSet.add(r.id);
                                                        return newSet;
                                                      });
                                                    }
                                                  }}
                                                >
                                                  <span>
                                                    {r.content.match(/^@\S+/) ? (
                                                      <>
                                                        <span className="text-[#FFD166] font-semibold">{r.content.split(' ')[0]}</span>
                                                        {' ' + r.content.split(' ').slice(1).join(' ')}
                                                      </>
                                                    ) : r.content}
                                                  </span>
                                                </div>
                                              )}
                                              {r.gif_url && (
                                                <div className="mb-1">
                                                  <img
                                                    src={r.gif_url}
                                                    alt="GIF"
                                                    className="max-h-36 rounded-lg border border-white/10"
                                                    loading="lazy"
                                                  />
                                                </div>
                                              )}
                                            </div>
                                            <div className="flex items-center gap-3 text-xs mt-1.5">
                                              <button
                                                onClick={() => handleLikeComment(r.id)}
                                                className={`flex items-center gap-1.5 rounded-full text-xs transition-colors ${r.isLiked ? 'text-[#FFD166]' : 'text-zinc-500 hover:text-white'}`}
                                              >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={r.isLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"></path><path d="M7 10v12"></path></svg>
                                                {r.likeCount > 0 && <span className="font-semibold text-[10px]">{r.likeCount}</span>}
                                              </button>
                                              {currentUser && (
                                                <button
                                                  onClick={() => {
                                                    setActiveReplyId(c.id);
                                                    setReplyText(`@${r.users.name || 'Ẩn danh'} `);
                                                  }}
                                                  className="text-zinc-500 hover:text-white transition-colors text-[10px] font-medium"
                                                >
                                                  Trả lời
                                                </button>
                                              )}
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
                        );
                      });
                    })()}
                    {commentList.filter((c: any) => !c.parent_id).length > visibleCommentsCount && (
                      <div className="flex justify-center gap-3 mt-4">
                        <button
                          onClick={() => setVisibleCommentsCount(prev => prev + 5)}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sm text-white/70 hover:text-white transition-all cursor-pointer"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-down w-4 h-4"><path d="m6 9 6 6 6-6"></path></svg>
                          Xem thêm bình luận
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 text-white/10 mb-3"><path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"></path></svg>
                    <p className="text-zinc-500 text-sm">Chưa có bình luận nào. Hãy là người đầu tiên!</p>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Right Sidebar Column */}
          <div className="w-full xl:w-[320px] 2xl:w-[340px] shrink-0 space-y-10">

            {/* Actors Section */}
            {actors && actors.length > 0 && (
              <div>
                <h2 className="text-[17px] font-bold text-white mb-5 flex items-center gap-2">
                  Diễn viên
                </h2>
                <div className="flex flex-wrap gap-x-5 gap-y-6">
                  {actors.slice(0, 8).map((actor: any) => (
                    <ActorCard
                      key={actor.id}
                      actor={actor}
                      size="small"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations Sidebar Section */}
            {recommendations && recommendations.length > 0 && (
              <div>
                <div className="w-full h-px bg-white/10 my-8"></div>
                <h2 className="text-[17px] font-bold text-white mb-5 flex items-center gap-2">
                  Đề xuất cho bạn
                </h2>
                <div className="flex flex-col gap-4">
                  {recommendations.slice(0, 10).map((rec: any) => {
                    const recPosterUrl = getProxyImageUrl(getPosterUrl(rec));
                    return (
                      <Link key={rec.id} href={`/phim/${rec.slug}`} className="flex gap-3 rounded overflow-hidden bg-[#1A1A24] group">
                        <div className="relative w-[56px] sm:w-[64px] shrink-0 aspect-[2/3]">
                          <img alt={rec.title} src={recPosterUrl} className="object-cover absolute inset-0 w-full h-full" />
                        </div>
                        <div className="flex flex-col justify-center gap-1.5 py-2 pr-3 min-w-0">
                          <h4 className="text-[13px] sm:text-[14px] font-medium text-white/90 leading-snug line-clamp-2 group-hover:text-yellow-400 transition-colors">{rec.title}</h4>
                          <p className="text-[11px] sm:text-[12px] text-white/50 truncate">{rec.original_title}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[10px] sm:text-[11px] text-white/40">Phần 1</span>
                            <div className="w-[3px] h-[3px] rounded-full bg-white/20"></div>
                            <span className="text-[10px] sm:text-[11px] text-white/40 truncate">{rec.episode_current || 'Tập 1'}</span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Modal: Add to Folder */}
        {showFolderModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn"
            onClick={() => setShowFolderModal(false)}
          >
            <div
              className="bg-[#0f1118] border border-white/[0.08] rounded-2xl p-6 w-full max-w-md shadow-2xl relative text-white"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold mb-4 mt-0">Thêm phim vào thư mục</h3>
              <button
                onClick={() => setShowFolderModal(false)}
                className="absolute top-4 right-4 bg-transparent border-none text-zinc-400 hover:text-white text-xl cursor-pointer"
              >
                ×
              </button>

              <div className="max-h-60 overflow-y-auto space-y-3 mb-6 pr-1">
                {userFolders.length === 0 ? (
                  <p className="text-sm text-zinc-500 text-center py-4">Bạn chưa có thư mục nào.</p>
                ) : (
                  userFolders.map((folder) => (
                    <label key={folder.id} className="flex items-center gap-3 p-3 bg-zinc-900/40 hover:bg-zinc-900/80 rounded-xl cursor-pointer border border-white/[0.03] transition-colors">
                      <input
                        type="checkbox"
                        checked={folder.has_movie === 1}
                        onChange={(e) => handleFolderCheckboxChange(folder.id, e.target.checked)}
                        className="w-4.5 h-4.5 rounded border-white/10 text-[#00ac47] focus:ring-[#00ac47] bg-black/30"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate m-0">{folder.name}</p>
                        <span className="text-[10px] text-zinc-500">{folder.is_public ? 'Công khai' : 'Riêng tư'}</span>
                      </div>
                    </label>
                  ))
                )}
              </div>

              <form onSubmit={handleCreateFolderFromModal} className="border-t border-white/5 pt-4">
                <label className="block text-xs text-zinc-500 mb-2 uppercase font-bold tracking-wider">Tạo thư mục mới</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Tên thư mục mới..."
                    required
                    className="flex-1 bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-colors text-sm"
                  />
                  <button
                    type="submit"
                    disabled={isCreatingFolder}
                    className="px-4 py-2.5 bg-[#00ac47] hover:bg-[#00c250] text-white font-bold rounded-xl cursor-pointer border-none text-sm disabled:opacity-50 transition-colors"
                  >
                    {isCreatingFolder ? 'Đang tạo...' : 'Tạo'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Báo Lỗi Phim */}
        {showReportModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm animate-fadeIn"
            onClick={() => setShowReportModal(false)}
          >
            <div
              className="bg-[#0f1118] border border-white/[0.08] rounded-2xl p-6 w-full max-w-lg shadow-2xl relative text-white"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 mb-6 pb-2 border-b border-white/5">
                <div className="p-2 bg-amber-400/10 text-amber-400 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-bug"><path d="M12 20v-9"></path><path d="M14 7a4 4 0 0 1 4 4v3a6 6 0 0 1-12 0v-3a4 4 0 0 1 4-4z"></path><path d="M14.12 3.88 16 2"></path><path d="M21 21a4 4 0 0 0-3.81-4"></path><path d="M21 5a4 4 0 0 1-3.55 3.97"></path><path d="M22 13h-4"></path><path d="M3 21a4 4 0 0 1 3.81-4"></path><path d="M3 5a4 4 0 0 0 3.55 3.97"></path><path d="M6 13H2"></path><path d="m8 2 1.88 1.88"></path><path d="M9 7.13V6a3 3 0 1 1 6 0v1.13"></path></svg>
                </div>
                <h3 className="text-base font-extrabold text-white m-0">Báo lỗi phim</h3>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="absolute top-5 right-5 bg-transparent border-none text-zinc-400 hover:text-white text-xl cursor-pointer outline-none transition-colors"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSendReport} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Phim đang xem</label>
                  <div className="w-full bg-zinc-950/60 border border-white/5 rounded-xl px-4 py-3 text-sm text-zinc-300 font-bold whitespace-nowrap overflow-hidden text-ellipsis">
                    {movie.title} — {currentEpisode?.name || 'Tập 1'}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">LOẠI LỖI</label>
                  <div className="flex flex-col gap-2">
                    {[
                      'Lỗi video (không tải, giật lag, đen màn hình)',
                      'Lỗi âm thanh (mất tiếng, sai ngôn ngữ)',
                      'Lỗi phụ đề (sai, thiếu, lệch)',
                      'Lỗi khác'
                    ].map((opt) => {
                      const isSelected = reportType === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setReportType(opt)}
                          className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold border transition-all ${isSelected
                            ? 'border-amber-400 bg-amber-400/5 text-amber-400 shadow-md shadow-amber-400/5'
                            : 'border-white/5 hover:border-white/10 text-zinc-400 hover:text-white bg-zinc-950/20'
                            }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">MÔ TẢ CHI TIẾT</label>
                  <textarea
                    required
                    maxLength={500}
                    value={reportDesc}
                    onChange={(e) => setReportDesc(e.target.value)}
                    placeholder="Mô tả lỗi bạn gặp phải..."
                    rows={4}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-amber-400 transition-colors text-xs resize-none"
                  />
                  <div className="flex justify-end text-[10px] text-zinc-500 mt-1.5 font-semibold">
                    {reportDesc.length}/500
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingReport}
                  className="w-full py-3.5 bg-gradient-to-r from-white to-[#FFD166] hover:from-zinc-100 hover:to-[#FECF59] text-zinc-950 font-extrabold rounded-xl text-xs transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer border-none shadow-lg shadow-amber-500/10"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"></path>
                  </svg>
                  Gửi báo lỗi
                </button>
              </form>
            </div>
          </div>
        )}

      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-5 right-5 z-[9999] bg-[#0f1118]/95 border border-white/10 rounded-2xl p-4 shadow-2xl flex items-center gap-3 transition-all duration-300 max-w-sm animate-fadeIn text-white">
          <div className={`p-2 rounded-xl ${toast.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
            {toast.type === 'success' ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-white m-0">{toast.type === 'success' ? 'Thành công' : 'Lỗi'}</h4>
            <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">{toast.message}</p>
          </div>
          <button onClick={() => setToast(null)} className="text-zinc-500 hover:text-white text-lg bg-transparent border-none cursor-pointer outline-none pb-0.5">×</button>
        </div>
      )}
      {/* Banner Ad */}
      {adsConfig.ads_banner_enabled === 'true' && adsConfig.ads_banner_image && showBanner && (
        <div className="fixed bottom-0 left-0 right-0 z-[999] flex items-center justify-center p-2 bg-black/60 backdrop-blur-sm border-t border-white/10 text-white animate-in fade-in slide-in-from-bottom duration-300">
          <div className="relative max-w-full sm:max-w-4xl">
            <button
              onClick={() => setShowBanner(false)}
              className="absolute -top-3 -right-3 bg-red-600 hover:bg-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-lg text-xs font-bold border border-white/20 transition-all active:scale-90"
              title="Tắt quảng cáo"
            >
              ×
            </button>
            <a href={adsConfig.ads_banner_link || '#'} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-lg border border-white/10">
              <img
                src={adsConfig.ads_banner_image}
                alt="Quảng cáo"
                className="w-full h-auto max-h-[60px] sm:max-h-[90px] object-cover"
              />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

