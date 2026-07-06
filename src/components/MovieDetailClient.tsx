'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getBackdropUrl, getPosterUrl, getProxyImageUrl } from '@/lib/image';
import ActorCard from '@/components/ActorCard';

interface CurrentUser {
  id: number;
  name: string;
  avatar: string | null;
  role: string;
  permissions?: any;
}

interface Comment {
  id: number;
  content: string;
  gif_url: string | null;
  parent_id?: number | null;
  is_disclosed?: boolean | null;
  created_at: string;
  users: {
    id: number;
    name: string;
    avatar: string | null;
    role: string;
    user_labels?: {
      name: string;
      color: string;
    } | null;
  };
  real_user?: { id: number; name: string; avatar: string | null } | null;
}

interface MovieDetailClientProps {
  movie: any;
  genres: any[];
  countries: any[];
  actors: any[];
  episodes: any[];
  comments: Comment[];
  currentUser: CurrentUser | null;
  giphyApiKey?: string;
  adsConfig?: Record<string, string>;
  gallery?: string[];
  recommendations?: any[];
}

// Remove hardcoded GIPHY key
const DEFAULT_ANON_AVATAR = '/avt/meme/avatar-hai-huoc-vo-tri-0.jpg';

function getAvatarSrc(avatar: string | null | undefined, fallback?: string) {
  if (!avatar) return fallback || DEFAULT_ANON_AVATAR;
  if (avatar.startsWith('http')) return avatar;
  return avatar;
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return 'Vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} ngày trước`;
  return date.toLocaleDateString('vi-VN');
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

export default function MovieDetailClient({
  movie,
  genres,
  countries,
  actors,
  episodes,
  comments: initialComments,
  currentUser,
  giphyApiKey = 'dc6zaTOxFJmzC',
  adsConfig = {},
  gallery = [],
  recommendations = [],
}: MovieDetailClientProps) {
  const [activeTab, setActiveTab] = useState<'episodes' | 'gallery' | 'actors' | 'recommendations'>('episodes');
  const [isMobileInfoOpen, setIsMobileInfoOpen] = useState(false);
  const [selectedServer, setSelectedServer] = useState<string>('');
  const [selectedGalleryIndex, setSelectedGalleryIndex] = useState<number | null>(null);
  const [showtimesExpanded, setShowtimesExpanded] = useState(false);

  const [globalServers, setGlobalServers] = useState<any[]>([]);
  useEffect(() => {
    fetch('/api/servers').then(r => r.json()).then(data => {
      if (data.success) {
        setGlobalServers(data.servers || []);
      }
    }).catch(console.error);
  }, []);

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

  let displayShowtimesText = showtimesData?.type === 'tmdb_showtimes' ? showtimesData.next : movie.showtimes;
  let isShowtimesExpired = false;

  if (showtimesData?.type === 'tmdb_showtimes') {
    if (isDateInPast(showtimesData.next)) {
      const futureUpcoming = showtimesData.upcoming?.find((up: any) => !isDateInPast(up.date));
      if (futureUpcoming) {
        const epLabel = futureUpcoming.episode.toLowerCase().startsWith('tập') 
          ? futureUpcoming.episode 
          : `Tập ${futureUpcoming.episode}`;
        displayShowtimesText = `${epLabel} - ${futureUpcoming.date}`;
      } else {
        isShowtimesExpired = true;
      }
    }
  } else {
    isShowtimesExpired = displayShowtimesText ? isDateInPast(displayShowtimesText) : false;
  }

  useEffect(() => {
    if (selectedGalleryIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedGalleryIndex(null);
      } else if (e.key === 'ArrowRight') {
        setSelectedGalleryIndex(prev => (prev !== null && prev < gallery.length - 1) ? prev + 1 : 0);
      } else if (e.key === 'ArrowLeft') {
        setSelectedGalleryIndex(prev => (prev !== null && prev > 0) ? prev - 1 : gallery.length - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [selectedGalleryIndex, gallery]);

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

  const snEpisodes = episodes.filter((ep: any) => {
    const lower = (ep.server_name || '').toLowerCase();
    return (
      lower.includes('ssplay') ||
      lower.includes('song ngữ') ||
      lower.includes('songngữ') ||
      lower.includes('songngù') ||
      lower.includes('sn -') ||
      lower.startsWith('sn') ||
      lower.includes('vicdn')
    );
  });
  const language = (movie.language || '').toLowerCase();
  const isSongNgu = snEpisodes.length > 0 || language.includes('song ngữ') || language.includes('songngữ');

  function cleanServerIndicator(name: string): string {
    return name
      .replace(/\s*\(?(nguonc|ophim|kkphim|kk|op|nc|vsmov|vs|ssplay|sn|vicdn)\)?\s*$/gi, '')
      .replace(/\s*\(?(nguonc|ophim|kkphim|kk|op|nc|vsmov|vs|ssplay|sn|vicdn)\)?\s+/gi, ' ')
      .replace(/^(nguonc|ophim|kkphim|kk|op|nc|vsmov|vs|ssplay|sn|vicdn)\s*-\s*/gi, '')
      .trim();
  }

  // Favorites and Folders State
  const [isFavorited, setIsFavorited] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [userFolders, setUserFolders] = useState<any[]>([]);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
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
        showToast(data.message || 'Đồng bộ thư mục thất bại.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Lỗi kết nối.', 'error');
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
        showToast(data.message || 'Tạo thư mục thất bại.', 'error');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreatingFolder(false);
    }
  };

  // Comment state
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [commentText, setCommentText] = useState('');
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [activeActionMenuId, setActiveActionMenuId] = useState<number | null>(null);
  const [revealedSpoilers, setRevealedSpoilers] = useState<Set<number>>(new Set());

  const handleCommentAction = async (commentId: number, action: 'pin' | 'unpin' | 'delete' | 'ban', type: 'movie' | 'article' = 'movie') => {
    let banDays = 0;
    if (action === 'ban') {
      const daysStr = window.prompt("Nhập số ngày cấm bình luận (để trống hoặc 0 để cấm vĩnh viễn):", "7");
      if (daysStr === null) return;
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
          setComments(prev => prev.filter(c => c.id !== commentId && c.parent_id !== commentId));
        } else if (action === 'pin' || action === 'unpin') {
          setComments(prev => prev.map(c => c.id === commentId ? { ...c, is_pinned: action === 'pin' } : c));
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

  // GIF picker state
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearch, setGifSearch] = useState('');
  const [gifResults, setGifResults] = useState<any[]>([]);
  const [gifLoading, setGifLoading] = useState(false);
  const [selectedGif, setSelectedGif] = useState<{ url: string; preview: string } | null>(null);
  const gifPickerRef = useRef<HTMLDivElement>(null);
  const gifSearchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Group episodes by raw server_name
  const groupedServers: Record<string, { name: string; episodes: any[] }> = {};

  episodes.forEach(ep => {
    const key = ep.server_name;

    if (!groupedServers[key]) {
      groupedServers[key] = { name: key, episodes: [] };
    }

    groupedServers[key].episodes.push({
      data: ep
    });
  });

  const getEpNum = (name: string) => {
    const matches = name.match(/(\d+)/);
    return matches ? parseInt(matches[1], 10) : 999999;
  };

  // Sort episodes in each server numerically
  Object.keys(groupedServers).forEach(key => {
    groupedServers[key].episodes.sort((a, b) => {
      return getEpNum(a.data.name) - getEpNum(b.data.name);
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

    // 3. Fallback original logic
    const getPriority = (name: string) => {
      const lower = name.toLowerCase();
      if (lower.includes('ophim')) return 1;
      if (lower.includes('nguonc') || lower.includes('nc')) return 3;
      if (lower.includes('vsmov')) return 4;
      return 2;
    };
    return getPriority(a) - getPriority(b);
  });
  const initialServerKey = serverKeys[0] || '';
  const currentServerKey = selectedServer || initialServerKey;
  const currentServer = groupedServers[currentServerKey];

  const backdropUrl = getProxyImageUrl(getBackdropUrl(movie), 1920);
  const posterUrl = getProxyImageUrl(getPosterUrl(movie), 640);

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
        setComments(prev => [json.comment, ...prev]);
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

  return (
    <main className="flex-1 pt-16">
      <div className="lg:-mt-16">
        {/* Backdrop Area */}
        <div className="relative h-[210px] md:h-[600px] lg:h-[70vh] xl:max-h-[800px] overflow-hidden bg-[#0f111a]">
          <img
            alt={movie.title}
            src={backdropUrl}
            className="object-cover object-center scale-105 opacity-70 md:opacity-80 absolute inset-0 w-full h-full"
          />
          <div className="absolute inset-0 pointer-events-none" style={{ maskImage: "radial-gradient(transparent 65%, black 100%)", WebkitMaskImage: "radial-gradient(transparent 65%, black 100%)" }}>
            <img
              alt={movie.title}
              src={backdropUrl}
              className="object-cover object-center blur-sm md:blur-md scale-110 opacity-90 absolute inset-0 w-full h-full"
            />
          </div>
          <div className="absolute inset-0 pointer-events-none opacity-20 md:opacity-30" style={{ backgroundImage: "radial-gradient(rgba(0, 0, 0, 0.8) 0.3px, transparent 1px)", backgroundSize: "2px 2px" }}></div>
          <div className="absolute bottom-0 inset-x-0 h-[80%] pointer-events-none md:hidden" style={{ background: "linear-gradient(to top, rgb(15, 17, 26) 5%, rgba(10, 10, 15, 0.6) 30%, rgba(10, 10, 15, 0) 100%)" }}></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f111a] via-[#0f111a]/40 to-transparent pointer-events-none hidden md:block"></div>
        </div>

        <div className="max-w-[1400px] mx-auto px-4 -mt-24 md:-mt-48 lg:-mt-64 relative z-10 mb-20">
          <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-start">
            {/* Left Column: Poster & Synopsis */}
            <div className="shrink-0 w-40 md:w-56 lg:w-64 max-w-[280px] mx-auto md:mx-0 flex flex-col gap-8">
              <div className="relative rounded-xl overflow-hidden shadow-2xl shadow-[#0f111a]/50 ring-1 ring-white/10 bg-[#16161e] w-full aspect-[2/3] flex items-center justify-center">
                <svg className="absolute w-12 h-12 text-white/10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"></path></svg>
                <img
                  alt={movie.title}
                  src={posterUrl}
                  className="w-full h-full object-cover relative z-10"
                />
                {isSongNgu && (
                  <div className="absolute top-2 right-2 z-20 bg-gradient-to-r from-[#d9b8ff] to-[#9888ff] text-[#1c1c1c] text-[10px] md:text-xs font-bold px-2 py-1 rounded-md shadow-md flex items-center gap-1.5 leading-none">
                    <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>
                    Song Ngữ
                  </div>
                )}
              </div>
              <div className="hidden md:block">
                <h3 className="text-[16px] font-semibold text-white mb-3">Nội dung phim</h3>
                <div className="relative text-sm text-zinc-400 leading-relaxed overflow-hidden">
                  <p>{movie.description?.replace(/<[^>]*>?/gm, '') || 'Đang cập nhật nội dung phim...'}</p>
                </div>
              </div>
            </div>

            {/* Right Column: Title, Metadata, Actions */}
            <div className="flex-1 md:pt-12 min-w-0 w-full">
              <h1 className="text-[22px] md:text-3xl font-bold text-white mb-1 text-center md:text-left leading-tight">{movie.title}</h1>
              <p className="text-[13px] md:text-sm text-zinc-400 mb-4 text-center md:text-left">{movie.original_title || movie.title}</p>

              {/* Badges (Desktop) */}
              <div className="flex flex-wrap items-center gap-2 text-white/90 hidden md:flex justify-center md:justify-start mb-4 text-[10px] md:text-xs">
                {(movie.sub_docquyen || (episodes && episodes.some((ep: any) => ep.server_name && (ep.server_name.toLowerCase().includes('subteam') || ep.server_name.toLowerCase().includes('hà nội'))))) && (
                  <span className="bg-[#F5C518] text-[#0f111a] flex items-center gap-1.5 px-2.5 py-1 rounded font-bold uppercase tracking-wider text-[10px] sm:text-[11px]">
                    <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd"></path>
                    </svg>
                    <span>Vietsub độc quyền</span>
                  </span>
                )}
                <span className="inline-flex items-center justify-center rounded-[4px] text-[#141414] font-black leading-none tracking-normal h-[22px] px-2" style={{ background: "linear-gradient(220deg, rgb(255, 216, 117) 0%, rgb(255, 231, 168) 45%, rgb(255, 255, 255) 100%)" }}>
                  {movie.quality || 'FHD'}
                </span>
                <span className="px-2 py-[3px] rounded border border-white/20 bg-black/20 backdrop-blur-sm font-medium">{movie.language || 'Vietsub'}</span>
                <span className="px-2 py-[3px] rounded border border-white bg-black/40 font-medium">{displayEpisodeCurrent}</span>
                {movie.imdb_rating && (
                  <div className="flex items-center text-[11px] font-bold rounded overflow-hidden border border-solid border-[rgba(1,180,228,0.5)]">
                    <span className="bg-[#01B4E4] text-white px-1.5 py-0.5">TMDb</span>
                    <span className="bg-[rgba(1,180,228,0.1)] text-white px-1.5 py-0.5">{Number(movie.imdb_rating).toFixed(1)}</span>
                  </div>
                )}
                {isSongNgu && (
                  <span className="px-2 py-[3px] rounded bg-gradient-to-r from-[#d9b8ff] to-[#9888ff] text-[#1c1c1c] font-bold flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>
                    Song Ngữ
                  </span>
                )}
              </div>

              {/* Metadata Grid (Desktop) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 hidden md:grid text-sm mb-5">
                <div className="flex items-start gap-2"><span className="text-zinc-500 shrink-0 w-20">Trạng thái:</span><span className="text-zinc-300">{formatMovieStatus(movie, maxEpisodes)}</span></div>
                <div className="flex items-start gap-2"><span className="text-zinc-500 shrink-0 w-20">Loại:</span><span className="text-zinc-300">{movie.type === 'phimbo' ? 'Phim Bộ' : 'Phim Lẻ'}</span></div>
                <div className="flex items-start gap-2"><span className="text-zinc-500 shrink-0 w-20">Năm:</span><span className="text-zinc-300">{movie.year || 'Đang cập nhật'}</span></div>
                <div className="flex items-start gap-2"><span className="text-zinc-500 shrink-0 w-20">Thời lượng:</span><span className="text-zinc-300">{movie.duration || 'Đang cập nhật'}</span></div>
                <div className="flex items-start gap-2"><span className="text-zinc-500 shrink-0 w-20">Thể loại:</span><span className="text-zinc-300">{genres.map(g => g.name).join(', ') || 'Đang cập nhật'}</span></div>
                <div className="flex items-start gap-2"><span className="text-zinc-500 shrink-0 w-20">Quốc gia:</span><span className="text-zinc-300">{countries.map(c => c.name).join(', ') || 'Đang cập nhật'}</span></div>
                <div className="flex items-start gap-2"><span className="text-zinc-500 shrink-0 w-20">Đạo diễn:</span><span className="text-zinc-300">{movie.director || 'Đang cập nhật'}</span></div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col md:flex-row justify-center md:justify-start items-center gap-3 mb-8 w-full">
                {episodes.length > 0 ? (
                  <Link
                    className="inline-flex justify-center items-center gap-2 md:gap-2.5 px-6 md:px-8 py-3.5 md:py-3 text-[#0f111a] text-[15px] md:text-base font-bold rounded-full transition-all hover:scale-105 shadow-lg shadow-[rgba(254,207,89,0.3)] w-[85%] max-w-[340px] md:max-w-none md:w-auto min-w-[140px]"
                    href={`/xem/${movie.slug}?ep=${episodes[0].id}`}
                    onClick={handleRedirectAd}
                    style={{ background: "linear-gradient(39deg, rgb(254, 207, 89), rgb(255, 241, 204))" }}
                  >
                    <svg className="w-5 h-5 md:w-6 md:h-6 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5c0-.8.9-1.3 1.6-.9l9 6c.6.4.6 1.4 0 1.8l-9 6c-.7.4-1.6-.1-1.6-.9V5z"></path></svg>
                    Xem Ngay
                  </Link>
                ) : (
                  <button disabled className="inline-flex justify-center items-center gap-2 md:gap-2.5 px-6 md:px-8 py-3.5 md:py-3 bg-zinc-800 text-zinc-400 text-[15px] md:text-base font-bold rounded-full cursor-not-allowed w-[85%] max-w-[340px] md:max-w-none md:w-auto min-w-[140px]">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                    Sắp chiếu
                  </button>
                )}

                {movie.trailer_url && (
                  <a href={movie.trailer_url} target="_blank" rel="noopener noreferrer" className="hidden md:inline-flex justify-center items-center gap-2 px-6 md:px-7 py-3.5 md:py-3 bg-white/10 hover:bg-white/20 text-white text-[15px] font-medium rounded-full transition-colors w-[85%] max-w-[340px] md:max-w-none md:w-auto min-w-[120px]">
                    Trailer
                  </a>
                )}

                <div className="hidden md:block w-px h-8 bg-white/10 mx-1"></div>

                {/* Desktop Actions */}
                <div className="hidden md:flex items-center gap-2">
                  <button onClick={handleToggleFavorite} className="group/fav flex flex-col items-center justify-center gap-1 transition-all hover:-translate-y-0.5 active:scale-95 px-2" title="Yêu thích">
                    <svg className={`transition-all duration-500 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] w-6 h-6 group-hover/fav:scale-110 ${isFavorited ? 'text-red-500 fill-red-500' : 'text-white/90 fill-none'}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path></svg>
                    <span className="text-[13px] font-medium transition-colors text-white/80 group-hover/fav:text-white">Yêu thích</span>
                  </button>
                  <button onClick={handleOpenFolderModal} className="group/add flex flex-col items-center justify-center gap-1 transition-all hover:-translate-y-0.5 active:scale-95 px-2" title="Thêm vào thư mục">
                    <svg className="transition-all duration-300 w-6 h-6 group-hover/add:scale-110 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"></path></svg>
                    <span className="text-[13px] font-medium transition-colors text-white/80 group-hover/add:text-white">Thêm vào</span>
                  </button>
                  <button className="group/comm flex flex-col items-center justify-center gap-1 transition-all hover:-translate-y-0.5 active:scale-95 px-2" title="Bình luận" onClick={() => {
                    document.getElementById('comment-section')?.scrollIntoView({ behavior: 'smooth' });
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-300 w-6 h-6 text-white/90 group-hover/comm:text-white group-hover/comm:scale-110"><path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"></path></svg>
                    <span className="text-[13px] font-medium text-white/80 group-hover/comm:text-white transition-colors">Bình luận</span>
                  </button>
                </div>

                {/* Mobile Actions */}
                <div className="flex md:hidden gap-5 justify-center pt-2">
                  <button onClick={handleToggleFavorite} className="group/fav flex flex-col items-center justify-center gap-1 transition-all hover:-translate-y-0.5 active:scale-95 px-2" title="Yêu thích">
                    <svg className={`transition-all duration-500 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] w-6 h-6 group-hover/fav:scale-110 ${isFavorited ? 'text-red-500 fill-red-500' : 'text-white/90 fill-none'}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path></svg>
                    <span className="text-[13px] font-medium transition-colors text-white/80 group-hover/fav:text-white">Yêu thích</span>
                  </button>
                  <button onClick={handleOpenFolderModal} className="group/add flex flex-col items-center justify-center gap-1 transition-all hover:-translate-y-0.5 active:scale-95 px-2" title="Thêm vào thư mục">
                    <svg className="transition-all duration-300 w-6 h-6 group-hover/add:scale-110 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"></path></svg>
                    <span className="text-[13px] font-medium transition-colors text-white/80 group-hover/add:text-white">Thêm vào</span>
                  </button>
                  <button className="group/comm flex flex-col items-center justify-center gap-1 transition-all hover:-translate-y-0.5 active:scale-95 px-2" title="Bình luận" onClick={() => {
                    document.getElementById('comment-section')?.scrollIntoView({ behavior: 'smooth' });
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-300 w-6 h-6 text-white/90 group-hover/comm:text-white group-hover/comm:scale-110"><path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"></path></svg>
                    <span className="text-[13px] font-medium text-white/80 group-hover/comm:text-white transition-colors">Bình luận</span>
                  </button>
                </div>
              </div>

              {/* Mobile Info Toggle */}
              <div className="md:hidden w-full mb-6 mt-2 flex flex-col items-center">
                <button
                  onClick={() => setIsMobileInfoOpen(!isMobileInfoOpen)}
                  className="flex items-center gap-2 text-[15px] font-bold mb-2 transition-colors"
                  style={{ color: "rgb(229, 192, 123)" }}
                >
                  Thông tin phim
                  <svg className={`w-4 h-4 transition-transform duration-300 mt-0.5 ${isMobileInfoOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                </button>
                <div className={`w-full text-left transition-all duration-300 overflow-hidden ${isMobileInfoOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="flex flex-wrap items-center gap-2 text-white/90 mb-4 text-left text-[11px]">
                    {(movie.sub_docquyen || (episodes && episodes.some((ep: any) => ep.server_name && (ep.server_name.toLowerCase().includes('subteam') || ep.server_name.toLowerCase().includes('hà nội'))))) && (
                      <span className="bg-[#F5C518] text-[#0f111a] flex items-center gap-1.5 px-2.5 py-1 rounded font-bold uppercase tracking-wider text-[10px] sm:text-[11px]">
                        <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd"></path>
                        </svg>
                        <span>Vietsub độc quyền</span>
                      </span>
                    )}
                    <span className="inline-flex items-center justify-center rounded-[4px] text-[#141414] font-black leading-none tracking-normal h-[22px] px-2" style={{ background: "linear-gradient(220deg, rgb(255, 216, 117) 0%, rgb(255, 231, 168) 45%, rgb(255, 255, 255) 100%)" }}>
                      {movie.quality || 'FHD'}
                    </span>
                    <span className="px-2 py-[3px] rounded border border-white/20 bg-black/20 backdrop-blur-sm font-medium">{movie.language || 'Vietsub'}</span>
                    <span className="px-2 py-[3px] rounded border border-white bg-black/40 font-medium">{displayEpisodeCurrent}</span>
                    {isSongNgu && (
                      <span className="px-2 py-[3px] rounded bg-gradient-to-r from-[#d9b8ff] to-[#9888ff] text-[#1c1c1c] font-bold flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>
                        Song Ngữ
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[13px] mb-5 text-left text-zinc-300">
                    <div className="flex items-start gap-2"><span className="text-zinc-500 shrink-0 w-20">Trạng thái:</span><span>{formatMovieStatus(movie, maxEpisodes)}</span></div>
                    <div className="flex items-start gap-2"><span className="text-zinc-500 shrink-0 w-20">Loại:</span><span>{movie.type === 'phimbo' ? 'Phim Bộ' : 'Phim Lẻ'}</span></div>
                    <div className="flex items-start gap-2"><span className="text-zinc-500 shrink-0 w-20">Năm:</span><span>{movie.year || 'Đang cập nhật'}</span></div>
                    <div className="flex items-start gap-2"><span className="text-zinc-500 shrink-0 w-20">Thời lượng:</span><span>{movie.duration || 'Đang cập nhật'}</span></div>
                    <div className="flex items-start gap-2"><span className="text-zinc-500 shrink-0 w-20">Thể loại:</span><span>{genres.map(g => g.name).join(', ') || 'Đang cập nhật'}</span></div>
                    <div className="flex items-start gap-2"><span className="text-zinc-500 shrink-0 w-20">Quốc gia:</span><span>{countries.map(c => c.name).join(', ') || 'Đang cập nhật'}</span></div>
                    <div className="flex items-start gap-2"><span className="text-zinc-500 shrink-0 w-20">Đạo diễn:</span><span>{movie.director || 'Đang cập nhật'}</span></div>
                  </div>
                  <div className="mb-4 text-left">
                    <h3 className="text-[16px] font-semibold text-white mb-3">Nội dung phim</h3>
                    <div className="text-sm text-zinc-400 leading-relaxed">
                      <p>{movie.description?.replace(/<[^>]*>?/gm, '') || 'Đang cập nhật nội dung phim...'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Showtimes Banner */}
              {movie.showtimes && !(movie.status?.toLowerCase().includes('completed') || movie.status?.toLowerCase().includes('hoàn tất')) && !isShowtimesExpired && (
                <div className="relative mb-6 mt-8" style={{ padding: '0.8rem 1rem 0.8rem 55px', backgroundColor: 'rgb(65, 88, 208)', backgroundImage: 'linear-gradient(90deg, rgb(65, 88, 208), rgb(200, 80, 192))', borderRadius: '0.5rem', color: 'rgb(255, 255, 255)' }}>
                  <div className="absolute flex items-center justify-center rounded-full bg-black/20" style={{ left: '10px', top: '10px', width: '36px', height: '36px', overflow: 'visible' }}>
                    <img alt="Alarm" loading="lazy" width={56} height={56} decoding="async" className="object-contain" src="/gif/alarm.gif" style={{ color: 'transparent', width: '44px', height: '44px', position: 'relative', zIndex: 1 }} />
                  </div>
                  <div className="flex items-center justify-between gap-4 min-h-[36px]">
                    <p className="text-[14px] md:text-[15px] leading-snug" dangerouslySetInnerHTML={{ __html: displayShowtimesText }}></p>

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

              {/* Tabs Container */}
              <div className="mt-2">
                <div className="mt-10">
                  {/* Tab Headers */}
                  <div className="flex items-center gap-6 border-b border-white/10 mb-6 overflow-x-auto scrollbar-hide">
                    <button onClick={() => setActiveTab('episodes')} className={`pb-3 text-[13px] md:text-[15px] font-semibold transition-colors relative whitespace-nowrap ${activeTab === 'episodes' ? 'text-[#F5C518]' : 'text-zinc-500 hover:text-white'}`}>
                      Tập phim
                      {activeTab === 'episodes' && <span className="absolute bottom-0 left-0 w-full h-[2px] bg-[#F5C518] rounded-t-md"></span>}
                    </button>
                    <button onClick={() => setActiveTab('gallery')} className={`pb-3 text-[13px] md:text-[15px] font-semibold transition-colors relative whitespace-nowrap ${activeTab === 'gallery' ? 'text-[#F5C518]' : 'text-zinc-500 hover:text-white'}`}>
                      Gallery
                      {activeTab === 'gallery' && <span className="absolute bottom-0 left-0 w-full h-[2px] bg-[#F5C518] rounded-t-md"></span>}
                    </button>
                    <button onClick={() => setActiveTab('actors')} className={`pb-3 text-[13px] md:text-[15px] font-semibold transition-colors relative whitespace-nowrap ${activeTab === 'actors' ? 'text-[#F5C518]' : 'text-zinc-500 hover:text-white'}`}>
                      Diễn viên
                      {activeTab === 'actors' && <span className="absolute bottom-0 left-0 w-full h-[2px] bg-[#F5C518] rounded-t-md"></span>}
                    </button>
                    <button onClick={() => setActiveTab('recommendations')} className={`pb-3 text-[13px] md:text-[15px] font-semibold transition-colors relative whitespace-nowrap ${activeTab === 'recommendations' ? 'text-[#F5C518]' : 'text-zinc-500 hover:text-white'}`}>
                      Đề xuất
                      {activeTab === 'recommendations' && <span className="absolute bottom-0 left-0 w-full h-[2px] bg-[#F5C518] rounded-t-md"></span>}
                    </button>
                  </div>

                  {/* Tab Contents */}
                  <div className="min-h-[200px]">

                    {/* Episodes Tab */}
                    {activeTab === 'episodes' && (
                      <div className="animate-in fade-in duration-300">
                        {episodes.length > 0 ? (
                          (movie.type === 'phimle' || (episodes.length > 0 && !episodes.some(ep => {
                            const name = ep.name || '';
                            const num = parseInt(name.replace(/\D/g, ''), 10);
                            return !isNaN(num) && num > 1;
                          }))) ? (
                            <div className="animate-in fade-in duration-300">
                              <h3 className="text-xl md:text-2xl font-bold text-white mb-6 leading-tight">Các bản chiếu</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {episodes.map(ep => {
                                  const isVietsub = ep.server_name.toLowerCase().includes('vietsub');
                                  const posterUrl = getProxyImageUrl(getPosterUrl(movie));

                                  return (
                                    <Link
                                      key={ep.id}
                                      className="relative rounded-2xl overflow-hidden min-h-[140px] md:min-h-[160px] shadow-lg group text-left transition-all block"
                                      href={`/xem/${movie.slug}?ep=${ep.id}`}
                                      onClick={handleRedirectAd}
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
                                            {movie.title}
                                          </div>
                                        </div>
                                        <div className="mt-4">
                                          <span className="inline-flex items-center gap-2 text-[12px] md:text-[13px] font-medium py-2 md:py-2.5 px-4 md:px-5 rounded-md shadow-md transition-all bg-white text-black hover:bg-gray-100 hover:scale-[1.02] active:scale-[0.98]">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-play w-3.5 h-3.5 fill-current" aria-hidden="true"><path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"></path></svg>
                                            Xem bản này
                                          </span>
                                        </div>
                                      </div>
                                    </Link>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-6">
                                <div className="flex items-center gap-1.5 text-[13px] font-semibold text-white/50 mr-1">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-server w-4 h-4" aria-hidden="true">
                                    <rect width="20" height="8" x="2" y="2" rx="2" ry="2"></rect>
                                    <rect width="20" height="8" x="2" y="14" rx="2" ry="2"></rect>
                                    <line x1="6" x2="6.01" y1="6" y2="6"></line>
                                    <line x1="6" x2="6.01" y1="18" y2="18"></line>
                                  </svg>
                                  Máy chủ:
                                </div>
                                {serverKeys.map(key => {
                                  const isSelected = currentServerKey === key;
                                  const serverInfo = groupedServers[key];
                                  const isVietsub = key.toLowerCase().includes('vietsub');
                                  const isSongNguEdition = key.toLowerCase().includes('song ngữ') || key.toLowerCase().includes('songngữ');

                                  return (
                                    <button
                                      key={key}
                                      onClick={() => setSelectedServer(key)}
                                      className={`group flex items-center gap-1.5 text-[13px] transition-colors rounded-md px-3.5 py-2 border ${isSelected ? 'border-white/30 text-white bg-white/5 font-medium' : 'text-white/60 hover:text-white border-transparent bg-white/5'}`}
                                    >
                                      {isSongNguEdition ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-languages w-4 h-4"><path d="m5 8 6 6"></path><path d="m4 14 6-6 2-3"></path><path d="M2 5h12"></path><path d="M7 2h1"></path><path d="m22 22-5-10-5 10"></path><path d="M14 18h6"></path></svg>
                                      ) : isVietsub ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-captions w-4 h-4"><rect width="18" height="14" x="3" y="5" rx="2" ry="2"></rect><path d="M7 15h4M15 15h2M7 11h2M13 11h4"></path></svg>
                                      ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-mic w-4 h-4"><path d="M12 19v3"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><rect x="9" y="2" width="6" height="13" rx="3"></rect></svg>
                                      )}
                                      <span>{cleanServerIndicator(key)}</span>
                                      <span className={`flex items-center justify-center w-[20px] h-[20px] rounded-full font-bold text-[10px] ml-1 shrink-0 transition-colors ${isSelected ? 'bg-white text-black' : 'bg-white/10 text-white/50 group-hover:text-white/80'}`}>
                                        {serverInfo.episodes.length}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-x-2.5 gap-y-2.5">
                                {currentServer?.episodes.map(ep => {
                                  const epData = ep.data;
                                  return (
                                    <Link
                                      key={epData.id}
                                      href={`/xem/${movie.slug}?ep=${epData.id}`}
                                      onClick={handleRedirectAd}
                                      className="group flex items-center justify-center gap-1.5 rounded-lg transition-all py-2.5 px-2 text-[13px] bg-[#191b24] text-white/90 hover:text-[#FFD166] shadow-sm"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-play shrink-0 w-3 h-3 fill-white/80 group-hover:fill-[#FFD166]"><path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"></path></svg>
                                      {epData.name.toLowerCase().includes('tập') || isNaN(Number(epData.name.trim())) ? epData.name : 'Tập ' + epData.name.trim()}
                                    </Link>
                                  );
                                })}
                              </div>
                            </>
                          )
                        ) : (
                          <div className="text-center py-12 text-zinc-500 border border-dashed border-zinc-800 rounded-2xl">
                            <p className="text-sm">Phim chưa cập nhật tập nào.</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Gallery Tab */}
                    {activeTab === 'gallery' && (
                      <div className="animate-in fade-in duration-300">
                        {gallery && gallery.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {gallery.map((imgUrl, idx) => (
                              <div
                                key={idx}
                                onClick={() => setSelectedGalleryIndex(idx)}
                                className="relative aspect-video rounded-xl overflow-hidden group/img bg-[#16161e] border border-white/5 shadow-md cursor-pointer hover:shadow-xl hover:shadow-[#F5C518]/10 hover:border-[#F5C518]/30 transition-all duration-300"
                              >
                                <img
                                  src={getProxyImageUrl(imgUrl, 640)}
                                  alt={`${movie.title} screenshot ${idx + 1}`}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                  loading="lazy"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-8 h-8 text-white drop-shadow-lg scale-90 group-hover:scale-100 transition-all duration-300">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z" />
                                  </svg>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-zinc-500 text-sm py-10">
                            Chưa có hình ảnh nào cho phim này.
                          </div>
                        )}
                      </div>
                    )}

                    {/* Actors Tab */}
                    {activeTab === 'actors' && (
                      <div className="animate-in fade-in duration-300">
                        {actors.length > 0 ? (
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-x-4 gap-y-6">
                            {actors.map(actor => (
                              <ActorCard
                                key={actor.id}
                                actor={actor}
                                size="large"
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="text-zinc-500 text-sm py-10">
                            Chưa có thông tin diễn viên.
                          </div>
                        )}
                      </div>
                    )}

                    {/* Recommendations Tab */}
                    {activeTab === 'recommendations' && (
                      <div className="animate-in fade-in duration-300">
                        <div className="py-2">
                          <h3 className="text-xl md:text-2xl font-bold text-white/90 mb-6">Có thể bạn sẽ thích</h3>
                          {recommendations.length === 0 ? (
                            <div className="text-zinc-500 text-sm py-10 text-center">Không có phim đề xuất nào.</div>
                          ) : (
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                              {recommendations.map((rec: any) => {
                                const poster = getProxyImageUrl(getPosterUrl(rec), 300);

                                const langLower = (rec.language || '').toLowerCase();
                                const isSongNgu = langLower.includes('song ngữ');
                                const hasVietsub = langLower.includes('vietsub');
                                const hasThuyetMinh = langLower.includes('thuyết minh') || langLower.includes('thuyếtminh');
                                const hasLongTieng = langLower.includes('lồng tiếng') || langLower.includes('lồngtiếng');

                                const epNumMatch = (rec.episode_current || '').match(/\d+/);
                                const epLabel = epNumMatch ? epNumMatch[0] : (rec.episode_current ? rec.episode_current.replace(/tập/i, '').trim() : '');

                                return (
                                  <div key={rec.id} className="relative movie-card-wrapper">
                                    <Link className="movie-card block group" href={`/phim/${rec.slug}`}>
                                      <div className="relative rounded-lg overflow-hidden bg-[#1b1d26] aspect-[2/3] ring-1 ring-white/5 shadow-md flex items-center justify-center">
                                        <svg className="absolute w-12 h-12 text-white/10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"></path></svg>

                                        <img
                                          alt={rec.title}
                                          loading="lazy"
                                          className="object-cover transition-transform duration-500 relative z-10 w-full h-full group-hover:scale-105"
                                          src={poster}
                                        />

                                        {isSongNgu && (
                                          <div className="pointer-events-none absolute right-1.5 top-1.5 z-40 flex items-center gap-1 rounded-[4px] px-2 py-0.5 text-[9px] font-bold text-[#141414] shadow-sm md:right-2 md:top-2 md:text-[10px]" style={{ backgroundImage: "linear-gradient(220deg, rgb(139, 92, 246) 0%, rgb(196, 181, 253) 70%, rgb(255, 255, 255) 100%)" }}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-languages h-2.5 w-2.5 shrink-0 text-[#141414] md:h-3 md:w-3"><path d="m5 8 6 6"></path><path d="m4 14 6-6 2-3"></path><path d="M2 5h12"></path><path d="M7 2h1"></path><path d="m22 22-5-10-5 10"></path><path d="M14 18h6"></path></svg>
                                            <span>Song Ngữ</span>
                                          </div>
                                        )}

                                        <div className="absolute inset-x-0 bottom-0 flex items-end pb-1.5 md:pb-0 pointer-events-none justify-center">
                                          <div className="flex z-10 w-full flex-col md:flex-row md:flex-nowrap gap-1 md:gap-0 items-start md:items-end justify-start pl-1 sm:pl-2 md:pl-0 md:justify-center">
                                            {hasVietsub && (
                                              <span className="text-[9px] md:text-[10.5px] px-1.5 md:px-2.5 py-[1px] md:py-[3px] rounded-full text-white backdrop-blur-sm shadow-sm md:rounded-none whitespace-nowrap md:first:rounded-tl-md md:last:rounded-tr-md bg-[#5E6070]/95">
                                                <span className="font-normal md:font-bold">PĐ.</span><span className="font-bold"> {epLabel || 'Full'}</span>
                                              </span>
                                            )}
                                            {hasThuyetMinh && (
                                              <span className="text-[9px] md:text-[10.5px] px-1.5 md:px-2.5 py-[1px] md:py-[3px] rounded-full text-white backdrop-blur-sm shadow-sm md:rounded-none whitespace-nowrap md:first:rounded-tl-md md:last:rounded-tr-md bg-[#2CA35D]/95">
                                                <span className="font-normal md:font-bold">TM.</span><span className="font-bold"> {epLabel || 'Full'}</span>
                                              </span>
                                            )}
                                            {hasLongTieng && (
                                              <span className="text-[9px] md:text-[10.5px] px-1.5 md:px-2.5 py-[1px] md:py-[3px] rounded-full text-white backdrop-blur-sm shadow-sm md:rounded-none whitespace-nowrap md:first:rounded-tl-md md:last:rounded-tr-md bg-[#1667CF]/95">
                                                <span className="font-normal md:font-bold">LT.</span><span className="font-bold"> {epLabel || 'Full'}</span>
                                              </span>
                                            )}
                                            {!hasVietsub && !hasThuyetMinh && !hasLongTieng && epLabel && (
                                              <span className="text-[9px] md:text-[10.5px] px-1.5 md:px-2.5 py-[1px] md:py-[3px] rounded-full text-white backdrop-blur-sm shadow-sm md:rounded-none whitespace-nowrap md:first:rounded-tl-md md:last:rounded-tr-md bg-[#5E6070]/95">
                                                <span className="font-bold">Tập {epLabel}</span>
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        <div className="overlay absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                                      </div>
                                      <div className="text-center px-1 mt-2">
                                        <h3 className="text-[12px] sm:text-[13px] font-semibold text-white/90 truncate group-hover:text-[#FFD166] transition-colors">{rec.title}</h3>
                                        <p className="text-[10px] sm:text-[11px] text-zinc-500 mt-0.5 truncate">{rec.original_title || rec.title}</p>
                                      </div>
                                    </Link>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ──────────────── Comments Section ──────────────── */}
          <div id="comment-section" className="mt-10 border-t border-white/10 pt-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center gap-2.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-circle w-6 h-6 text-white fill-white"><path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"></path></svg>
                <h2 className="text-xl font-bold text-white">Bình luận <span className="text-white/60">({comments.length})</span></h2>
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
              {comments.length > 0 ? (
                <>
                  {[...comments]
                    .sort((a: any, b: any) => {
                      if (b.is_pinned && !a.is_pinned) return 1;
                      if (!b.is_pinned && a.is_pinned) return -1;
                      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                    })
                    .map((c: any) => {
                      const avatarSrc = getAvatarSrc(c.users?.avatar);
                      const isRevealed = revealedSpoilers.has(c.id);
                      return (
                        <div key={c.id} className={c.is_pinned ? "py-3 sm:py-5 bg-[#FFD166]/[0.04] border border-[#FFD166]/15 rounded-xl px-3 sm:px-4 my-1.5 transition-all duration-1000" : "py-3 sm:py-5 border-b border-white/5 last:border-b-0 transition-all duration-1000"}>
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
                                  {c.users?.name || 'Unknown'}
                                </span>
                                {c.users.role === 'admin' && (
                                  <img alt="emoji" loading="lazy" width="20" height="20" className="w-[18px] h-[18px] sm:w-[20px] sm:h-[20px] object-contain shrink-0" src="/gif/03.gif" />
                                )}
                                {c.users.user_labels && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold border" style={{ backgroundColor: `${c.users.user_labels.color}20`, color: c.users.user_labels.color, borderColor: `${c.users.user_labels.color}40` }}>
                                    {c.users.user_labels.name}
                                  </span>
                                )}
                                {(c.users as any).gender === 'Nữ' ? (
                                  <span className="text-pink-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-venus w-4 h-4" aria-hidden="true"><path d="M12 15v7" /><path d="M9 19h6" /><circle cx="12" cy="9" r="6" /></svg>
                                  </span>
                                ) : (c.users as any).gender === 'Nam' ? (
                                  <span className="text-blue-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-mars w-5 h-5" aria-hidden="true"><path d="M16 3h5v5" /><path d="m21 3-6.75 6.75" /><circle cx="10" cy="14" r="6" /></svg>
                                  </span>
                                ) : (
                                  <span className="text-white/30">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-infinity w-4 h-4" aria-hidden="true"><path d="M6 16c5 0 7-8 12-8a4 4 0 0 1 0 8c-5 0-7-8-12-8a4 4 0 1 0 0 8" /></svg>
                                  </span>
                                )}

                                {/* Admin-only: real commenter hint */}
                                {c.real_user && currentUser?.role === 'admin' && (
                                  <span className="text-[10px] text-zinc-600 italic ml-1">
                                    (thực: {c.real_user.name})
                                  </span>
                                )}
                                <span className="text-[11px] sm:text-[12px] text-zinc-500 ml-1">
                                  {formatTime(c.created_at)}
                                </span>
                              </div>
                              <div className="mt-1.5">
                                {c.content && (
                                  <div
                                    className={`relative text-[#AAAAAA] leading-[1.7] whitespace-pre-wrap break-words mb-2 sm:mb-2.5 text-[12px] sm:text-[13px] transition-all duration-300 ${c.is_spoiler && !isRevealed ? 'blur-sm select-none cursor-pointer' : ''}`}
                                    onClick={() => {
                                      if (c.is_spoiler && !isRevealed) {
                                        setRevealedSpoilers(prev => {
                                          const newSet = new Set(prev);
                                          newSet.add(c.id);
                                          return newSet;
                                        });
                                      }
                                    }}
                                  >
                                    <span>{c.content}</span>
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
                              <div className="flex items-center gap-3">
                                <button className="flex items-center gap-1.5 rounded-full text-xs transition-colors text-zinc-500 hover:text-white">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-thumbs-up w-4 h-4"><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"></path><path d="M7 10v12"></path></svg>
                                </button>
                                <button className="flex items-center gap-1 rounded-full text-xs transition-colors text-zinc-500 hover:text-white">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-thumbs-down w-4 h-4"><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"></path><path d="M17 14V2"></path></svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  {comments.length > 5 && (
                    <div className="flex justify-center gap-3 mt-4">
                      <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sm text-white/70 hover:text-white transition-all">
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
      {/* Lightbox Modal for Gallery */}
      {selectedGalleryIndex !== null && gallery[selectedGalleryIndex] && (
        <div
          className="fixed inset-0 z-[10000] bg-black/95 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-300"
          onClick={() => setSelectedGalleryIndex(null)}
        >
          {/* Close button */}
          <button
            onClick={() => setSelectedGalleryIndex(null)}
            className="absolute top-6 right-6 z-[10010] p-2 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-full transition-all border-none cursor-pointer"
            title="Đóng (Esc)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Prev button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedGalleryIndex(prev => (prev !== null && prev > 0) ? prev - 1 : gallery.length - 1);
            }}
            className="absolute left-6 z-[10010] p-3 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-full transition-all border-none cursor-pointer"
            title="Ảnh trước (ArrowLeft)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>

          {/* Next button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedGalleryIndex(prev => (prev !== null && prev < gallery.length - 1) ? prev + 1 : 0);
            }}
            className="absolute right-6 z-[10010] p-3 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-full transition-all border-none cursor-pointer"
            title="Ảnh sau (ArrowRight)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>

          {/* Image Container */}
          <div
            className="relative max-w-[90vw] max-h-[85vh] flex flex-col items-center justify-center select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={getProxyImageUrl(gallery[selectedGalleryIndex], 1200)}
              alt={`${movie.title} screenshot ${selectedGalleryIndex + 1}`}
              className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl border border-white/10 animate-in zoom-in-95 duration-300"
            />
            {/* Image counter / indicator */}
            <div className="mt-4 px-4 py-1.5 bg-white/10 text-white rounded-full text-xs font-semibold backdrop-blur-sm">
              {selectedGalleryIndex + 1} / {gallery.length}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
