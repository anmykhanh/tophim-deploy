'use client';

import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import TiptapEditor from '@/components/TiptapEditor';
import Link from 'next/link';
import AdminArticlesTab from './AdminArticlesTab';
import AdminArticleCommentsTab from './AdminArticleCommentsTab';
import AdminRolesTab from './AdminRolesTab';
import AdminServersTab from './AdminServersTab';

interface AdminDashboardClientProps {
  stats: {
    totalMovies: number;
    totalUsers: number;
    totalComments: number;
    pendingReports: number;
    pendingRequests: number;
    totalEpisodes: number;
    onlineCount?: number;
    todayUsersCount?: number;
  };
  recentComments: any[];
  recentReports: any[];
  initialSettings: Record<string, string>;
  currentUser: any;
  allCategories?: any[];
}

export default function AdminDashboardClient({
  stats,
  recentComments: initialRecentComments,
  recentReports: initialRecentReports,
  initialSettings,
  currentUser,
  allCategories = [],
}: AdminDashboardClientProps) {
  const permissions = currentUser?.permissions || [];
  const hasPerm = useCallback((perm: string) => permissions.includes(perm), [permissions]);

  const formatCronTime = (isoString?: string) => {
    if (!isoString) return 'Chưa chạy lần nào';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (e) {
      return isoString;
    }
  };

  const [activeTab, setActiveTab] = useState<'dashboard' | 'movies' | 'nominations' | 'episodes' | 'comments' | 'users' | 'roles' | 'crawler' | 'settings' | 'sendmail' | 'categories' | 'notifications' | 'error_reports' | 'quang-cao' | 'contacts' | 'seo' | 'labels' | 'requests' | 'articles' | 'article-comments' | 'servers' | 'edit-movie'>('dashboard');

  // --- Dashboard View Stats State ---
  const [viewStatsRange, setViewStatsRange] = useState<'today' | 'week' | 'month' | 'year' | 'all'>('all');
  const [dashboardStats, setDashboardStats] = useState<{
    totalViews: number;
    topMovies: any[];
    recentlyUpdated: any[];
    onlineCount: number;
    todayUsersCount: number;
  }>({
    totalViews: 0,
    topMovies: [],
    recentlyUpdated: [],
    onlineCount: stats.onlineCount || 0,
    todayUsersCount: stats.todayUsersCount || 0
  });
  const [isDashboardStatsLoading, setIsDashboardStatsLoading] = useState(false);

  const loadDashboardStats = async () => {
    setIsDashboardStatsLoading(true);
    try {
      const res = await fetch(`/api/admin/stats?range=${viewStatsRange}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setDashboardStats({
            totalViews: data.totalViews,
            topMovies: data.topMovies || [],
            recentlyUpdated: data.recentlyUpdated || [],
            onlineCount: data.onlineCount ?? stats.onlineCount ?? 0,
            todayUsersCount: data.todayUsersCount ?? stats.todayUsersCount ?? 0
          });
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      setIsDashboardStatsLoading(false);
    }
  };

  // --- Error Reports Tab State ---
  const [errorReportsList, setErrorReportsList] = useState<any[]>([]);
  const [isReportsLoading, setIsReportsLoading] = useState(false);

  // --- Movie Requests Tab State ---
  const [requestsList, setRequestsList] = useState<any[]>([]);
  const [isRequestsLoading, setIsRequestsLoading] = useState(false);
  const [requestsFilter, setRequestsFilter] = useState<'pending' | 'completed' | 'rejected'>('pending');

  // --- Contacts Tab State ---
  const [contactsList, setContactsList] = useState<any[]>([]);
  const [contactsTotal, setContactsTotal] = useState(0);
  const [contactsPage, setContactsPage] = useState(1);
  const [isContactsLoading, setIsContactsLoading] = useState(false);

  // --- Global State ---
  const [settings, setSettings] = useState<Record<string, string>>(initialSettings);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // --- Movies Tab State ---
  const [moviesList, setMoviesList] = useState<any[]>([]);
  const [moviesTotal, setMoviesTotal] = useState(0);
  const [moviesPage, setMoviesPage] = useState(1);
  const [moviesSearch, setMoviesSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [isMoviesLoading, setIsMoviesLoading] = useState(false);
  const [currentMovie, setCurrentMovie] = useState<any>(null); // null for create, object for edit
  const [movieServers, setMovieServers] = useState<string[]>([]);
  const [tmdbPosters, setTmdbPosters] = useState<string[]>([]);
  const [tmdbThumbs, setTmdbThumbs] = useState<string[]>([]);
  const [tmdbLogos, setTmdbLogos] = useState<string[]>([]);

  useEffect(() => {
    if (activeTab === 'edit-movie' && currentMovie) {
      // Fetch episodes
      fetch(`/api/admin/episodes?movie_id=${currentMovie.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.episodes) {
            const uniqueServers = Array.from(new Set(data.episodes.map((ep: any) => ep.server_name)));
            setMovieServers(uniqueServers as string[]);
          }
        })
        .catch(console.error);

      // Fetch images for selection if it's a TMDB movie
      if (currentMovie.tmdb_id) {
        fetch(`/api/admin/movies/images?tmdb_id=${currentMovie.tmdb_id}&type=${currentMovie.type}`)
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              const { posters, thumbs, logos } = data;
              if (posters) setTmdbPosters(posters);
              if (thumbs) setTmdbThumbs(thumbs);
              if (logos) setTmdbLogos(logos);
            }
          })
          .catch(console.error);
      }
    } else {
      setMovieServers([]);
    }
    
    if (activeTab !== 'edit-movie') {
      setTmdbPosters([]);
      setTmdbThumbs([]);
      setTmdbLogos([]);
    }
  }, [activeTab, currentMovie]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [banUser, setBanUser] = useState<any>(null);
  const [mailTargetUser, setMailTargetUser] = useState<any>(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailContent, setEmailContent] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // --- Admin Notifications Tab State ---
  const [adminNotifications, setAdminNotifications] = useState<any[]>([]);
  const [isAdminNotifLoading, setIsAdminNotifLoading] = useState(false);

  // --- Send Mail Tab State ---
  const [mailTabTarget, setMailTabTarget] = useState('all');
  const [mailTabCustomEmail, setMailTabCustomEmail] = useState('');
  const [mailTabSubject, setMailTabSubject] = useState('');
  const [mailTabContent, setMailTabContent] = useState('');
  const [isSendingMailTab, setIsSendingMailTab] = useState(false);

  // --- Nominations Tab State ---
  const [nominationsList, setNominationsList] = useState<any[]>([]);
  const [nominationsTotal, setNominationsTotal] = useState(0);
  const [nominationsPage, setNominationsPage] = useState(1);
  const [isNominationsLoading, setIsNominationsLoading] = useState(false);

  // --- Categories Tab State ---
  const [categoriesList, setCategoriesList] = useState<any[]>(allCategories);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(false);
  const [categoryActiveTab, setCategoryActiveTab] = useState<'genre' | 'country' | 'collection' | 'schedule'>('genre');
  const [settingsActiveTab, setSettingsActiveTab] = useState<'website' | 'google' | 'smtp' | 'advanced' | 'popup'>('website');
  const [isSyncingCategories, setIsSyncingCategories] = useState(false);

  // Inline Category Form State
  const [catFormId, setCatFormId] = useState<number | null>(null);
  const [catFormName, setCatFormName] = useState('');
  const [catFormSlug, setCatFormSlug] = useState('');
  const [catFormDescription, setCatFormDescription] = useState('');
  const [catFormColor, setCatFormColor] = useState('');
  const [catFormOrder, setCatFormOrder] = useState(0);
  const [catFormStatus, setCatFormStatus] = useState(true);

  // --- Labels Tab State ---
  const [labelsList, setLabelsList] = useState<any[]>([]);
  const [isLabelsLoading, setIsLabelsLoading] = useState(false);
  const [labelFormId, setLabelFormId] = useState<number | null>(null);
  const [labelFormName, setLabelFormName] = useState('');
  const [labelFormColor, setLabelFormColor] = useState('#FFD700');



  const handleSaveLabel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!labelFormName.trim() || !labelFormColor.trim()) return;

    try {
      const method = labelFormId ? 'PUT' : 'POST';
      const body = { id: labelFormId, name: labelFormName, color: labelFormColor };
      const res = await fetch('/api/admin/labels', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(labelFormId ? 'Cập nhật nhãn thành công!' : 'Thêm nhãn thành công!');
        setLabelFormId(null);
        setLabelFormName('');
        setLabelFormColor('#FFD700');
        loadLabels();
      } else {
        alert(data.error || 'Có lỗi xảy ra.');
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi kết nối.');
    }
  };

  const handleDeleteLabel = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa nhãn này?')) return;
    try {
      const res = await fetch(`/api/admin/labels?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        alert('Xóa nhãn thành công!');
        loadLabels();
      } else {
        alert(data.error || 'Có lỗi xảy ra.');
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi kết nối.');
    }
  };

  // Run loadLabels when activeTab becomes labels
  useEffect(() => {
    if (activeTab === 'labels') {
      loadLabels();
    }
  }, [activeTab]);


  // --- Episodes Tab State ---
  const [episodesList, setEpisodesList] = useState<any[]>([]);
  const [episodesMovieId, setEpisodesMovieId] = useState<string>('');
  const [episodesMovieTitle, setEpisodesMovieTitle] = useState<string>('');
  const [isEpisodesLoading, setIsEpisodesLoading] = useState(false);
  const [episodeModalOpen, setEpisodeModalOpen] = useState(false);
  const [currentEpisode, setCurrentEpisode] = useState<any>(null);

  // --- Episode Subtitles State ---
  const [episodeSubtitles, setEpisodeSubtitles] = useState<any[]>([]);
  const [newSubLabel, setNewSubLabel] = useState('Vietsub');
  const [newSubLang, setNewSubLang] = useState('vi');
  const [newSubUrl, setNewSubUrl] = useState('');
  const [isUploadingSub, setIsUploadingSub] = useState(false);

  useEffect(() => {
    if (currentEpisode) {
      setEpisodeSubtitles(currentEpisode.episode_subtitles || []);
    } else {
      setEpisodeSubtitles([]);
    }
  }, [currentEpisode]);

  // --- Comments Tab State ---
  const [commentsList, setCommentsList] = useState<any[]>([]);
  const [commentsTotal, setCommentsTotal] = useState(0);
  const [commentsPage, setCommentsPage] = useState(1);
  const [commentsSearch, setCommentsSearch] = useState('');
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);

  // --- Users Tab State ---
  // Users Tab State
  const [usersList, setUsersList] = useState<any[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [usersSearch, setUsersSearch] = useState('');
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [allRoles, setAllRoles] = useState<any[]>([]);

  // User details modal popup state
  const [selectedDetailUser, setSelectedDetailUser] = useState<any>(null);
  const [detailUserLogs, setDetailUserLogs] = useState<any[]>([]);
  const [isDetailUserLogsLoading, setIsDetailUserLogsLoading] = useState(false);
  const [detailUserRole, setDetailUserRole] = useState<string>('user');
  const [detailUserRoleId, setDetailUserRoleId] = useState<number | null>(null);
  const [isSavingDetailUserRole, setIsSavingDetailUserRole] = useState(false);
  const [checkPassInput, setCheckPassInput] = useState<string>('');
  const [checkPassResult, setCheckPassResult] = useState<boolean | null>(null);
  const [isCheckingPassword, setIsCheckingPassword] = useState<boolean>(false);
  const [resetPassInput, setResetPassInput] = useState<string>('');
  const [isResettingPassword, setIsResettingPassword] = useState<boolean>(false);

  // --- Crawler Tab State ---
  const [crawlSource, setCrawlSource] = useState('all');
  const [crawlMode, setCrawlMode] = useState<'range' | 'slug' | 'search'>('range');
  const [crawlSlug, setCrawlSlug] = useState('');
  const [crawlKeyword, setCrawlKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [importingSlugs, setImportingSlugs] = useState<Record<string, 'loading' | 'success' | 'error'>>({});
  const [crawlStartPage, setCrawlStartPage] = useState(1);
  const [crawlEndPage, setCrawlEndPage] = useState(200);
  const [crawlDelayMs, setCrawlDelayMs] = useState(500);
  const [skipExisting, setSkipExisting] = useState(true);

  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentCrawlPage, setCurrentCrawlPage] = useState<number | string>('-');
  const [successCount, setSuccessCount] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [crawlLogs, setCrawlLogs] = useState<string[]>([]);

  // Refs for tracking loop state across renders
  const isRunningRef = useRef(false);
  const isPausedRef = useRef(false);
  const currentPageRef = useRef(1);
  const successCountRef = useRef(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // --- Load Data Helpers ---
  const loadMovies = async () => {
    setIsMoviesLoading(true);
    try {
      const statusParam = filterStatus ? `&status=${filterStatus}` : '';
      const res = await fetch(`/api/admin/movies?page=${moviesPage}&search=${encodeURIComponent(moviesSearch)}${statusParam}`);
      if (res.ok) {
        const data = await res.json();
        setMoviesList(data.movies || []);
        setMoviesTotal(data.total || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsMoviesLoading(false);
    }
  };

  const loadAdminNotifications = async () => {
    setIsAdminNotifLoading(true);
    try {
      const res = await fetch('/api/admin/notifications');
      if (res.ok) {
        const data = await res.json();
        setAdminNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAdminNotifLoading(false);
    }
  };

  const loadErrorReports = async () => {
    setIsReportsLoading(true);
    try {
      const res = await fetch('/api/admin/error-reports');
      if (res.ok) {
        const data = await res.json();
        setErrorReportsList(data.reports || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsReportsLoading(false);
    }
  };

  const handleUpdateReportStatus = async (id: number, status: 'pending' | 'resolved') => {
    try {
      const res = await fetch('/api/admin/error-reports', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(data.message);
        loadErrorReports();
      } else {
        alert(data.error || 'Có lỗi xảy ra.');
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi kết nối.');
    }
  };

  const handleDeleteReport = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa báo cáo lỗi này?')) return;
    try {
      const res = await fetch(`/api/admin/error-reports?id=${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(data.message);
        loadErrorReports();
      } else {
        alert(data.error || 'Có lỗi xảy ra.');
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi kết nối.');
    }
  };

  // --- Movie Requests Tab Actions ---
  const loadRequests = async () => {
    setIsRequestsLoading(true);
    try {
      const res = await fetch(`/api/requests?status=${requestsFilter}`);
      if (res.ok) {
        const data = await res.json();
        setRequestsList(data.requests || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRequestsLoading(false);
    }
  };

  const handleUpdateRequestStatus = async (requestId: number, status: 'completed' | 'rejected') => {
    try {
      const res = await fetch('/api/admin/requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, status })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(data.message);
        loadRequests();
      } else {
        alert(data.error || 'Có lỗi xảy ra.');
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi kết nối.');
    }
  };

  const loadContacts = async () => {
    setIsContactsLoading(true);
    try {
      const res = await fetch(`/api/admin/contacts?page=${contactsPage}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        setContactsList(data.contacts || []);
        setContactsTotal(data.total || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsContactsLoading(false);
    }
  };

  const handleUpdateContactStatus = async (id: number, status: string) => {
    try {
      const res = await fetch('/api/admin/contacts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(data.message);
        loadContacts();
      } else {
        alert(data.error || 'Có lỗi xảy ra.');
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi kết nối.');
    }
  };

  const handleDeleteContact = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa tin nhắn liên hệ này?')) return;
    try {
      const res = await fetch(`/api/admin/contacts?id=${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(data.message);
        loadContacts();
      } else {
        alert(data.error || 'Có lỗi xảy ra.');
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi kết nối.');
    }
  };

  const handleCreateNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const title = formData.get('title') as string;
    const message = formData.get('message') as string;
    const type = formData.get('type') as string;
    const link = formData.get('link') as string;
    const user_id = formData.get('user_id') as string;

    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, message, type, link, user_id })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert('Tạo thông báo thành công!');
        (e.target as HTMLFormElement).reset();
        loadAdminNotifications();
      } else {
        alert(data.error || 'Có lỗi xảy ra.');
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi kết nối.');
    }
  };

  const handleDeleteNotification = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa thông báo này?')) return;
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert('Xóa thông báo thành công!');
        loadAdminNotifications();
      } else {
        alert(data.error || 'Có lỗi xảy ra.');
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi kết nối.');
    }
  };

  const loadNominations = async () => {
    setIsNominationsLoading(true);
    try {
      const res = await fetch(`/api/admin/movies?page=${nominationsPage}&limit=10&is_hot=1`);
      if (res.ok) {
        const data = await res.json();
        setNominationsList(data.movies || []);
        setNominationsTotal(data.total || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsNominationsLoading(false);
    }
  };

  const loadEpisodes = async (movieId: string, movieTitle: string) => {
    setEpisodesMovieId(movieId);
    setEpisodesMovieTitle(movieTitle);
    setIsEpisodesLoading(true);
    setActiveTab('episodes');
    try {
      const res = await fetch(`/api/admin/episodes?movie_id=${movieId}`);
      if (res.ok) {
        const data = await res.json();
        setEpisodesList(data.episodes || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsEpisodesLoading(false);
    }
  };

  const loadComments = async (page = commentsPage) => {
    setIsCommentsLoading(true);
    try {
      const res = await fetch(`/api/admin/comments?page=${page}&search=${encodeURIComponent(commentsSearch)}`);
      if (res.ok) {
        const data = await res.json();
        setCommentsList(data.comments || []);
        setCommentsTotal(data.total || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCommentsLoading(false);
    }
  };

  const loadUsers = async () => {
    setIsUsersLoading(true);
    try {
      const res = await fetch(`/api/admin/users?page=${usersPage}&search=${encodeURIComponent(usersSearch)}`);
      if (res.ok) {
        const data = await res.json();
        setUsersList(data.users || []);
        setUsersTotal(data.total || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUsersLoading(false);
    }
  };

  const loadCategories = async () => {
    setIsCategoriesLoading(true);
    try {
      const res = await fetch('/api/admin/categories');
      if (res.ok) {
        const data = await res.json();
        setCategoriesList(data.categories || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCategoriesLoading(false);
    }
  };

  const loadLabels = async () => {
    setIsLabelsLoading(true);
    try {
      const res = await fetch('/api/admin/labels');
      if (res.ok) {
        const data = await res.json();
        setLabelsList(data.labels || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLabelsLoading(false);
    }
  };

  // --- Effects to trigger loads ---
  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
      if (hasPerm('manage_users') || currentUser.role === 'admin') {
        fetch('/api/admin/roles').then(r => r.json()).then(data => {
          if (Array.isArray(data)) setAllRoles(data);
        }).catch(e => console.error(e));
      }
    }
  }, [activeTab, usersPage, usersSearch]);

  useEffect(() => {
    if (activeTab === 'movies') {
      loadMovies();
    } else if (activeTab === 'comments') {
      loadComments(commentsPage);
    } else if (activeTab === 'nominations') {
      loadNominations();
    } else if (activeTab === 'categories') {
      loadCategories();
    } else if (activeTab === 'notifications') {
      loadAdminNotifications();
    } else if (activeTab === 'error_reports') {
      loadErrorReports();
    } else if (activeTab === 'contacts') {
      loadContacts();
    } else if (activeTab === 'labels') {
      loadLabels();
    } else if (activeTab === 'requests') {
      loadRequests();
    }
  }, [activeTab, moviesPage, commentsPage, usersPage, nominationsPage, filterStatus, contactsPage, requestsFilter]);

  useEffect(() => {
    if (activeTab === 'dashboard') {
      loadDashboardStats();
    }
  }, [activeTab, viewStatsRange]);

  // --- Actions ---

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      alert(data.message || data.error);
    } catch (err) {
      console.error(err);
      alert('Có lỗi xảy ra.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Create/Edit Movie Submit
  const handleTmdbSync = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const form = e.currentTarget.closest('form') as HTMLFormElement;
    if (!form) return;

    const tmdbIdInput = form.elements.namedItem('tmdb_id') as HTMLInputElement;
    if (!tmdbIdInput || !tmdbIdInput.value) {
      alert('Vui lòng nhập TMDB ID để đồng bộ!');
      return;
    }

    const button = e.currentTarget;
    const originalText = button.innerHTML;
    button.innerHTML = '<span class="animate-spin inline-block mr-2">⏳</span> Đang đồng bộ...';
    button.disabled = true;

    setTmdbPosters([]);
    setTmdbThumbs([]);
    setTmdbLogos([]);

    try {
      const typeInput = form.elements.namedItem('type') as HTMLSelectElement;
      const type = typeInput ? typeInput.value : 'phimle';
      const res = await fetch(`/api/admin/movies/tmdb-sync?tmdb_id=${tmdbIdInput.value}&type=${type}`);
      const data = await res.json();

      if (data.success && data.movie) {
        const { movie, actorIds, genres, posters, thumbs, logos } = data;

        if (posters) setTmdbPosters(posters);
        if (thumbs) setTmdbThumbs(thumbs);
        if (logos) setTmdbLogos(logos);

        if (genres && genres.length > 0) {
          const matchedIds = allCategories
            .filter(c => genres.some((g: string) =>
              c.name.toLowerCase() === g.toLowerCase() ||
              c.name.toLowerCase().includes(g.toLowerCase()) ||
              g.toLowerCase().includes(c.name.toLowerCase())
            ))
            .map(c => c.id);

          if (matchedIds.length > 0) {
            setSelectedCategoryIds(prev => Array.from(new Set([...prev, ...matchedIds])));
          }
        }
        if (movie.title && form.elements.namedItem('title')) (form.elements.namedItem('title') as HTMLInputElement).value = movie.title;
        if (movie.original_title && form.elements.namedItem('original_title')) (form.elements.namedItem('original_title') as HTMLInputElement).value = movie.original_title;
        if (movie.description && form.elements.namedItem('description')) (form.elements.namedItem('description') as HTMLTextAreaElement).value = movie.description;
        if (movie.poster_url && form.elements.namedItem('poster_url')) (form.elements.namedItem('poster_url') as HTMLInputElement).value = movie.poster_url;
        if (movie.thumb_url && form.elements.namedItem('thumb_url')) (form.elements.namedItem('thumb_url') as HTMLInputElement).value = movie.thumb_url;
        if (movie.year && form.elements.namedItem('year')) (form.elements.namedItem('year') as HTMLInputElement).value = movie.year;
        if (movie.duration && form.elements.namedItem('duration')) (form.elements.namedItem('duration') as HTMLInputElement).value = movie.duration;
        if (movie.director && form.elements.namedItem('director')) (form.elements.namedItem('director') as HTMLInputElement).value = movie.director;
        if (movie.trailer_url && form.elements.namedItem('trailer_url')) (form.elements.namedItem('trailer_url') as HTMLInputElement).value = movie.trailer_url;

        // Save actorIds to a hidden input
        if (actorIds && actorIds.length > 0) {
          let hiddenInput = form.elements.namedItem('actorIds') as HTMLInputElement;
          if (!hiddenInput) {
            hiddenInput = document.createElement('input');
            hiddenInput.type = 'hidden';
            hiddenInput.name = 'actorIds';
            form.appendChild(hiddenInput);
          }
          hiddenInput.value = JSON.stringify(actorIds);
        }
        alert('Đồng bộ TMDB thành công! Vui lòng kiểm tra lại thông tin và ấn Lưu.');
      } else {
        alert(data.error || 'Đồng bộ thất bại!');
      }
    } catch (err) {
      alert('Lỗi kết nối khi đồng bộ TMDB!');
    } finally {
      button.innerHTML = originalText;
      button.disabled = false;
    }
  };

  const handleMovieSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const movieData: Record<string, any> = {};
    formData.forEach((value, key) => {
      if (key !== 'server_priority') {
        movieData[key] = value;
      }
    });

    const serverPriorities = formData.getAll('server_priority');
    if (serverPriorities.length > 0) {
      movieData['server_priority'] = serverPriorities.join(',');
    } else {
      movieData['server_priority'] = '';
    }

    movieData['is_hot'] = formData.get('is_hot') === 'on';

    try {
      const isEdit = !!currentMovie;
      const method = isEdit ? 'PUT' : 'POST';
      const body = isEdit
        ? { ...movieData, id: currentMovie.id, categoryIds: selectedCategoryIds }
        : { ...movieData, categoryIds: selectedCategoryIds };

      const res = await fetch('/api/admin/movies', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        alert(data.message);
        setActiveTab('movies');
        loadMovies();
      } else {
        alert(data.error || 'Có lỗi xảy ra.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Movie
  const handleDeleteMovie = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa phim này?')) return;
    try {
      const res = await fetch(`/api/admin/movies?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(data.message);
        loadMovies();
        if (activeTab === 'nominations') loadNominations();
      } else {
        alert(data.error || 'Có lỗi xảy ra.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle Nomination status (is_hot)
  const handleToggleHot = async (movie: any) => {
    try {
      const res = await fetch('/api/admin/movies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: movie.id, is_hot: !movie.is_hot })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (activeTab === 'movies') {
          setMoviesList(prev => prev.map(m => m.id === movie.id ? { ...m, is_hot: !m.is_hot } : m));
        } else {
          loadNominations();
        }
      } else {
        alert(data.error || 'Lỗi.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Create/Edit Episode Submit
  const handleEpisodeSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const epData: Record<string, any> = {
      movie_id: episodesMovieId
    };
    formData.forEach((value, key) => {
      epData[key] = value;
    });

    try {
      const isEdit = !!currentEpisode;
      const method = isEdit ? 'PUT' : 'POST';
      const body = isEdit ? { ...epData, id: currentEpisode.id } : epData;

      const res = await fetch('/api/admin/episodes', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        alert(data.message);
        setEpisodeModalOpen(false);
        loadEpisodes(episodesMovieId, episodesMovieTitle);
      } else {
        alert(data.error || 'Có lỗi xảy ra.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- Manage Episode Subtitles ---
  const handleAddSubtitle = async () => {
    if (!newSubLabel.trim() || !newSubLang.trim() || !newSubUrl.trim() || !currentEpisode) return;

    try {
      const res = await fetch('/api/admin/subtitles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          episode_id: currentEpisode.id,
          label: newSubLabel,
          language: newSubLang,
          url: newSubUrl
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setEpisodeSubtitles(prev => [...prev, data.subtitle]);
        setNewSubUrl('');
        // Update local episodesList
        setEpisodesList(prev => prev.map(ep => {
          if (ep.id === currentEpisode.id) {
            return {
              ...ep,
              episode_subtitles: [...(ep.episode_subtitles || []), data.subtitle]
            };
          }
          return ep;
        }));
      } else {
        alert(data.error || 'Có lỗi xảy ra.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSubtitle = async (subId: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa phụ đề này?')) return;

    try {
      const res = await fetch(`/api/admin/subtitles?id=${subId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setEpisodeSubtitles(prev => prev.filter(s => s.id !== subId));
        // Update local episodesList
        setEpisodesList(prev => prev.map(ep => {
          if (ep.id === currentEpisode.id) {
            return {
              ...ep,
              episode_subtitles: (ep.episode_subtitles || []).filter((s: any) => s.id !== subId)
            };
          }
          return ep;
        }));
      } else {
        alert(data.error || 'Có lỗi xảy ra.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingSub(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/upload/subtitle', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNewSubUrl(data.url);
      } else {
        alert(data.error || 'Lỗi khi upload phụ đề.');
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi kết nối.');
    } finally {
      setIsUploadingSub(false);
      e.target.value = '';
    }
  };

  // Delete Episode
  const handleDeleteEpisode = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa tập phim này?')) return;
    try {
      const res = await fetch(`/api/admin/episodes?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(data.message);
        loadEpisodes(episodesMovieId, episodesMovieTitle);
      } else {
        alert(data.error || 'Có lỗi xảy ra.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle Comment Visibility Status
  const handleToggleCommentStatus = async (id: number, currentStatus: boolean) => {
    try {
      const res = await fetch('/api/admin/comments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: !currentStatus })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCommentsList(prev => prev.map(c => c.id === id ? { ...c, status: !currentStatus } : c));
      } else {
        alert(data.error || 'Lỗi.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Comment
  const handleDeleteComment = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa bình luận này?')) return;
    try {
      const res = await fetch(`/api/admin/comments?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        setCommentsList(prev => prev.filter(c => c.id !== id));
      } else {
        alert(data.error || 'Lỗi.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Change User Role
  const handleChangeUserRole = async (id: number, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    if (!confirm(`Bạn có chắc muốn đổi vai trò của thành viên này thành ${newRole.toUpperCase()}?`)) return;

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, role: newRole, role_id: null })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUsersList(prev => prev.map(u => u.id === id ? { ...u, role: newRole, role_id: null } : u));
        alert(data.message);
      } else {
        alert(data.error || 'Lỗi.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete User
  const handleDeleteUser = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa thành viên này?')) return;
    try {
      const res = await fetch(`/api/admin/users?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        setUsersList(prev => prev.filter(u => u.id !== id));
        alert(data.message);
      } else {
        alert(data.error || 'Lỗi.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleViewUserDetails = async (user: any) => {
    setSelectedDetailUser(user);
    setDetailUserRole(user.role);
    setDetailUserRoleId(user.role_id || null);
    setDetailUserLogs([]);
    setIsDetailUserLogsLoading(true);
    setCheckPassInput('');
    setCheckPassResult(null);
    setResetPassInput('');
    try {
      const res = await fetch(`/api/admin/users?userId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setDetailUserLogs(data.logs || []);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDetailUserLogsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDetailUser || !resetPassInput.trim()) return;
    if (resetPassInput.length < 6) {
      alert('Mật khẩu mới phải chứa ít nhất 6 ký tự!');
      return;
    }
    if (!confirm(`Bạn có chắc muốn đặt lại mật khẩu mới cho ${selectedDetailUser.name}?`)) return;

    setIsResettingPassword(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedDetailUser.id, password: resetPassInput })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert('Đặt lại mật khẩu thành công!');
        setResetPassInput('');
      } else {
        alert(data.error || 'Có lỗi xảy ra khi đặt lại mật khẩu.');
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi kết nối.');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleCheckPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDetailUser || !checkPassInput.trim()) return;
    setIsCheckingPassword(true);
    setCheckPassResult(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedDetailUser.id, password: checkPassInput })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCheckPassResult(data.isValid);
      } else {
        alert(data.error || 'Có lỗi xảy ra khi kiểm tra mật khẩu.');
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi kết nối.');
    } finally {
      setIsCheckingPassword(false);
    }
  };

  const handleUpdateDetailUserRole = async () => {
    if (!selectedDetailUser) return;
    setIsSavingDetailUserRole(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedDetailUser.id,
          role: detailUserRole,
          role_id: detailUserRole === 'user' ? detailUserRoleId : null
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(data.message || 'Cập nhật vai trò thành công!');
        // Update user in usersList
        setUsersList(prev => prev.map(u => u.id === selectedDetailUser.id ? { ...u, role: detailUserRole, role_id: detailUserRole === 'user' ? detailUserRoleId : null } : u));
        setSelectedDetailUser((prev: any) => prev ? { ...prev, role: detailUserRole, role_id: detailUserRole === 'user' ? detailUserRoleId : null } : null);
      } else {
        alert(data.error || 'Có lỗi xảy ra.');
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi kết nối.');
    } finally {
      setIsSavingDetailUserRole(false);
    }
  };

  // Send email to users
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mailTargetUser) return;
    setIsSendingEmail(true);
    try {
      const res = await fetch('/api/admin/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: mailTargetUser.email,
          subject: emailSubject,
          content: emailContent
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(data.message || 'Gửi email thành công.');
        setMailTargetUser(null);
        setEmailSubject('');
        setEmailContent('');
      } else {
        alert(data.error || 'Có lỗi xảy ra.');
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi kết nối.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Send email to users from dedicated tab form
  const handleSendEmailTab = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSendingMailTab(true);
    try {
      const targetEmail = mailTabTarget === 'all' ? 'all' : mailTabCustomEmail;
      if (mailTabTarget === 'custom' && !targetEmail.trim()) {
        alert('Vui lòng nhập email người nhận!');
        setIsSendingMailTab(false);
        return;
      }
      const res = await fetch('/api/admin/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: targetEmail,
          subject: mailTabSubject,
          content: mailTabContent
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(data.message || 'Gửi email thành công.');
        setMailTabSubject('');
        setMailTabContent('');
        setMailTabCustomEmail('');
      } else {
        alert(data.error || 'Có lỗi xảy ra.');
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi kết nối.');
    } finally {
      setIsSendingMailTab(false);
    }
  };

  // Create/Edit Category Submit
  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catFormName.trim()) {
      alert('Vui lòng nhập tên danh mục!');
      return;
    }

    try {
      const isEdit = catFormId !== null;
      const method = isEdit ? 'PUT' : 'POST';
      const body = {
        id: catFormId,
        name: catFormName,
        slug: catFormSlug,
        type: categoryActiveTab,
        color: catFormColor,
        description: catFormDescription,
        status: catFormStatus,
        order_num: catFormOrder
      };

      const res = await fetch('/api/admin/categories', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        alert(data.message);
        // Reset form
        setCatFormId(null);
        setCatFormName('');
        setCatFormSlug('');
        setCatFormDescription('');
        setCatFormColor('');
        setCatFormOrder(0);
        setCatFormStatus(true);
        loadCategories();
      } else {
        alert(data.error || 'Có lỗi xảy ra.');
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi kết nối.');
    }
  };

  // Sync Categories from API
  const handleSyncCategories = async () => {
    if (!confirm('Bạn có muốn đồng bộ thể loại và quốc gia chuẩn từ API không? Các thể loại/quốc gia chưa tồn tại sẽ được thêm tự động.')) return;
    setIsSyncingCategories(true);
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync' })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(data.message);
        loadCategories();
      } else {
        alert(data.error || 'Có lỗi xảy ra.');
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi kết nối.');
    } finally {
      setIsSyncingCategories(false);
    }
  };

  // Delete Category
  const handleDeleteCategory = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa danh mục này? Tất cả các liên kết phim thuộc danh mục này cũng sẽ bị gỡ bỏ.')) return;
    try {
      const res = await fetch(`/api/admin/categories?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(data.message);
        loadCategories();
      } else {
        alert(data.error || 'Có lỗi xảy ra.');
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi kết nối.');
    }
  };

  // Log helper
  const log = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const time = new Date().toLocaleTimeString('vi-VN');
    let prefix = `[${time}] `;
    if (type === 'success') prefix += '✅ ';
    else if (type === 'error') prefix += '❌ ';
    else prefix += 'ℹ️ ';
    setCrawlLogs(prev => [...prev, `${prefix}${message}`]);
  };

  // Sync max pages based on API
  const fetchTotalPages = async (source: string) => {
    try {
      let url = '';
      if (source === 'vicdn') {
        url = 'https://vicdn.cc/api/update/1';
      } else if (source === 'kkphim') {
        url = 'https://phimapi.com/danh-sach/phim-moi-cap-nhat?page=1';
      } else if (source === 'ophim') {
        url = 'https://ophim1.com/danh-sach/phim-moi-cap-nhat?page=1';
      } else if (source === 'nguonc') {
        url = 'https://phim.nguonc.com/api/films/phim-moi-cap-nhat?page=1';
      } else if (source === 'vsmov') {
        url = 'https://vsmov.com/api/danh-sach/phim-moi-cap-nhat?page=1';
      }

      if (!url) return;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();

      let total = 200;
      if (source === 'vicdn') {
        total = data.pagination?.total_pages || 10;
      } else if (source === 'kkphim' || source === 'ophim' || source === 'vsmov') {
        total = data.pagination?.totalPages || 200;
      } else if (source === 'nguonc') {
        total = data.paginate?.totalPages || 100;
      }
      setCrawlEndPage(total);
      log(`Đã đồng bộ số lượng trang tối đa từ nguồn ${source.toUpperCase()}: ${total} trang.`, 'info');
    } catch (err) {
      if (source === 'kkphim' || source === 'vsmov') setCrawlEndPage(200);
      else if (source === 'ophim') setCrawlEndPage(200);
      else if (source === 'nguonc') setCrawlEndPage(100);
      else if (source === 'vicdn') setCrawlEndPage(10);
    }
  };

  useEffect(() => {
    fetchTotalPages(crawlSource);
  }, [crawlSource]);

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  const [siteOrigin, setSiteOrigin] = useState('http://localhost:3000');
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSiteOrigin(window.location.origin);
    }
  }, []);

  // Crawl sequential loop
  const processQueue = async (targetEnd: number, delay: number) => {
    if (!isRunningRef.current || isPausedRef.current) return;

    const page = currentPageRef.current;
    if (page > targetEnd) {
      log(`=== HOÀN TẤT TIẾN TRÌNH CÀO TỰ ĐỘNG! Tổng số phim đã cào thành công: ${successCountRef.current} ===`, 'success');
      handleStop();
      return;
    }

    setCurrentCrawlPage(page);
    log(`Đang cào trang ${page}/${targetEnd}...`, 'info');

    try {
      const res = await fetch(`/api/crawl?source=${crawlSource}&page=${page}&skip_existing=${skipExisting ? '1' : '0'}`);
      const data = await res.json();

      if (res.ok && data.success) {
        log(`Trang ${data.page}: Cào thành công ${data.crawled_count}/${data.total_on_page} phim.`, 'success');
        if (data.movies && data.movies.length > 0) {
          data.movies.forEach((mName: string) => {
            log(`  + Đã lưu: ${mName}`, 'success');
          });
        }
        successCountRef.current += (data.crawled_count || 0);
        setSuccessCount(successCountRef.current);
      } else {
        log(`Lỗi trang ${page}: ${data.message || 'Không rõ lỗi'}`, 'error');
      }
    } catch (err: any) {
      log(`Không thể kết nối đến máy chủ khi cào trang ${page}: ${err.message}`, 'error');
    }

    currentPageRef.current = page + 1;

    // Check delay and trigger next page
    if (isRunningRef.current && !isPausedRef.current) {
      setTimeout(() => processQueue(targetEnd, delay), delay);
    }
  };

  const runSlugCrawl = async () => {
    if (!crawlSlug.trim()) {
      alert('Vui lòng nhập slug phim cần cào!');
      return;
    }

    isRunningRef.current = true;
    setIsRunning(true);
    setIsPaused(false);
    setSuccessCount(0);
    setElapsedTime(0);
    setCurrentCrawlPage('-');
    setCrawlLogs([]);

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    const startTime = Date.now();
    timerIntervalRef.current = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    log(`=== BẮT ĐẦU CÀO PHIM THEO SLUG ===`, 'info');
    log(`Nguồn: ${crawlSource.toUpperCase()}`, 'info');
    log(`Slug phim: ${crawlSlug.trim()}`, 'info');

    try {
      const res = await fetch(`/api/crawl?source=${crawlSource}&slug=${encodeURIComponent(crawlSlug.trim())}`);
      const data = await res.json();

      if (res.ok && data.success) {
        if (data.crawled_count > 0) {
          log(`Cào thành công phim: ${data.movies[0]}`, 'success');
          successCountRef.current = 1;
          setSuccessCount(1);
        } else {
          log(`Không cào được phim. Có thể không tìm thấy phim với slug này trên nguồn ${crawlSource.toUpperCase()}.`, 'error');
        }
      } else {
        log(`Lỗi khi cào phim: ${data.message || 'Không rõ lỗi'}`, 'error');
      }
    } catch (err: any) {
      log(`Không thể kết nối đến máy chủ: ${err.message}`, 'error');
    } finally {
      log(`=== HOÀN TẤT TIẾN TRÌNH CÀO THEO SLUG! ===`, 'success');
      isRunningRef.current = false;
      setIsRunning(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  };

  const runSearchCrawl = async () => {
    if (!crawlKeyword.trim()) {
      alert('Vui lòng nhập từ khóa tìm kiếm phim!');
      return;
    }

    isRunningRef.current = true;
    setIsRunning(true);
    setIsPaused(false);
    setSuccessCount(0);
    setElapsedTime(0);
    setCurrentCrawlPage('-');
    setCrawlLogs([]);

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    const startTime = Date.now();
    timerIntervalRef.current = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    log(`=== BẮT ĐẦU CÀO PHIM THEO TỪ KHÓA TÌM KIẾM ===`, 'info');
    log(`Nguồn: ${crawlSource.toUpperCase()}`, 'info');
    log(`Từ khóa: ${crawlKeyword.trim()}`, 'info');

    try {
      const res = await fetch(`/api/crawl?source=${crawlSource}&keyword=${encodeURIComponent(crawlKeyword.trim())}&skip_existing=${skipExisting ? '1' : '0'}`);
      const data = await res.json();

      if (res.ok && data.success) {
        if (data.crawled_count > 0) {
          log(`Đã cào thành công ${data.crawled_count} phim trùng khớp:`, 'success');
          data.movies.forEach((m: string) => log(`- ${m}`, 'success'));
          successCountRef.current = data.crawled_count;
          setSuccessCount(data.crawled_count);
        } else {
          log(`Không tìm thấy phim nào khớp với từ khóa trên nguồn ${crawlSource.toUpperCase()}.`, 'error');
        }
      } else {
        log(`Lỗi khi tìm kiếm/cào phim: ${data.message || 'Không rõ lỗi'}`, 'error');
      }
    } catch (err: any) {
      log(`Không thể kết nối đến máy chủ: ${err.message}`, 'error');
    } finally {
      log(`=== HOÀN TẤT TIẾN TRÌNH CÀO THEO TỪ KHÓA TÌM KIẾM! ===`, 'success');
      isRunningRef.current = false;
      setIsRunning(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  };

  const handleSearchMovies = async () => {
    if (!crawlKeyword.trim()) {
      alert('Vui lòng nhập từ khóa tìm kiếm!');
      return;
    }
    setIsSearching(true);
    setSearchResults([]);
    setImportingSlugs({});
    try {
      const res = await fetch(`/api/crawl?source=${crawlSource}&keyword=${encodeURIComponent(crawlKeyword.trim())}&just_search=1`);
      const data = await res.json();
      if (res.ok && data.success) {
        setSearchResults(data.items || []);
      } else {
        alert(data.message || 'Không tìm thấy kết quả hoặc lỗi kết nối.');
      }
    } catch (err: any) {
      alert('Lỗi kết nối máy chủ: ' + err.message);
    } finally {
      setIsSearching(false);
    }
  };

  const handleImportSingleMovie = async (slug: string) => {
    setImportingSlugs(prev => ({ ...prev, [slug]: 'loading' }));
    try {
      const res = await fetch(`/api/crawl?source=${crawlSource}&slug=${encodeURIComponent(slug)}`);
      const data = await res.json();
      if (res.ok && data.success && data.crawled_count > 0) {
        setImportingSlugs(prev => ({ ...prev, [slug]: 'success' }));
      } else {
        setImportingSlugs(prev => ({ ...prev, [slug]: 'error' }));
        alert(data.message || 'Lỗi khi nhập phim.');
      }
    } catch (err: any) {
      setImportingSlugs(prev => ({ ...prev, [slug]: 'error' }));
      alert('Lỗi kết nối: ' + err.message);
    }
  };

  const handleStart = () => {
    if (crawlMode === 'slug') {
      runSlugCrawl();
      return;
    }

    if (crawlMode === 'search') {
      runSearchCrawl();
      return;
    }

    if (crawlStartPage < 1) {
      alert('Trang bắt đầu phải từ 1!');
      return;
    }
    if (crawlEndPage < crawlStartPage) {
      alert('Trang kết thúc phải lớn hơn hoặc bằng trang bắt đầu!');
      return;
    }

    isRunningRef.current = true;
    isPausedRef.current = false;
    currentPageRef.current = crawlStartPage;
    successCountRef.current = 0;

    setIsRunning(true);
    setIsPaused(false);
    setSuccessCount(0);
    setElapsedTime(0);

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    const startTime = Date.now();
    timerIntervalRef.current = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    setCrawlLogs([]);
    log(`=== BẮT ĐẦU TIẾN TRÌNH CÀO TỰ ĐỘNG từ trang ${crawlStartPage} đến ${crawlEndPage} (Độ trễ: ${crawlDelayMs}ms) ===`, 'info');
    processQueue(crawlEndPage, crawlDelayMs);
  };

  const handlePauseToggle = () => {
    if (isPausedRef.current) {
      isPausedRef.current = false;
      setIsPaused(false);
      log('Tiếp tục tiến trình cào...', 'info');
      const startTime = Date.now() - elapsedTime * 1000;
      timerIntervalRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      processQueue(crawlEndPage, crawlDelayMs);
    } else {
      isPausedRef.current = true;
      setIsPaused(true);
      log('Đã tạm dừng tiến trình.', 'info');
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  };

  const handleStop = () => {
    isRunningRef.current = false;
    isPausedRef.current = false;
    setIsRunning(false);
    setIsPaused(false);
    setCurrentCrawlPage('-');

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    log('Tiến trình đã dừng lại.', 'info');
  };

  const formatTime = (secs: number) => {
    const mins = String(Math.floor(secs / 60)).padStart(2, '0');
    const seconds = String(secs % 60).padStart(2, '0');
    return `${mins}:${seconds}`;
  };

  const calculateProgress = () => {
    const total = crawlEndPage - crawlStartPage + 1;
    if (total <= 0) return 0;
    const current = (typeof currentCrawlPage === 'number' ? currentCrawlPage : crawlStartPage) - crawlStartPage;
    const percent = Math.round((current / total) * 100);
    return Math.min(100, Math.max(0, percent));
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-slate-800 flex flex-col font-sans admin-dashboard-root">
      <style dangerouslySetInnerHTML={{ __html: 'header, footer { display: none !important; }' }} />

      {/* --- Top Header Bar --- */}
      <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 z-30 sticky top-0 shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <span>Hub</span><span className="text-[#00ac47]">Phim Admin</span>
          </Link>
          <span className="text-slate-300">|</span>
          <div className="relative hidden md:block">
            <input
              type="text"
              placeholder="Search..."
              className="bg-slate-100 border-none rounded-lg px-4 py-1.5 pl-9 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#00ac47] w-60"
            />
            <svg className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button className="p-1.5 hover:bg-slate-100 rounded-full transition-colors relative">
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#00ac47] text-white flex items-center justify-center font-bold text-sm overflow-hidden">
              {currentUser.avatar ? (
                <img src={currentUser.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span>{currentUser.name.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <span className="text-xs font-bold text-slate-700 hidden sm:inline-block">{currentUser.name}</span>
          </div>
        </div>
      </header>

      <div className="flex w-full min-h-[calc(100vh-4rem)] flex-1">
        {/* --- Sidebar Menu --- */}
        <aside className="w-64 bg-[#0b0c1e] p-6 flex flex-col justify-between shrink-0 text-slate-400">
          <div className="space-y-6">
            {/* Nav Menu */}
            <nav className="space-y-1">
              {[
                {
                  tab: 'dashboard',
                  label: 'Tổng quan',
                  perm: null, // Always visible
                  icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  )
                },
                {
                  tab: 'movies',
                  label: 'Quản lý Phim',
                  perm: 'manage_movies',
                  icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                    </svg>
                  )
                },
                {
                  tab: 'articles',
                  label: 'Quản lý Bài viết',
                  perm: 'manage_articles',
                  icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  )
                },
                {
                  tab: 'article-comments',
                  label: 'Bình luận Bài viết',
                  perm: 'manage_article_comments',
                  icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  )
                },
                {
                  tab: 'categories',
                  label: 'Quản lý Danh mục',
                  perm: 'manage_categories',
                  icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 20.5l-6-6 10-10H20v6.5l-10.5 10zM17 7h.01" />
                    </svg>
                  )
                },
                {
                  tab: 'nominations',
                  label: 'Quản lý Đề cử',
                  perm: 'manage_nominations',
                  icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 17.75l-6.172 3.245 1.179-6.873-4.993-4.867 6.9-1.002L12 2l3.086 6.253 6.9 1.002-4.993 4.867 1.179 6.873z" />
                    </svg>
                  )
                },
                {
                  tab: 'episodes',
                  label: 'Quản lý Tập phim',
                  perm: 'manage_episodes',
                  icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )
                },
                {
                  tab: 'comments',
                  label: 'Quản lý Bình luận',
                  perm: 'manage_comments',
                  icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  )
                },
                {
                  tab: 'users',
                  label: 'Quản lý Thành viên',
                  perm: 'manage_users',
                  icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )
                },
                {
                  tab: 'roles',
                  label: 'Phân quyền (Roles)',
                  perm: 'manage_users', // Only those who manage users can manage roles
                  icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  )
                },
                {
                  tab: 'labels',
                  label: 'Nhãn Thành viên',
                  perm: 'manage_labels',
                  icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  )
                },
                {
                  tab: 'notifications',
                  label: 'Quản lý Thông báo',
                  perm: 'manage_notifications',
                  icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  )
                },
                {
                  tab: 'error_reports',
                  label: 'Báo cáo lỗi phim',
                  perm: 'manage_error_reports',
                  icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  )
                },
                {
                  tab: 'contacts',
                  label: 'Quản lý Liên hệ',
                  perm: 'manage_contacts',
                  icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2m16 0l-8 5-8-5" />
                    </svg>
                  )
                },
                {
                  tab: 'sendmail',
                  label: 'Gửi Email',
                  perm: 'manage_sendmail',
                  icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  )
                },
                {
                  tab: 'crawler',
                  label: 'Trình thu thập',
                  perm: 'manage_crawler',
                  icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                  )
                },
                {
                  tab: 'quang-cao',
                  label: 'Quản lý Quảng cáo',
                  perm: 'manage_ads',
                  icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 4h10M5 20h14M12 4v16m-4-6l4-4 4 4" />
                    </svg>
                  )
                },
                {
                  tab: 'servers',
                  label: 'Quản lý Máy chủ',
                  perm: 'manage_settings',
                  icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                    </svg>
                  )
                },
                {
                  tab: 'settings',
                  label: 'Cài đặt hệ thống',
                  perm: 'manage_settings',
                  icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )
                },
                {
                  tab: 'requests',
                  label: 'Yêu cầu phim',
                  perm: 'manage_requests',
                  icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  )
                },
                {
                  tab: 'seo',
                  label: 'Hướng dẫn SEO',
                  perm: null,
                  icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  )
                },
              ].filter(item => item.perm === null || currentUser.role === 'admin' || hasPerm(item.perm)).map((item: any) => {
                const badgeCount = item.tab === 'error_reports' ? stats.pendingReports : item.tab === 'requests' ? stats.pendingRequests : 0;
                return (
                  <button
                    key={item.tab}
                    onClick={() => setActiveTab(item.tab as any)}
                    className={`w-full text-left px-4 py-3 rounded-xl transition-all font-semibold text-sm flex items-center justify-between gap-3 ${activeTab === item.tab ? 'bg-[#00ac47] text-white shadow-[0_4px_12px_rgba(0,172,71,0.2)]' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`${activeTab === item.tab ? 'text-white' : 'text-slate-400'} shrink-0`}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </div>
                    {badgeCount > 0 && (
                      <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 min-w-5 text-center shadow-[0_0_8px_rgba(239,68,68,0.5)]">
                        {badgeCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          <div>
            <Link href="/" className="block text-center text-xs text-slate-500 hover:text-white transition-colors">
              ← Quay lại Website
            </Link>
          </div>
        </aside>

        {/* --- Main Content Panel --- */}
        <main className="flex-1 p-8 lg:p-10 overflow-y-auto">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-fadeIn">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-2xl font-black text-slate-800 m-0 tracking-tight">Tổng Quan Hệ Thống</h2>

                {/* Time filter selector */}
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
                  <span className="text-xs text-slate-500 font-semibold">Lọc lượt xem:</span>
                  <select
                    value={viewStatsRange}
                    onChange={(e) => setViewStatsRange(e.target.value as any)}
                    className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer border-none focus:ring-0"
                  >
                    <option value="today" className="bg-white">Hôm nay</option>
                    <option value="week" className="bg-white">Tuần này (7 ngày)</option>
                    <option value="month" className="bg-white">Tháng này (30 ngày)</option>
                    <option value="year" className="bg-white">Năm nay (365 ngày)</option>
                    <option value="all" className="bg-white">Toàn bộ thời gian</option>
                  </select>
                </div>
              </div>

              {/* Grid Statistics widgets */}
              <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-6">
                {[
                  { title: '🎬 Tổng Phim', value: stats.totalMovies, border: 'border-blue-500/30' },
                  { title: '🎞️ Tổng Tập Phim', value: stats.totalEpisodes, border: 'border-cyan-500/30' },
                  { title: '👥 Thành Viên', value: stats.totalUsers, border: 'border-emerald-500/30' },
                  { title: '💬 Bình Luận', value: stats.totalComments, border: 'border-amber-500/30' },
                  { title: '⚠ Báo Lỗi Phim', value: stats.pendingReports, border: 'border-rose-500/30' },
                  {
                    title: `📈 Lượt Xem (${viewStatsRange === 'today' ? 'Hôm nay' : viewStatsRange === 'week' ? 'Tuần này' : viewStatsRange === 'month' ? 'Tháng này' : viewStatsRange === 'year' ? 'Năm này' : 'Toàn thời gian'})`,
                    value: isDashboardStatsLoading ? '...' : (dashboardStats.totalViews || 0).toLocaleString('vi-VN'),
                    border: 'border-violet-500/30'
                  },
                  { title: '🟢 Đang Online', value: dashboardStats.onlineCount, border: 'border-green-500/30' },
                  { title: '📅 User Hôm Nay', value: dashboardStats.todayUsersCount, border: 'border-indigo-500/30' },
                ].map((stat, i) => (
                  <div key={i} className={`p-6 rounded-2xl bg-white border ${stat.border} shadow-sm text-slate-800 transition-all hover:scale-[1.02] duration-300`}>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 m-0 mb-1">{stat.title}</p>
                    <h3 className="text-2xl font-black m-0 leading-none text-slate-800">{stat.value}</h3>
                  </div>
                ))}
              </div>

              {/* SEO Banner */}
              <div className="bg-gradient-to-r from-[#00ac47] to-emerald-500 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                  <h3 className="text-xl font-bold m-0 mb-1 flex items-center gap-2">🚀 Tối ưu SEO & Kết Nối Google Search Console</h3>
                  <p className="m-0 text-white/90 text-sm">Hướng dẫn cấu hình SEO, Sitemap, Robots.txt và khai báo trang web với Google để phim lên top tìm kiếm.</p>
                </div>
                <button
                  onClick={() => setActiveTab('seo')}
                  className="px-6 py-2.5 bg-white text-emerald-600 font-bold rounded-xl whitespace-nowrap shadow-sm hover:shadow-md hover:bg-slate-50 transition-all active:scale-95"
                >
                  Xem Hướng Dẫn ➔
                </button>
              </div>

              {/* Cronjob Monitoring section on Dashboard */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 p-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="sm:col-span-2 lg:col-span-5 flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-4 mb-2">
                  <div>
                    <h3 className="text-md font-bold text-slate-800 m-0 flex items-center gap-2">
                      ⏰ Giám Sát Lịch Chạy Tự Động (Cronjobs)
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Trạng thái và đường dẫn kích hoạt của các tác vụ chạy tự động trên hệ thống.</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('crawler')}
                    className="text-xs font-bold text-blue-600 hover:text-blue-500 hover:underline flex items-center gap-1"
                  >
                    Cấu hình Crawler ➜
                  </button>
                </div>

                {[
                  { name: 'API KKPhim', key: 'last_cron_run_kkphim', color: 'bg-blue-50 border-blue-200 text-blue-700', path: '/api/crawl?source=kkphim&page=1&skip_existing=1' },
                  { name: 'API OPhim', key: 'last_cron_run_ophim', color: 'bg-purple-50 border-purple-200 text-purple-700', path: '/api/crawl?source=ophim&page=1&skip_existing=1' },
                  { name: 'API NguonC', key: 'last_cron_run_nguonc', color: 'bg-emerald-50 border-emerald-200 text-emerald-700', path: '/api/crawl?source=nguonc&page=1&skip_existing=1' },
                  { name: 'API VSMOV', key: 'last_cron_run_vsmov', color: 'bg-amber-50 border-amber-200 text-amber-700', path: '/api/crawl?source=vsmov&page=1&skip_existing=1' },
                  { name: 'Dọn Xem Chung', key: 'last_cron_cleanup', color: 'bg-rose-50 border-rose-200 text-rose-700', path: '/api/watch-room/cleanup' },
                ].map((cron, idx) => {
                  const lastRun = initialSettings[cron.key];
                  const fullPath = cron.path.startsWith('http')
                    ? cron.path
                    : `${siteOrigin}${cron.path}${cron.path.includes('?') ? '&' : '?'}token=cron-secure-token-123456`;
                  return (
                    <div key={idx} className={`p-4 rounded-xl border ${cron.color} flex flex-col justify-between space-y-4`}>
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider opacity-85 block">{cron.name}</span>
                        <div className="mt-2.5">
                          <span className="text-[9px] block opacity-60 font-semibold">Lần chạy cuối:</span>
                          <span className="text-xs font-black block mt-0.5">{formatCronTime(lastRun)}</span>
                        </div>
                      </div>
                      <div className="border-t border-black/5 pt-2">
                        <span className="text-[9px] block opacity-60 font-semibold mb-1">Link kích hoạt:</span>
                        <a
                          href={fullPath}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[9px] select-all bg-black/5 hover:bg-black/10 px-1.5 py-0.5 rounded break-all block text-blue-600 font-mono underline hover:text-blue-800 transition-colors"
                        >
                          {fullPath}
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Detailed Views Stats & Top Movies / Recently Updated Movies */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Top Viewed Movies */}
                {/* Top Viewed Movies */}
                <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-md font-bold text-slate-800 m-0 flex items-center gap-2">
                      🏆 Top Phim Xem Nhiều Nhất
                    </h3>
                    <span className="text-[10px] font-bold text-[#00ac47] bg-[#00ac47]/10 px-2.5 py-1 rounded-full border border-[#00ac47]/20 uppercase tracking-wider">
                      {viewStatsRange === 'today' ? 'Hôm nay' : viewStatsRange === 'week' ? '7 Ngày Qua' : viewStatsRange === 'month' ? '30 Ngày Qua' : viewStatsRange === 'year' ? '365 Ngày Qua' : 'Tất cả'}
                    </span>
                  </div>

                  <div className="flex-1">
                    {isDashboardStatsLoading ? (
                      <p className="text-slate-400 text-xs py-8 text-center">Đang tải dữ liệu...</p>
                    ) : dashboardStats.topMovies.length === 0 ? (
                      <p className="text-slate-400 text-xs py-8 text-center">Không có dữ liệu lượt xem trong khoảng thời gian này.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-slate-100 text-slate-400 font-bold">
                              <th className="pb-2">Hạng</th>
                              <th className="pb-2">Tên Phim</th>
                              <th className="pb-2">Loại</th>
                              <th className="pb-2 text-right">Lượt Xem</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dashboardStats.topMovies.map((movie, index) => (
                              <tr key={movie.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                <td className="py-2.5 font-bold">
                                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black ${index === 0 ? 'bg-amber-500 text-black' :
                                    index === 1 ? 'bg-zinc-300 text-black' :
                                      index === 2 ? 'bg-amber-700 text-white' :
                                        'bg-slate-100 text-slate-500'
                                    }`}>
                                    {index + 1}
                                  </span>
                                </td>
                                <td className="py-2.5 pr-2">
                                  <Link href={`/phim/${movie.slug}`} target="_blank" className="font-bold text-slate-800 hover:text-[#00ac47] transition-colors line-clamp-1">
                                    {movie.title}
                                  </Link>
                                  <span className="text-[10px] text-slate-400 block truncate">{movie.original_title}</span>
                                </td>
                                <td className="py-2.5 text-slate-500 capitalize">{movie.type === 'phimbo' ? 'Bộ' : 'Lẻ'}</td>
                                <td className="py-2.5 text-right font-black text-[#00ac47]">{(movie.views || 0).toLocaleString('vi-VN')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recently Updated Movies */}
                <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col">
                  <h3 className="text-md font-bold text-slate-800 mb-4 mt-0">
                    🔄 Phim Mới Cập Nhật
                  </h3>

                  <div className="flex-1">
                    {isDashboardStatsLoading ? (
                      <p className="text-slate-400 text-xs py-8 text-center">Đang tải dữ liệu...</p>
                    ) : dashboardStats.recentlyUpdated.length === 0 ? (
                      <p className="text-slate-400 text-xs py-8 text-center">Chưa có phim nào.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-slate-100 text-slate-400 font-bold">
                              <th className="pb-2">Tên Phim</th>
                              <th className="pb-2">Cập Nhật Lúc</th>
                              <th className="pb-2 text-right">Lượt Xem</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dashboardStats.recentlyUpdated.map((movie) => (
                              <tr key={movie.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                <td className="py-2.5 pr-2">
                                  <Link href={`/phim/${movie.slug}`} target="_blank" className="font-bold text-slate-800 hover:text-[#00ac47] transition-colors line-clamp-1">
                                    {movie.title}
                                  </Link>
                                  <span className="text-[10px] text-slate-400 uppercase font-semibold">{movie.type === 'phimbo' ? 'Phim bộ' : 'Phim lẻ'}</span>
                                </td>
                                <td className="py-2.5 text-slate-500">
                                  {movie.updated_at ? new Date(movie.updated_at).toLocaleString('vi-VN') : 'Chưa rõ'}
                                </td>
                                <td className="py-2.5 text-right font-black text-slate-800">{(movie.views || 0).toLocaleString('vi-VN')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Feed of Recent comments / error reports */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Comments */}
                <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <h3 className="text-md font-bold text-slate-800 mb-4 mt-0">💬 Bình luận mới gần đây</h3>
                  <div className="space-y-4">
                    {initialRecentComments.length === 0 ? (
                      <p className="text-slate-400 text-xs">Chưa có bình luận nào.</p>
                    ) : (
                      initialRecentComments.map((comment) => (
                        <div key={comment.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex gap-3 text-xs leading-normal">
                          <img
                            src={comment.users?.avatar || '/avt/meme/avatar-hai-huoc-vo-tri-0.jpg'}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-200"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="m-0 font-bold text-slate-800 mb-0.5">{comment.users?.name || 'Ẩn danh'}</p>
                            <p className="m-0 text-slate-600 mb-1 line-clamp-2">{comment.content}</p>
                            <span className="text-[10px] text-slate-400">Tại phim: {comment.movies?.title}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Recent Reports */}
                <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <h3 className="text-md font-bold text-slate-800 mb-4 mt-0">⚠ Báo cáo lỗi phim mới</h3>
                  <div className="space-y-4">
                    {initialRecentReports.length === 0 ? (
                      <p className="text-slate-400 text-xs">Không có báo cáo lỗi nào mới.</p>
                    ) : (
                      initialRecentReports.map((report) => (
                        <div key={report.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs leading-normal">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-bold text-rose-500"># Phim lỗi: {report.movies?.title || 'Không rõ'}</span>
                            <span className="text-[9px] px-1.5 py-0.5 bg-rose-500/10 text-rose-500 rounded-full font-bold">Chưa xử lý</span>
                          </div>
                          <p className="m-0 text-slate-600">{report.message}</p>
                          <p className="m-0 text-[10px] text-slate-400 mt-1">Gửi bởi: {report.users?.name || 'Ẩn danh'}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Movies Tab */}
          {activeTab === 'movies' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-2xl font-black text-slate-800 m-0 tracking-tight">Quản Lý Phim</h2>
                <button
                  onClick={() => {
                    setCurrentMovie(null);
                    setSelectedCategoryIds([]);
                    setActiveTab('edit-movie');
                  }}
                  className="bg-[#00ac47] hover:bg-[#00c250] text-white px-5 py-2.5 rounded-xl font-bold transition-all text-sm flex items-center gap-2 active:scale-95"
                >
                  + Thêm phim mới
                </button>
              </div>

              {/* Search filter */}
              <div className="flex flex-wrap gap-3">
                <input
                  type="text"
                  placeholder="Tìm kiếm phim theo tên hoặc tên gốc..."
                  value={moviesSearch}
                  onChange={(e) => setMoviesSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadMovies()}
                  className="flex-1 min-w-[250px] max-w-md bg-[#0f1118] border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm"
                />
                <select
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value);
                    setMoviesPage(1);
                  }}
                  className="bg-[#0f1118] border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm cursor-pointer"
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="completed">Hoàn thành</option>
                  <option value="ongoing">Đang chiếu</option>
                  <option value="trailer">Trailer</option>
                </select>
                <button
                  onClick={() => {
                    setMoviesPage(1);
                    loadMovies();
                  }}
                  className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  Tìm kiếm
                </button>
              </div>

              {/* Table */}
              <div className="border border-white/[0.06] rounded-2xl bg-[#0f1118]/80 overflow-hidden shadow-lg">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/[0.02]">
                        <th className="p-4 font-bold text-white">ID</th>
                        <th className="p-4 font-bold text-white">Phim</th>
                        <th className="p-4 font-bold text-white">Loại</th>
                        <th className="p-4 font-bold text-white">Trạng thái</th>
                        <th className="p-4 font-bold text-white">Đề cử</th>
                        <th className="p-4 font-bold text-white">Năm</th>
                        <th className="p-4 font-bold text-white">Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isMoviesLoading ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-zinc-500">Đang tải dữ liệu...</td>
                        </tr>
                      ) : moviesList.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-zinc-500">Không tìm thấy phim nào.</td>
                        </tr>
                      ) : (
                        moviesList.map((movie) => (
                          <tr key={movie.id} className="border-b border-white/5 hover:bg-white/[0.01] transition-colors">
                            <td className="p-4 text-zinc-500">{movie.id}</td>
                            <td className="p-4 font-semibold text-white">
                              <p className="m-0 text-sm">{movie.title}</p>
                              <p className="m-0 text-xs text-zinc-500">{movie.original_title}</p>
                            </td>
                            <td className="p-4 text-zinc-400 capitalize">{movie.type === 'phimbo' ? 'Phim Bộ' : 'Phim Lẻ'}</td>
                            <td className="p-4">
                              <span className="px-2 py-0.5 bg-[#00ac47]/10 text-[#00ac47] text-xs font-semibold rounded-full border border-[#00ac47]/20">
                                {movie.status || 'Full'}
                              </span>
                            </td>
                            <td className="p-4">
                              <button
                                onClick={() => handleToggleHot(movie)}
                                className={`px-2.5 py-1 text-xs font-bold rounded-full border transition-all ${movie.is_hot
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20'
                                  : 'bg-zinc-800 text-zinc-400 border-transparent hover:bg-amber-500/10 hover:text-amber-400 hover:border-amber-500/20'
                                  }`}
                                title={movie.is_hot ? 'Click để hủy đề cử' : 'Click để bật đề cử'}
                              >
                                {movie.is_hot ? '🔥 Có đề cử' : '📁 Không'}
                              </button>
                            </td>
                            <td className="p-4 text-zinc-400">{movie.year}</td>
                            <td className="p-4 flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setCurrentMovie(movie);
                                  setSelectedCategoryIds(movie.movie_category ? movie.movie_category.map((mc: any) => mc.category_id) : []);
                                  setActiveTab('edit-movie');
                                }}
                                className="px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg text-xs font-semibold transition-all"
                              >
                                Sửa
                              </button>
                              <button
                                onClick={() => loadEpisodes(movie.id.toString(), movie.title)}
                                className="px-3 py-1.5 bg-amber-600/10 hover:bg-amber-600 text-amber-400 hover:text-white rounded-lg text-xs font-semibold transition-all"
                              >
                                Tập phim
                              </button>
                              <button
                                onClick={() => handleDeleteMovie(movie.id)}
                                className="px-3 py-1.5 bg-rose-600/10 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg text-xs font-semibold transition-all"
                              >
                                Xóa
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              {moviesTotal > 0 && (
                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs text-zinc-500">Tổng cộng {moviesTotal} phim</span>
                  <div className="flex gap-2">
                    <button
                      disabled={moviesPage <= 1}
                      onClick={() => setMoviesPage(p => p - 1)}
                      className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      Trước
                    </button>
                    <span className="text-sm font-semibold px-3 py-1.5 bg-zinc-900 border border-white/5 rounded-lg text-white">
                      Trang {moviesPage} / {Math.ceil(moviesTotal / 10)}
                    </span>
                    <button
                      disabled={moviesPage >= Math.ceil(moviesTotal / 10)}
                      onClick={() => setMoviesPage(p => p + 1)}
                      className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      Sau
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Nominations Tab */}
          {activeTab === 'nominations' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black text-slate-800 m-0 tracking-tight">Quản Lý Phim Đề Cử (Slider trang chủ)</h2>
              </div>

              {/* Table */}
              <div className="border border-white/[0.06] rounded-2xl bg-[#0f1118]/80 overflow-hidden shadow-lg">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/[0.02]">
                        <th className="p-4 font-bold text-white">ID</th>
                        <th className="p-4 font-bold text-white">Phim đề cử</th>
                        <th className="p-4 font-bold text-white">Logo chữ / Logo phim</th>
                        <th className="p-4 font-bold text-white">Trạng thái đề cử</th>
                        <th className="p-4 font-bold text-white">Ưu tiên (Cao xếp trước)</th>
                        <th className="p-4 font-bold text-white">Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isNominationsLoading ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-zinc-500">Đang tải dữ liệu...</td>
                        </tr>
                      ) : nominationsList.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-zinc-500">Chưa có bộ phim nào được cấu hình đề cử.</td>
                        </tr>
                      ) : (
                        nominationsList.map((movie) => (
                          <tr key={movie.id} className="border-b border-white/5 hover:bg-white/[0.01] transition-colors">
                            <td className="p-4 text-zinc-500">{movie.id}</td>
                            <td className="p-4 font-semibold text-white">
                              <p className="m-0 text-sm">{movie.title}</p>
                              <p className="m-0 text-xs text-zinc-500">{movie.original_title}</p>
                            </td>
                            <td className="p-4">
                              {movie.logo_url ? (
                                <img
                                  src={movie.logo_url}
                                  alt="Logo"
                                  className="h-8 max-w-[150px] object-contain bg-zinc-950/60 p-1 border border-white/10 rounded"
                                />
                              ) : (
                                <span className="text-xs text-rose-400 font-semibold italic">Chưa có Logo (Sẽ dùng chữ thường)</span>
                              )}
                            </td>
                            <td className="p-4">
                              <button
                                onClick={() => handleToggleHot(movie)}
                                className="px-3 py-1 bg-emerald-500/10 text-emerald-400 hover:bg-rose-500/10 hover:text-rose-400 border border-emerald-500/20 hover:border-rose-500/20 text-xs font-bold rounded-full transition-all"
                                title="Click để tắt đề cử"
                              >
                                🔥 Đang đề cử (Click để tắt)
                              </button>
                            </td>
                            <td className="p-4">
                              <input
                                type="number"
                                value={movie.hot_priority || 0}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  setNominationsList(prev => prev.map(m => m.id === movie.id ? { ...m, hot_priority: val } : m));
                                }}
                                onBlur={async (e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  try {
                                    const res = await fetch('/api/admin/movies', {
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ id: movie.id, hot_priority: val })
                                    });
                                    if (!res.ok) {
                                      alert('Không thể cập nhật độ ưu tiên.');
                                    }
                                  } catch (err) {
                                    console.error(err);
                                  }
                                }}
                                className="w-20 bg-zinc-950/60 text-white border border-white/10 rounded px-2.5 py-1 text-center text-xs focus:outline-none focus:border-[#eab308]"
                                placeholder="0"
                              />
                            </td>
                            <td className="p-4 flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setCurrentMovie(movie);
                                  setSelectedCategoryIds(movie.movie_category ? movie.movie_category.map((mc: any) => mc.category_id) : []);
                                  setActiveTab('edit-movie');
                                }}
                                className="px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg text-xs font-semibold transition-all"
                              >
                                Chỉnh sửa logo & phim
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              {nominationsTotal > 0 && (
                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs text-zinc-500">Tổng cộng {nominationsTotal} phim đề cử</span>
                  <div className="flex gap-2">
                    <button
                      disabled={nominationsPage <= 1}
                      onClick={() => setNominationsPage(p => p - 1)}
                      className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      Trước
                    </button>
                    <span className="text-sm font-semibold px-3 py-1.5 bg-zinc-900 border border-white/5 rounded-lg text-white">
                      Trang {nominationsPage} / {Math.ceil(nominationsTotal / 10)}
                    </span>
                    <button
                      disabled={nominationsPage >= Math.ceil(nominationsTotal / 10)}
                      onClick={() => setNominationsPage(p => p + 1)}
                      className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      Sau
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Episodes Tab */}
          {activeTab === 'episodes' && (
            <div className="space-y-6 animate-fadeIn">
              <h2 className="text-2xl font-black text-slate-800 m-0 tracking-tight">Quản Lý Tập Phim</h2>

              {/* Active Movie Selection Label */}
              <div className="p-4 bg-zinc-900/30 border border-white/5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <p className="text-xs text-zinc-500 m-0 mb-1">Phim đang chọn quản lý tập:</p>
                  <h4 className="text-lg font-bold text-white m-0">{episodesMovieTitle || '(Chưa chọn phim - Vui lòng chọn ở tab Quản Lý Phim)'}</h4>
                </div>
                {episodesMovieId && (
                  <button
                    onClick={() => {
                      setCurrentEpisode(null);
                      setEpisodeModalOpen(true);
                    }}
                    className="bg-[#00ac47] hover:bg-[#00c250] text-white px-4 py-2 rounded-xl font-bold transition-all text-xs active:scale-95 shrink-0"
                  >
                    + Thêm tập phim
                  </button>
                )}
              </div>

              {episodesMovieId ? (
                <div className="border border-white/[0.06] rounded-2xl bg-[#0f1118]/80 overflow-hidden shadow-lg">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-white/5 bg-white/[0.02]">
                          <th className="p-4 font-bold text-white">Số Thứ Tự</th>
                          <th className="p-4 font-bold text-white">Tên Tập</th>
                          <th className="p-4 font-bold text-white">Máy Chủ</th>
                          <th className="p-4 font-bold text-white">Đường Dẫn Video (M3U8/Embed)</th>
                          <th className="p-4 font-bold text-white">Hành Động</th>
                        </tr>
                      </thead>
                      <tbody>
                        {isEpisodesLoading ? (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-zinc-500">Đang tải danh sách tập...</td>
                          </tr>
                        ) : episodesList.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-zinc-500">Chưa có tập phim nào.</td>
                          </tr>
                        ) : (
                          episodesList.map((ep) => (
                            <tr key={ep.id} className="border-b border-white/5 hover:bg-white/[0.01] transition-colors">
                              <td className="p-4 text-zinc-400">{ep.order_num}</td>
                              <td className="p-4 font-semibold text-white">{ep.name}</td>
                              <td className="p-4 text-zinc-400">{ep.server_name}</td>
                              <td className="p-4 text-zinc-500 max-w-xs truncate">{ep.video_url}</td>
                              <td className="p-4 flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setCurrentEpisode(ep);
                                    setEpisodeModalOpen(true);
                                  }}
                                  className="px-2.5 py-1 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg text-xs font-semibold transition-all"
                                >
                                  Sửa
                                </button>
                                <button
                                  onClick={() => handleDeleteEpisode(ep.id)}
                                  className="px-2.5 py-1 bg-rose-600/10 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg text-xs font-semibold transition-all"
                                >
                                  Xóa
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 text-zinc-500 bg-zinc-900/10 rounded-2xl border border-dashed border-white/5">
                  Vui lòng chuyển sang tab <strong>🎬 Quản lý Phim</strong> và click vào nút <strong>Tập phim</strong> của một bộ phim bất kỳ để quản lý danh sách tập.
                </div>
              )}
            </div>
          )}

          {/* Comments Tab */}
          {activeTab === 'comments' && (
            <div className="space-y-6 animate-fadeIn">
              <h2 className="text-2xl font-black text-slate-800 m-0 tracking-tight">Quản Lý Bình Luận</h2>

              {/* Comments search */}
              <div className="flex flex-wrap gap-3">
                <input
                  type="text"
                  placeholder="Tìm kiếm bình luận theo nội dung, thành viên hoặc phim..."
                  value={commentsSearch}
                  onChange={(e) => setCommentsSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setCommentsPage(1);
                      loadComments(1);
                    }
                  }}
                  className="flex-1 min-w-[250px] max-w-md bg-[#0f1118] border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm"
                />
                <button
                  onClick={() => {
                    setCommentsPage(1);
                    loadComments(1);
                  }}
                  className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-semibold transition-colors shrink-0"
                >
                  Tìm kiếm
                </button>
              </div>

              <div className="border border-white/[0.06] rounded-2xl bg-[#0f1118]/80 overflow-hidden shadow-lg">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/[0.02]">
                        <th className="p-4 font-bold text-white">Thành viên</th>
                        <th className="p-4 font-bold text-white">Phim</th>
                        <th className="p-4 font-bold text-white">Nội dung bình luận</th>
                        <th className="p-4 font-bold text-white">Trạng thái</th>
                        <th className="p-4 font-bold text-white">Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isCommentsLoading ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-zinc-500">Đang tải bình luận...</td>
                        </tr>
                      ) : commentsList.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-zinc-500">Chưa có bình luận nào.</td>
                        </tr>
                      ) : (
                        commentsList.map((c) => (
                          <tr key={c.id} className="border-b border-white/5 hover:bg-white/[0.01] transition-colors">
                            <td className="p-4 font-semibold text-white">
                              <p className="m-0">{c.users?.name || 'Ẩn danh'}</p>
                              <p className="m-0 text-xs text-zinc-500">{c.users?.email}</p>
                            </td>
                            <td className="p-4 text-zinc-300">{c.movies?.title}</td>
                            <td className="p-4 text-zinc-400 max-w-sm truncate">{c.content}</td>
                            <td className="p-4">
                              {c.status ? (
                                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-xs font-semibold rounded-full border border-emerald-500/20">Hiển thị</span>
                              ) : (
                                <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 text-xs font-semibold rounded-full border border-rose-500/20">Đã ẩn</span>
                              )}
                            </td>
                            <td className="p-4 flex items-center gap-2">
                              <button
                                onClick={() => handleToggleCommentStatus(c.id, c.status)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${c.status ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white' : 'bg-emerald-600/10 hover:bg-emerald-600 text-emerald-400 hover:text-white'}`}
                              >
                                {c.status ? 'Ẩn đi' : 'Duyệt'}
                              </button>
                              <button
                                onClick={() => handleDeleteComment(c.id)}
                                className="px-2.5 py-1 bg-rose-600/10 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg text-xs font-semibold transition-all"
                              >
                                Xóa
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Comments Pagination */}
              {commentsTotal > 0 && (
                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs text-zinc-500">Tổng cộng {commentsTotal} bình luận</span>
                  <div className="flex gap-2">
                    <button
                      disabled={commentsPage <= 1}
                      onClick={() => setCommentsPage(p => p - 1)}
                      className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      Trước
                    </button>
                    <span className="text-sm font-semibold px-3 py-1.5 bg-zinc-900 border border-white/5 rounded-lg text-white">
                      Trang {commentsPage} / {Math.ceil(commentsTotal / 10)}
                    </span>
                    <button
                      disabled={commentsPage >= Math.ceil(commentsTotal / 10)}
                      onClick={() => setCommentsPage(p => p + 1)}
                      className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      Sau
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Roles Tab */}
          {activeTab === 'roles' && (
            <AdminRolesTab />
          )}

          {/* Servers Tab */}
          {activeTab === 'servers' && (
            <AdminServersTab />
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="space-y-6 animate-fadeIn">
              <h2 className="text-2xl font-black text-slate-800 m-0 tracking-tight">Quản Lý Thành Viên</h2>

              {/* Users search */}
              <div className="flex flex-wrap gap-3 justify-between items-center">
                <div className="flex gap-3 flex-1 max-w-md">
                  <input
                    type="text"
                    placeholder="Tìm kiếm thành viên theo tên hoặc email..."
                    value={usersSearch}
                    onChange={(e) => setUsersSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
                    className="w-full bg-[#0f1118] border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm"
                  />
                  <button
                    onClick={() => {
                      setUsersPage(1);
                      loadUsers();
                    }}
                    className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-semibold transition-colors shrink-0"
                  >
                    Tìm kiếm
                  </button>
                </div>

                <button
                  onClick={() => setMailTargetUser({ id: 0, name: 'Tất cả thành viên', email: 'all' })}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 active:scale-95 shadow-md"
                >
                  📨 Gửi Mail Toàn Bộ
                </button>
              </div>

              <div className="border border-white/[0.06] rounded-2xl bg-[#0f1118]/80 overflow-hidden shadow-lg">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/[0.02]">
                        <th className="p-4 font-bold text-white">ID</th>
                        <th className="p-4 font-bold text-white">Thành viên</th>
                        <th className="p-4 font-bold text-white">Email</th>
                        <th className="p-4 font-bold text-white">Vai trò</th>
                        <th className="p-4 font-bold text-white">Bình luận</th>
                        <th className="p-4 font-bold text-white">Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isUsersLoading ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-zinc-500">Đang tải danh sách...</td>
                        </tr>
                      ) : usersList.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-zinc-500">Không tìm thấy thành viên nào.</td>
                        </tr>
                      ) : (
                        usersList.map((u) => (
                          <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.01] transition-colors">
                            <td className="p-4 text-zinc-500">{u.id}</td>
                            <td className="p-4 font-semibold text-white flex items-center gap-3">
                              <img
                                src={u.avatar || '/avt/meme/avatar-hai-huoc-vo-tri-0.jpg'}
                                alt=""
                                className="w-8 h-8 rounded-full object-cover"
                              />
                              <span>{u.name}</span>
                            </td>
                            <td className="p-4 text-zinc-400">{u.email}</td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${u.role === 'admin' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : u.role_id ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-zinc-800 text-zinc-400 border-transparent'}`}>
                                {u.role === 'admin' ? 'ADMIN' : (u.roles?.name ? u.roles.name.toUpperCase() : 'USER')}
                              </span>
                            </td>
                            <td className="p-4">
                              {u.banned_until && new Date(u.banned_until) > new Date() ? (
                                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20" title={`Bị cấm bình luận đến ${new Date(u.banned_until).toLocaleString('vi-VN')}`}>
                                  🚫 Cấm đến {new Date(u.banned_until).toLocaleDateString('vi-VN')}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  ✅ Hoạt động
                                </span>
                              )}
                            </td>
                            <td className="p-4 flex items-center gap-2">
                              <button
                                onClick={() => handleViewUserDetails(u)}
                                className="px-2 py-1 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-lg text-xs font-semibold transition-all flex items-center justify-center"
                                title="Xem chi tiết & Nhật ký"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                              </button>
                              <button
                                onClick={() => handleChangeUserRole(u.id, u.role)}
                                className="px-2.5 py-1 bg-amber-600/10 hover:bg-amber-600 text-amber-400 hover:text-white rounded-lg text-xs font-semibold transition-all"
                              >
                                Đổi vai trò
                              </button>
                              <button
                                onClick={() => setBanUser(u)}
                                className="px-2.5 py-1 bg-rose-600/10 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg text-xs font-semibold transition-all"
                              >
                                Cấm BL
                              </button>
                              <button
                                onClick={() => setMailTargetUser(u)}
                                className="px-2.5 py-1 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg text-xs font-semibold transition-all"
                              >
                                Gửi Mail
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u.id)}
                                className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg text-xs font-semibold transition-all"
                              >
                                Xóa
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Users Pagination */}
              {usersTotal > 0 && (
                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs text-zinc-500">Tổng cộng {usersTotal} thành viên</span>
                  <div className="flex gap-2">
                    <button
                      disabled={usersPage <= 1}
                      onClick={() => setUsersPage(p => p - 1)}
                      className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      Trước
                    </button>
                    <span className="text-sm font-semibold px-3 py-1.5 bg-zinc-900 border border-white/5 rounded-lg text-white">
                      Trang {usersPage} / {Math.ceil(usersTotal / 10)}
                    </span>
                    <button
                      disabled={usersPage >= Math.ceil(usersTotal / 10)}
                      onClick={() => setUsersPage(p => p + 1)}
                      className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      Sau
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Labels Tab */}
          {activeTab === 'labels' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-2xl font-black text-slate-800 m-0 tracking-tight">Quản Lý Nhãn Thành Viên</h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form Column */}
                <div className="lg:col-span-1 p-6 border border-white/[0.06] bg-[#0f1118]/80 backdrop-blur-[20px] rounded-2xl shadow-lg space-y-4 self-start">
                  <h3 className="text-base font-bold text-white m-0 border-b border-white/5 pb-2">
                    {labelFormId !== null ? 'Cập nhật' : 'Thêm'} Nhãn Mới
                  </h3>

                  <form onSubmit={handleSaveLabel} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-1">Tên nhãn *</label>
                      <input
                        type="text"
                        required
                        value={labelFormName}
                        onChange={(e) => setLabelFormName(e.target.value)}
                        placeholder="VD: VIP, Chuyên Gia..."
                        className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-[#00ac47] text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-1">Màu sắc (HEX) *</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={labelFormColor}
                          onChange={(e) => setLabelFormColor(e.target.value)}
                          className="w-10 h-10 rounded cursor-pointer border-none p-0 bg-transparent"
                        />
                        <input
                          type="text"
                          required
                          value={labelFormColor}
                          onChange={(e) => setLabelFormColor(e.target.value)}
                          className="flex-1 bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-[#00ac47] text-sm uppercase"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2 border-t border-white/5">
                      <button
                        type="submit"
                        className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all shadow-md active:scale-[0.98]"
                      >
                        💾 Lưu
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setLabelFormId(null);
                          setLabelFormName('');
                          setLabelFormColor('#FFD700');
                        }}
                        className="py-2 px-3.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-semibold transition-colors"
                      >
                        Hủy
                      </button>
                    </div>
                  </form>
                </div>

                {/* Table Column */}
                <div className="lg:col-span-2 border border-white/[0.06] rounded-2xl bg-[#0f1118]/80 overflow-hidden shadow-lg self-start">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-white/5 bg-white/[0.02]">
                          <th className="p-4 font-bold text-white">ID</th>
                          <th className="p-4 font-bold text-white">Tên Nhãn</th>
                          <th className="p-4 font-bold text-white">Màu sắc</th>
                          <th className="p-4 font-bold text-white">Hành động</th>
                        </tr>
                      </thead>
                      <tbody>
                        {isLabelsLoading ? (
                          <tr>
                            <td colSpan={4} className="p-8 text-center text-zinc-500">Đang tải danh sách...</td>
                          </tr>
                        ) : labelsList.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-8 text-center text-zinc-500">Chưa có bản ghi nào.</td>
                          </tr>
                        ) : (
                          labelsList.map((lbl) => (
                            <tr key={lbl.id} className="border-b border-white/5 hover:bg-white/[0.01] transition-colors">
                              <td className="p-4 text-zinc-500">{lbl.id}</td>
                              <td className="p-4 font-semibold text-white">
                                <span className="px-2 py-0.5 rounded text-xs font-bold border" style={{ backgroundColor: `${lbl.color}20`, color: lbl.color, borderColor: `${lbl.color}40` }}>
                                  {lbl.name}
                                </span>
                              </td>
                              <td className="p-4 font-mono text-xs uppercase" style={{ color: lbl.color }}>
                                {lbl.color}
                              </td>
                              <td className="p-4 flex items-center gap-1.5">
                                <button
                                  onClick={() => {
                                    setLabelFormId(lbl.id);
                                    setLabelFormName(lbl.name);
                                    setLabelFormColor(lbl.color);
                                  }}
                                  className="px-2 py-1 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white rounded text-xs font-semibold transition-all"
                                >
                                  Sửa
                                </button>
                                <button
                                  onClick={() => handleDeleteLabel(lbl.id)}
                                  className="px-2 py-1 bg-rose-600/10 hover:bg-rose-600 text-rose-400 hover:text-white rounded text-xs font-semibold transition-all"
                                >
                                  Xóa
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Crawler Tab */}
          {activeTab === 'crawler' && (
            <div className="space-y-6 animate-fadeIn">
              <h2 className="text-2xl font-black text-slate-800 m-0 tracking-tight">Cào Phim Tự Động Hàng Loạt</h2>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Thiết lập dải cào */}
                <div className="lg:col-span-1 p-6 border border-white/[0.06] bg-[#0f1118]/80 backdrop-blur-[20px] rounded-2xl shadow-lg space-y-6">
                  <h3 className="text-lg font-bold text-white m-0 border-b border-white/5 pb-3 flex items-center gap-2">
                    ⚙️ Cấu hình thu thập
                  </h3>

                  <div className="space-y-4">
                    {/* Source Selector */}
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Nguồn API</label>
                      <select
                        value={crawlSource}
                        onChange={(e) => setCrawlSource(e.target.value)}
                        disabled={isRunning}
                        className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm cursor-pointer disabled:opacity-50"
                      >
                        <option value="all">Tất cả các nguồn (Tự động chuyển)</option>
                        <option value="kkphim">API KKPhim (phimapi.com)</option>
                        <option value="ophim">API Ophim (ophim1.com)</option>
                        <option value="nguonc">API NguonC (phim.nguonc.com)</option>
                        <option value="vsmov">API VSMOV (vsmov.com)</option>
                        <option value="vicdn">🎌 Server ViCDN (vicdn.cc)</option>
                      </select>
                    </div>

                    {/* Mode Selector */}
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Phương thức cào</label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setCrawlMode('range')}
                          disabled={isRunning}
                          className={`py-2 px-1 rounded-xl text-[10px] font-bold border transition-all ${crawlMode === 'range'
                            ? 'bg-[#00ac47]/10 text-[#00ac47] border-[#00ac47]/20 shadow-[0_2px_8px_rgba(0,172,71,0.1)]'
                            : 'bg-zinc-950 text-zinc-400 border-white/5 hover:text-white hover:bg-white/5'
                            } disabled:opacity-50`}
                        >
                          Theo dải trang
                        </button>
                        <button
                          type="button"
                          onClick={() => setCrawlMode('slug')}
                          disabled={isRunning}
                          className={`py-2 px-1 rounded-xl text-[10px] font-bold border transition-all ${crawlMode === 'slug'
                            ? 'bg-[#00ac47]/10 text-[#00ac47] border-[#00ac47]/20 shadow-[0_2px_8px_rgba(0,172,71,0.1)]'
                            : 'bg-zinc-950 text-zinc-400 border-white/5 hover:text-white hover:bg-white/5'
                            } disabled:opacity-50`}
                        >
                          Theo Slug
                        </button>
                        <button
                          type="button"
                          onClick={() => setCrawlMode('search')}
                          disabled={isRunning}
                          className={`py-2 px-1 rounded-xl text-[10px] font-bold border transition-all ${crawlMode === 'search'
                            ? 'bg-[#00ac47]/10 text-[#00ac47] border-[#00ac47]/20 shadow-[0_2px_8px_rgba(0,172,71,0.1)]'
                            : 'bg-zinc-950 text-zinc-400 border-white/5 hover:text-white hover:bg-white/5'
                            } disabled:opacity-50`}
                        >
                          Tìm kiếm phim
                        </button>
                      </div>
                    </div>

                    {crawlMode === 'range' && (
                      <>
                        {/* Page range inputs */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Trang bắt đầu</label>
                            <input
                              type="number"
                              min={1}
                              value={crawlStartPage}
                              onChange={(e) => setCrawlStartPage(Math.max(1, parseInt(e.target.value) || 1))}
                              disabled={isRunning}
                              className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm disabled:opacity-50"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Trang kết thúc</label>
                            <input
                              type="number"
                              min={1}
                              value={crawlEndPage}
                              onChange={(e) => setCrawlEndPage(Math.max(1, parseInt(e.target.value) || 1))}
                              disabled={isRunning}
                              className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm disabled:opacity-50"
                            />
                          </div>
                        </div>

                        {/* Delay input */}
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Độ trễ mỗi trang (ms)</label>
                          <input
                            type="number"
                            min={0}
                            step={100}
                            value={crawlDelayMs}
                            onChange={(e) => setCrawlDelayMs(Math.max(0, parseInt(e.target.value) || 0))}
                            disabled={isRunning}
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm disabled:opacity-50"
                          />
                          <small className="text-zinc-500 text-[10px] mt-1 block">Độ trễ giúp giảm tải cho server tránh bị chặn IP.</small>
                        </div>

                        {/* Skip existing Option */}
                        <div>
                          <label className="flex items-center gap-3 p-3 bg-zinc-950 border border-white/10 rounded-xl cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={skipExisting}
                              onChange={(e) => setSkipExisting(e.target.checked)}
                              disabled={isRunning}
                              className="w-4.5 h-4.5 rounded border-white/10 text-[#00ac47] focus:ring-[#00ac47] bg-black/30 disabled:opacity-50"
                            />
                            <span className="text-xs font-semibold text-zinc-300">Chỉ cào phim chưa có</span>
                          </label>
                        </div>
                      </>
                    )}

                    {crawlMode === 'slug' && (
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Slug phim cần cào</label>
                        <input
                          type="text"
                          placeholder="Ví dụ: cuoc-chien-vo-hinh"
                          value={crawlSlug}
                          onChange={(e) => setCrawlSlug(e.target.value)}
                          disabled={isRunning}
                          className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm disabled:opacity-50"
                        />
                        <small className="text-zinc-500 text-[10px] mt-1 block">Nhập slug duy nhất của phim từ API để cào/cập nhật.</small>
                      </div>
                    )}

                    {crawlMode === 'search' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Từ khóa tìm kiếm phim</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Ví dụ: Thỏ Ơi"
                              value={crawlKeyword}
                              onChange={(e) => setCrawlKeyword(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleSearchMovies();
                                }
                              }}
                              disabled={isRunning || isSearching}
                              className="flex-1 bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm disabled:opacity-50"
                            />
                            <button
                              type="button"
                              onClick={handleSearchMovies}
                              disabled={isRunning || isSearching}
                              className="px-4 bg-[#00ac47]/10 hover:bg-[#00ac47]/20 border border-[#00ac47]/20 text-[#00ac47] font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                              {isSearching ? (
                                <svg className="animate-spin h-3.5 w-3.5 text-[#00ac47]" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                              ) : (
                                '🔍 Tìm'
                              )}
                            </button>
                          </div>
                          <small className="text-zinc-500 text-[10px] mt-1 block">Nhập tên phim để tìm kiếm trước khi import/cào phim.</small>
                        </div>

                        {/* Skip existing Option inside search */}
                        <div>
                          <label className="flex items-center gap-3 p-3 bg-zinc-950 border border-white/10 rounded-xl cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={skipExisting}
                              onChange={(e) => setSkipExisting(e.target.checked)}
                              disabled={isRunning}
                              className="w-4.5 h-4.5 rounded border-white/10 text-[#00ac47] focus:ring-[#00ac47] bg-black/30 disabled:opacity-50"
                            />
                            <span className="text-xs font-semibold text-zinc-300">Chỉ cào phim chưa có</span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 border-t border-white/5 pt-4">
                    {!isRunning ? (
                      <button
                        onClick={handleStart}
                        className="w-full py-3 bg-[#00ac47] hover:bg-[#00c250] text-white font-bold rounded-xl transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
                      >
                        🚀 {crawlMode === 'search' ? 'Cào toàn bộ kết quả' : 'Bắt đầu cào'}
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        {crawlMode === 'range' && (
                          <button
                            onClick={handlePauseToggle}
                            className={`flex-1 py-3 font-bold rounded-xl transition-all shadow-md active:scale-[0.98] text-white ${isPaused ? 'bg-amber-600 hover:bg-amber-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}
                          >
                            {isPaused ? '▶️ Tiếp tục' : '⏸️ Tạm dừng'}
                          </button>
                        )}
                        <button
                          onClick={handleStop}
                          className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition-all shadow-md active:scale-[0.98]"
                        >
                          {crawlMode === 'slug' || crawlMode === 'search' ? '⏹️ Hủy cào' : '⏹️ Dừng hẳn'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tiến trình thực tế */}
                <div className="lg:col-span-2 p-6 border border-white/[0.06] bg-[#0f1118]/80 backdrop-blur-[20px] rounded-2xl shadow-lg space-y-6 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white m-0 border-b border-white/5 pb-3 flex items-center gap-2">
                      📈 Tiến trình thực tế
                    </h3>

                    {/* Metric Cards */}
                    <div className="grid grid-cols-3 gap-4 text-center mt-4">
                      <div className="p-3 bg-zinc-950/60 rounded-xl border border-white/5">
                        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Đang xử lý</div>
                        <div className="text-lg font-black text-white">
                          {crawlMode === 'slug' || crawlMode === 'search' ? (isRunning ? (crawlMode === 'slug' ? 'Slug Phim' : 'Từ khóa') : '-') : (currentCrawlPage === '-' ? '-' : `Trang ${currentCrawlPage}`)}
                        </div>
                      </div>
                      <div className="p-3 bg-zinc-950/60 rounded-xl border border-white/5">
                        <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-1">Đã cào thành công</div>
                        <div className="text-lg font-black text-emerald-400">{successCount} phim</div>
                      </div>
                      <div className="p-3 bg-zinc-950/60 rounded-xl border border-white/5">
                        <div className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-1">Thời gian</div>
                        <div className="text-lg font-black text-blue-400">{formatTime(elapsedTime)}</div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-6 space-y-2">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-zinc-400">
                          {isRunning
                            ? (crawlMode === 'slug' ? `Đang xử lý slug: ${crawlSlug}` : (crawlMode === 'search' ? `Đang tìm kiếm & cào: ${crawlKeyword}` : `Đang xử lý trang ${currentCrawlPage}/${crawlEndPage}`))
                            : 'Chưa bắt đầu'}
                        </span>
                        <span className="text-[#00ac47]">
                          {crawlMode === 'slug' || crawlMode === 'search' ? (isRunning ? 50 : (successCount > 0 ? 100 : 0)) : calculateProgress()}%
                        </span>
                      </div>
                      <div className="w-full h-3 bg-zinc-950 rounded-full overflow-hidden border border-white/5">
                        <div
                          className="bg-[#00ac47] h-full rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(0,172,71,0.5)]"
                          style={{ width: `${crawlMode === 'slug' || crawlMode === 'search' ? (isRunning ? 50 : (successCount > 0 ? 100 : 0)) : calculateProgress()}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Search Results List */}
                  {crawlMode === 'search' && searchResults.length > 0 && (
                    <div className="border border-white/[0.06] rounded-2xl overflow-hidden bg-zinc-950/40 backdrop-blur-md mt-4 shadow-inner">
                      <div className="px-5 py-3 border-b border-white/5 bg-zinc-900/60 flex justify-between items-center">
                        <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                          🔍 Kết quả tìm kiếm từ API nguồn ({searchResults.length})
                        </span>
                      </div>
                      <div className="max-h-[300px] overflow-y-auto divide-y divide-white/5 px-2">
                        {searchResults.map((item, idx) => {
                          const status = importingSlugs[item.slug];
                          return (
                            <div key={item.slug || idx} className="p-3 flex items-center justify-between gap-4 my-1 hover:bg-white/[0.02] border border-transparent hover:border-white/5 rounded-xl transition-all duration-200">
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-bold text-zinc-100 truncate flex items-center gap-2">
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                                    {idx + 1}
                                  </span>
                                  {item.name}
                                </div>
                                <div className="text-xs text-zinc-400 truncate mt-1 flex items-center gap-2">
                                  <span className="font-semibold text-zinc-500">
                                    {item.origin_name || item.original_name || 'N/A'}
                                  </span>
                                  <span className="text-[10px] text-zinc-600">•</span>
                                  <span>{item.year || 'N/A'}</span>
                                  {item.type && (
                                    <>
                                      <span className="text-[10px] text-zinc-600">•</span>
                                      <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-[#00ac47]/10 text-[#00ac47] uppercase border border-[#00ac47]/20">
                                        {item.type === 'single' ? 'Phim Lẻ' : item.type === 'series' ? 'Phim Bộ' : item.type}
                                      </span>
                                    </>
                                  )}
                                </div>
                                <div className="text-[10px] text-zinc-500 font-mono select-all mt-1 truncate max-w-md">
                                  Slug: {item.slug}
                                </div>
                              </div>
                              <div className="flex-shrink-0">
                                {status === 'loading' ? (
                                  <button disabled className="px-3.5 py-1.8 bg-zinc-800 text-zinc-500 text-xs font-bold rounded-xl flex items-center gap-2 border border-white/5 animate-pulse">
                                    <svg className="animate-spin h-3.5 w-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Đang cào
                                  </button>
                                ) : status === 'success' ? (
                                  <span className="px-3.5 py-1.8 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-xl flex items-center gap-1">
                                    ✓ Thành công
                                  </span>
                                ) : status === 'error' ? (
                                  <button
                                    onClick={() => handleImportSingleMovie(item.slug)}
                                    className="px-3.5 py-1.8 bg-rose-600/10 hover:bg-rose-600/20 border border-rose-500/20 text-rose-400 text-xs font-bold rounded-xl transition-all active:scale-95"
                                  >
                                    ⚠️ Thử lại
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleImportSingleMovie(item.slug)}
                                    className="px-3.5 py-1.8 bg-[#00ac47]/10 hover:bg-[#00ac47]/20 border border-[#00ac47]/20 text-[#00ac47] text-xs font-bold rounded-xl transition-all duration-200 active:scale-95 hover:shadow-[0_2px_8px_rgba(0,172,71,0.1)] flex items-center gap-1"
                                  >
                                    📥 Nhập phim
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Logs Console */}
                  <div className="space-y-2 mt-4 flex-1 flex flex-col min-h-[250px]">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Nhật ký trực tiếp (Console)</h4>
                      {crawlLogs.length > 0 && (
                        <button
                          onClick={() => setCrawlLogs([])}
                          className="text-xs text-zinc-500 hover:text-white transition-colors"
                        >
                          Xóa logs
                        </button>
                      )}
                    </div>
                    <div className="flex-1 min-h-[200px] max-h-[300px] rounded-xl bg-black border border-white/5 p-4 font-mono text-[11px] text-emerald-400 overflow-y-auto space-y-1.5 scroll-smooth">
                      {crawlLogs.length === 0 ? (
                        <p className="text-zinc-600 italic">Hệ thống sẵn sàng. Chọn phương thức cào và ấn "Bắt đầu cào".</p>
                      ) : (
                        crawlLogs.map((log, idx) => (
                          <p key={idx} className="m-0 whitespace-pre-wrap leading-relaxed">{log}</p>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Categories Tab */}
          {activeTab === 'categories' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-2xl font-black text-slate-800 m-0 tracking-tight">
                  Quản lý {categoryActiveTab === 'genre' ? 'Thể loại' :
                    categoryActiveTab === 'country' ? 'Quốc gia' :
                      categoryActiveTab === 'collection' ? 'Bộ sưu tập' :
                        categoryActiveTab === 'schedule' ? 'Lịch chiếu' : 'Danh mục'}
                </h2>

                <button
                  type="button"
                  onClick={handleSyncCategories}
                  disabled={isSyncingCategories}
                  className="bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl font-bold transition-all text-xs flex items-center gap-2 active:scale-95 shadow-md shrink-0"
                >
                  {isSyncingCategories ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Đang đồng bộ...
                    </>
                  ) : (
                    '🔄 Đồng bộ từ API'
                  )}
                </button>
              </div>

              {/* Sub-Tabs */}
              <div className="flex border-b border-white/5 gap-2 overflow-x-auto pb-px">
                {[
                  { key: 'genre', label: 'Thể loại' },
                  { key: 'country', label: 'Quốc gia' },
                  { key: 'collection', label: 'Bộ sưu tập' },
                  { key: 'schedule', label: 'Lịch chiếu' }
                ].map(tab => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => {
                      setCategoryActiveTab(tab.key as any);
                      // Clear form when switching tabs
                      setCatFormId(null);
                      setCatFormName('');
                      setCatFormSlug('');
                      setCatFormDescription('');
                      setCatFormColor('');
                      setCatFormOrder(0);
                      setCatFormStatus(true);
                    }}
                    className={`px-4 py-2.5 font-bold text-sm border-b-2 transition-all shrink-0 ${categoryActiveTab === tab.key
                      ? 'border-[#00ac47] text-[#00ac47]'
                      : 'border-transparent text-zinc-400 hover:text-white'
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* 2-Column Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form Column */}
                <div className="lg:col-span-1 p-6 border border-white/[0.06] bg-[#0f1118]/80 backdrop-blur-[20px] rounded-2xl shadow-lg space-y-4 self-start">
                  <h3 className="text-base font-bold text-white m-0 border-b border-white/5 pb-2">
                    {catFormId !== null ? 'Cập nhật' : 'Thêm'} {
                      categoryActiveTab === 'genre' ? 'Thể loại' :
                        categoryActiveTab === 'country' ? 'Quốc gia' :
                          categoryActiveTab === 'collection' ? 'Bộ sưu tập' : 'Lịch chiếu'
                    } Mới
                  </h3>

                  <form onSubmit={handleCategorySubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-1">Tên *</label>
                      <input
                        type="text"
                        required
                        value={catFormName}
                        onChange={(e) => setCatFormName(e.target.value)}
                        className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-[#00ac47] text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-1">Slug (Đường dẫn)</label>
                      <input
                        type="text"
                        placeholder="Ví dụ: hanh-dong"
                        value={catFormSlug}
                        onChange={(e) => setCatFormSlug(e.target.value)}
                        className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-[#00ac47] text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-1">Mô tả (hoặc Bộ lọc)</label>
                      <textarea
                        rows={3}
                        value={catFormDescription}
                        onChange={(e) => setCatFormDescription(e.target.value)}
                        className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-[#00ac47] text-sm resize-none"
                      />
                    </div>

                    {categoryActiveTab === 'genre' && (
                      <div>
                        <label className="block text-xs font-semibold text-zinc-400 mb-1">Màu sắc (Color HEX - Mã màu ví dụ #00ac47)</label>
                        <input
                          type="text"
                          placeholder="#00ac47"
                          value={catFormColor}
                          onChange={(e) => setCatFormColor(e.target.value)}
                          className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-[#00ac47] text-sm"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-1">Thứ tự</label>
                      <input
                        type="number"
                        value={catFormOrder}
                        onChange={(e) => setCatFormOrder(parseInt(e.target.value) || 0)}
                        className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-[#00ac47] text-sm"
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-2 cursor-pointer select-none py-1">
                        <input
                          type="checkbox"
                          checked={catFormStatus}
                          onChange={(e) => setCatFormStatus(e.target.checked)}
                          className="w-4 h-4 rounded bg-zinc-950 border-white/10 text-[#00ac47] focus:ring-[#00ac47]"
                        />
                        <span className="text-xs font-semibold text-zinc-300">Hiển thị</span>
                      </label>
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-white/5">
                      <button
                        type="submit"
                        className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all shadow-md active:scale-[0.98]"
                      >
                        💾 Lưu
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCatFormId(null);
                          setCatFormName('');
                          setCatFormSlug('');
                          setCatFormDescription('');
                          setCatFormColor('');
                          setCatFormOrder(0);
                          setCatFormStatus(true);
                        }}
                        className="py-2 px-3.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-semibold transition-colors"
                      >
                        Hủy
                      </button>
                    </div>
                  </form>
                </div>

                {/* Table Column */}
                <div className="lg:col-span-2 border border-white/[0.06] rounded-2xl bg-[#0f1118]/80 overflow-hidden shadow-lg self-start">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-white/5 bg-white/[0.02]">
                          <th className="p-4 font-bold text-white">Tên</th>
                          <th className="p-4 font-bold text-white">Slug</th>
                          <th className="p-4 font-bold text-white">Thứ tự</th>
                          <th className="p-4 font-bold text-white">Trạng thái</th>
                          <th className="p-4 font-bold text-white">Hành động</th>
                        </tr>
                      </thead>
                      <tbody>
                        {isCategoriesLoading ? (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-zinc-500">Đang tải danh sách...</td>
                          </tr>
                        ) : categoriesList.filter(c => c.type === categoryActiveTab).length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-zinc-500">Chưa có bản ghi nào.</td>
                          </tr>
                        ) : (
                          categoriesList
                            .filter(c => c.type === categoryActiveTab)
                            .map((cat) => (
                              <tr key={cat.id} className="border-b border-white/5 hover:bg-white/[0.01] transition-colors">
                                <td className="p-4 font-semibold text-white">{cat.name}</td>
                                <td className="p-4 text-zinc-400 font-mono text-xs">{cat.slug}</td>
                                <td className="p-4 text-zinc-400">{cat.order_num || 0}</td>
                                <td className="p-4">
                                  {cat.status ? (
                                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-xs font-semibold rounded-full border border-emerald-500/20">Hiện</span>
                                  ) : (
                                    <span className="px-2 py-0.5 bg-zinc-800 text-zinc-500 text-xs font-semibold rounded-full border border-transparent">Ẩn</span>
                                  )}
                                </td>
                                <td className="p-4 flex items-center gap-1.5">
                                  {/* Edit Button */}
                                  <button
                                    onClick={() => {
                                      setCatFormId(cat.id);
                                      setCatFormName(cat.name);
                                      setCatFormSlug(cat.slug);
                                      setCatFormDescription(cat.description || '');
                                      setCatFormColor(cat.color || '');
                                      setCatFormOrder(cat.order_num || 0);
                                      setCatFormStatus(!!cat.status);
                                    }}
                                    className="p-1.5 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white rounded transition-all"
                                    title="Sửa"
                                  >
                                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"></path></svg>
                                  </button>
                                  {/* Delete Button */}
                                  <button
                                    onClick={() => handleDeleteCategory(cat.id)}
                                    className="p-1.5 bg-rose-600/10 hover:bg-rose-600 text-rose-400 hover:text-white rounded transition-all"
                                    title="Xóa"
                                  >
                                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"></path></svg>
                                  </button>
                                </td>
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Send Mail Tab */}
          {activeTab === 'sendmail' && (
            <div className="space-y-6 animate-fadeIn">
              <h2 className="text-2xl font-black text-slate-800 m-0 tracking-tight">Gửi Email Cho Thành Viên</h2>

              <div className="p-8 border border-white/[0.06] bg-[#0f1118]/80 backdrop-blur-[20px] rounded-2xl shadow-lg">
                <form onSubmit={handleSendEmailTab} className="space-y-6 max-w-2xl">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Đối tượng nhận *</label>
                    <select
                      value={mailTabTarget}
                      onChange={(e) => setMailTabTarget(e.target.value)}
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm cursor-pointer"
                    >
                      <option value="all">Tất cả thành viên trong hệ thống</option>
                      <option value="custom">Gửi tới địa chỉ email cụ thể</option>
                    </select>
                  </div>

                  {mailTabTarget === 'custom' && (
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Địa chỉ Email người nhận *</label>
                      <input
                        type="email"
                        required
                        placeholder="example@gmail.com"
                        value={mailTabCustomEmail}
                        onChange={(e) => setMailTabCustomEmail(e.target.value)}
                        className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Tiêu đề thư (Subject) *</label>
                    <input
                      type="text"
                      required
                      placeholder="Nhập tiêu đề email..."
                      value={mailTabSubject}
                      onChange={(e) => setMailTabSubject(e.target.value)}
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Nội dung thư (Hỗ trợ định dạng HTML) *</label>
                    <textarea
                      rows={10}
                      required
                      placeholder="Chào bạn, đây là thông báo từ hệ thống Tô Phim..."
                      value={mailTabContent}
                      onChange={(e) => setMailTabContent(e.target.value)}
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm resize-y"
                    />
                  </div>

                  <div className="flex justify-end border-t border-white/5 pt-6">
                    <button
                      type="submit"
                      disabled={isSendingMailTab}
                      className="px-6 py-3 bg-[#00ac47] hover:bg-[#00c250] text-white font-bold rounded-xl transition-all shadow-md active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
                    >
                      {isSendingMailTab ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Đang gửi thư...
                        </>
                      ) : (
                        'Gửi Email Ngay'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-slate-800 m-0 tracking-tight">Quản Lý Thông Báo Hệ Thống</h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form Column */}
                <div className="lg:col-span-1 border border-white/[0.06] bg-[#0f1118]/80 backdrop-blur-[20px] rounded-2xl shadow-lg self-start overflow-hidden">
                  <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                    <h3 className="text-base font-bold text-white m-0">Tạo Thông Báo Mới</h3>
                  </div>
                  <form onSubmit={handleCreateNotification} className="p-6 space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Tiêu đề *</label>
                      <input type="text" name="title" required placeholder="Nhập tiêu đề..." className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Loại thông báo</label>
                      <select name="type" className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm">
                        <option value="system">Hệ thống</option>
                        <option value="premium">Premium</option>
                        <option value="like">Lượt thích</option>
                        <option value="reply">Phản hồi</option>
                        <option value="family">Gia đình</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Nội dung thông báo *</label>
                      <textarea name="message" required rows={5} placeholder="Nhập nội dung..." className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm resize-none"></textarea>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Đường dẫn chi tiết (Link - Không bắt buộc)</label>
                      <input type="text" name="link" placeholder="Ví dụ: /pages/profile" className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">ID Thành viên nhận (Để trống để gửi tất cả)</label>
                      <input type="number" name="user_id" placeholder="Ví dụ: 12" className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm" />
                    </div>
                    <button type="submit" className="w-full py-3 bg-[#00ac47] hover:bg-[#00c250] text-white font-bold rounded-xl text-sm transition-all shadow-md active:scale-[0.98]">
                      Gửi thông báo
                    </button>
                  </form>
                </div>

                {/* List Column */}
                <div className="lg:col-span-2 border border-white/[0.06] bg-[#0f1118]/80 backdrop-blur-[20px] rounded-2xl shadow-lg overflow-hidden">
                  <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                    <h3 className="text-base font-bold text-white m-0">Lịch Sử Thông Báo Đã Gửi</h3>
                  </div>
                  <div className="p-6">
                    {isAdminNotifLoading ? (
                      <div className="text-center py-10 text-zinc-500 text-sm">Đang tải danh sách thông báo...</div>
                    ) : adminNotifications.length === 0 ? (
                      <div className="text-center py-10 text-zinc-500 text-sm">Chưa có thông báo nào được gửi.</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-white/5 text-zinc-400">
                              <th className="pb-3 font-bold">Thời gian</th>
                              <th className="pb-3 font-bold">Người nhận</th>
                              <th className="pb-3 font-bold">Loại</th>
                              <th className="pb-3 font-bold">Tiêu đề</th>
                              <th className="pb-3 font-bold">Nội dung</th>
                              <th className="pb-3 font-bold text-right">Thao tác</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {adminNotifications.map((n: any) => (
                              <tr key={n.id} className="text-zinc-300 hover:text-white transition-colors">
                                <td className="py-3 pr-2 whitespace-nowrap text-zinc-500">
                                  {new Date(n.created_at).toLocaleDateString('vi-VN')}
                                </td>
                                <td className="py-3 pr-2 font-semibold">
                                  {n.user_id ? `User #${n.user_id} (${n.users?.name || 'N/A'})` : 'Tất cả'}
                                </td>
                                <td className="py-3 pr-2">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${n.type === 'premium' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-purple-500/10 text-purple-500 border border-purple-500/20'
                                    }`}>
                                    {n.type}
                                  </span>
                                </td>
                                <td className="py-3 pr-2 font-bold max-w-[120px] truncate" title={n.title}>
                                  {n.title}
                                </td>
                                <td className="py-3 pr-2 max-w-[200px] truncate" title={n.message}>
                                  {n.message}
                                </td>
                                <td className="py-3 text-right">
                                  <button
                                    onClick={() => handleDeleteNotification(n.id)}
                                    className="px-2 py-1 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded border border-red-500/25 transition-all text-[10px] font-bold"
                                  >
                                    Xóa
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Movie Requests Tab */}
          {activeTab === 'requests' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-white m-0 tracking-tight">Quản Lý Yêu Cầu Phim</h2>
                <button
                  onClick={loadRequests}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl text-xs flex items-center gap-2 border border-white/10 transition-all active:scale-95 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"></path>
                  </svg>
                  Làm mới
                </button>
              </div>

              {/* Filter Tabs */}
              <div className="flex gap-2">
                {(['pending', 'completed', 'rejected'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      setRequestsFilter(status);
                    }}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all border ${requestsFilter === status
                      ? 'bg-[#00ac47] text-white border-transparent'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                      }`}
                  >
                    {status === 'pending' ? 'Đang chờ' : status === 'completed' ? 'Hoàn thành' : 'Từ chối'}
                  </button>
                ))}
              </div>

              <div className="border border-slate-200 bg-white rounded-2xl shadow-sm overflow-hidden text-slate-800">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-800 m-0">Danh sách phim được yêu cầu</h3>
                  <span className="text-xs text-slate-500 font-semibold bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                    Tổng số: {requestsList.length}
                  </span>
                </div>
                <div className="p-6">
                  {isRequestsLoading ? (
                    <div className="text-center py-20 text-zinc-500 text-sm flex flex-col items-center justify-center gap-3">
                      <div className="w-8 h-8 border-3 border-zinc-700 border-t-[#00ac47] rounded-full animate-spin"></div>
                      Đang tải danh sách yêu cầu...
                    </div>
                  ) : requestsList.length === 0 ? (
                    <div className="text-center py-20 text-zinc-500 text-sm">
                      Chưa có yêu cầu phim nào trong danh mục này.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-400">
                            <th className="pb-3 font-bold">Người yêu cầu</th>
                            <th className="pb-3 font-bold">Tên phim & Tên gốc</th>
                            <th className="pb-3 font-bold">Links</th>
                            <th className="pb-3 font-bold">Nội dung / Lý do</th>
                            <th className="pb-3 font-bold">Thời gian</th>
                            <th className="pb-3 font-bold">Trạng thái</th>
                            {requestsFilter === 'pending' && <th className="pb-3 font-bold text-right">Thao tác</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {requestsList.map((req: any) => {
                            return (
                              <tr key={req.id} className="text-slate-600 hover:bg-slate-50/50 transition-colors">
                                <td className="py-4 pr-3">
                                  <div className="flex items-center gap-3">
                                    <img
                                      src={req.users?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(req.users?.name || 'User')}`}
                                      alt={req.users?.name || 'User'}
                                      className="w-8 h-8 rounded-full border border-slate-200 object-cover"
                                    />
                                    <div>
                                      <div className="font-bold text-slate-800">{req.users?.name || `User #${req.user_id}`}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-4 pr-3 max-w-[200px]">
                                  <div className="font-bold text-slate-800 truncate" title={req.title}>
                                    {req.title}
                                  </div>
                                  {req.original_title && (
                                    <div className="text-[10px] text-zinc-400 italic truncate mt-0.5" title={req.original_title}>
                                      {req.original_title}
                                    </div>
                                  )}
                                </td>
                                <td className="py-4 pr-3 space-y-1">
                                  {req.imdb_url && (
                                    <a
                                      href={req.imdb_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:underline block truncate max-w-[150px]"
                                    >
                                      IMDb/TMDb
                                    </a>
                                  )}
                                  {req.reference_url && (
                                    <a
                                      href={req.reference_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-emerald-600 hover:underline block truncate max-w-[150px]"
                                    >
                                      Link tham khảo
                                    </a>
                                  )}
                                  {!req.imdb_url && !req.reference_url && <span className="text-slate-400">-</span>}
                                </td>
                                <td className="py-4 pr-3 max-w-[250px]">
                                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                                    <div className="text-slate-600 font-medium whitespace-pre-wrap leading-relaxed">
                                      {req.description}
                                    </div>
                                  </div>
                                </td>
                                <td className="py-4 pr-3 whitespace-nowrap text-slate-400 font-semibold">
                                  {new Date(req.created_at).toLocaleString('vi-VN')}
                                </td>
                                <td className="py-4 pr-3 whitespace-nowrap">
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${req.status === 'completed'
                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                    : req.status === 'rejected'
                                      ? 'bg-rose-50 text-rose-600 border-rose-200'
                                      : 'bg-amber-50 text-amber-600 border-amber-200'
                                    }`}>
                                    {req.status === 'completed' ? 'Hoàn thành' : req.status === 'rejected' ? 'Từ chối' : 'Đang chờ'}
                                  </span>
                                </td>
                                {requestsFilter === 'pending' && (
                                  <td className="py-4 text-right space-x-1.5 whitespace-nowrap">
                                    <button
                                      onClick={() => handleUpdateRequestStatus(req.id, 'completed')}
                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors cursor-pointer text-[10px]"
                                    >
                                      Hoàn thành
                                    </button>
                                    <button
                                      onClick={() => handleUpdateRequestStatus(req.id, 'rejected')}
                                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition-colors cursor-pointer text-[10px]"
                                    >
                                      Từ chối
                                    </button>
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Error Reports Tab */}
          {activeTab === 'error_reports' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-white m-0 tracking-tight">Quản Lý Báo Cáo Lỗi Phim</h2>
                <button
                  onClick={loadErrorReports}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl text-xs flex items-center gap-2 border border-white/10 transition-all active:scale-95 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"></path>
                  </svg>
                  Làm mới
                </button>
              </div>

              <div className="border border-slate-200 bg-white rounded-2xl shadow-sm overflow-hidden text-slate-800">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-800 m-0">Danh sách báo cáo từ thành viên</h3>
                  <span className="text-xs text-slate-500 font-semibold bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                    Tổng số: {errorReportsList.length}
                  </span>
                </div>
                <div className="p-6">
                  {isReportsLoading ? (
                    <div className="text-center py-20 text-zinc-500 text-sm flex flex-col items-center justify-center gap-3">
                      <div className="w-8 h-8 border-3 border-zinc-700 border-t-amber-400 rounded-full animate-spin"></div>
                      Đang tải danh sách báo cáo...
                    </div>
                  ) : errorReportsList.length === 0 ? (
                    <div className="text-center py-20 text-zinc-500 text-sm">
                      Chưa có báo cáo lỗi phim nào được gửi.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-400">
                            <th className="pb-3 font-bold">Người báo cáo</th>
                            <th className="pb-3 font-bold">Phim & Tập</th>
                            <th className="pb-3 font-bold">Nội dung lỗi</th>
                            <th className="pb-3 font-bold">Thời gian</th>
                            <th className="pb-3 font-bold">Trạng thái</th>
                            <th className="pb-3 font-bold text-right">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {errorReportsList.map((report: any) => {
                            const isResolved = report.status === 'resolved';
                            return (
                              <tr key={report.id} className="text-slate-600 hover:bg-slate-50/50 transition-colors">
                                <td className="py-4 pr-3">
                                  <div className="flex items-center gap-3">
                                    <img
                                      src={report.users?.avatar || '/avt/meme/avatar-hai-huoc-vo-tri-0.jpg'}
                                      alt={report.users?.name || 'User'}
                                      className="w-8 h-8 rounded-full border border-slate-200 object-cover"
                                    />
                                    <div>
                                      <div className="font-bold text-slate-800">{report.users?.name || `User #${report.user_id}`}</div>
                                      <div className="text-[10px] text-slate-400 font-semibold">{report.users?.email}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-4 pr-3 max-w-[200px]">
                                  <div className="font-bold text-slate-800 truncate" title={report.movies?.title || 'N/A'}>
                                    {report.movies?.title || 'N/A'}
                                  </div>
                                  <div className="text-[10px] text-amber-600 font-bold mt-0.5">
                                    {report.episode_name || 'N/A'}
                                  </div>
                                </td>
                                <td className="py-4 pr-3 max-w-[250px]">
                                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 space-y-1">
                                    <div className="text-slate-600 font-medium whitespace-pre-wrap leading-relaxed">
                                      {report.message}
                                    </div>
                                  </div>
                                </td>
                                <td className="py-4 pr-3 whitespace-nowrap text-slate-400 font-semibold">
                                  {new Date(report.created_at).toLocaleString('vi-VN')}
                                </td>
                                <td className="py-4 pr-3 whitespace-nowrap">
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${isResolved
                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                    : 'bg-amber-50 text-amber-600 border-amber-200'
                                    }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${isResolved ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                                    {isResolved ? 'Đã khắc phục' : 'Chờ xử lý'}
                                  </span>
                                </td>
                                <td className="py-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    {isResolved ? (
                                      <button
                                        onClick={() => handleUpdateReportStatus(report.id, 'pending')}
                                        className="px-2.5 py-1.5 bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-white rounded-lg border border-amber-500/20 transition-all text-[10px] font-extrabold cursor-pointer"
                                        title="Đánh dấu chờ xử lý"
                                      >
                                        Mở lại
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => handleUpdateReportStatus(report.id, 'resolved')}
                                        className="px-2.5 py-1.5 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white rounded-lg border border-emerald-500/20 transition-all text-[10px] font-extrabold flex items-center gap-1 cursor-pointer"
                                        title="Đánh dấu đã sửa"
                                      >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"></path>
                                        </svg>
                                        Đã sửa
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleDeleteReport(report.id)}
                                      className="px-2.5 py-1.5 bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white rounded-lg border border-red-500/20 transition-all text-[10px] font-extrabold cursor-pointer"
                                      title="Xóa báo cáo"
                                    >
                                      Xóa
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Contacts Tab */}
          {activeTab === 'contacts' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-slate-800 m-0 tracking-tight">Quản Lý Liên Hệ</h2>
                <button
                  onClick={loadContacts}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl text-xs flex items-center gap-2 border border-white/10 transition-all active:scale-95 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"></path>
                  </svg>
                  Làm mới
                </button>
              </div>

              {/* Contact Info Form Card */}
              <div className="border border-white/[0.06] bg-[#0f1118]/80 backdrop-blur-[20px] rounded-2xl shadow-lg overflow-hidden">
                <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                  <h3 className="text-base font-bold text-white m-0">⚙️ Cấu hình thông tin liên hệ Website</h3>
                </div>
                <div className="p-6">
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    const target = e.target as HTMLFormElement;
                    const formData = new FormData(target);
                    const email = formData.get('contact_email') as string;
                    const facebook = formData.get('social_facebook') as string;
                    const facebookGroup = formData.get('social_facebook_group') as string;
                    const telegram = formData.get('social_telegram') as string;
                    const discord = formData.get('social_discord') as string;
                    const youtube = formData.get('social_youtube') as string;
                    const tiktok = formData.get('social_tiktok') as string;
                    const instagram = formData.get('social_instagram') as string;
                    const socialX = formData.get('social_x') as string;
                    const threads = formData.get('social_threads') as string;

                    try {
                      const res = await fetch('/api/admin/settings', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          contact_email: email,
                          social_facebook: facebook,
                          social_facebook_group: facebookGroup,
                          social_telegram: telegram,
                          social_discord: discord,
                          social_youtube: youtube,
                          social_tiktok: tiktok,
                          social_instagram: instagram,
                          social_x: socialX,
                          social_threads: threads,
                        })
                      });
                      const data = await res.json();
                      if (res.ok && data.success) {
                        alert('Đã lưu thông tin liên hệ thành công!');
                        setSettings(prev => ({
                          ...prev,
                          contact_email: email,
                          social_facebook: facebook,
                          social_facebook_group: facebookGroup,
                          social_telegram: telegram,
                          social_discord: discord,
                          social_youtube: youtube,
                          social_tiktok: tiktok,
                          social_instagram: instagram,
                          social_x: socialX,
                          social_threads: threads,
                        }));
                      } else {
                        alert(data.error || 'Có lỗi xảy ra.');
                      }
                    } catch (err) {
                      console.error(err);
                      alert('Lỗi kết nối.');
                    }
                  }} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Email Liên Hệ</label>
                        <input
                          type="email"
                          name="contact_email"
                          value={settings['contact_email'] || ''}
                          onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })}
                          className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm"
                          placeholder="contact@tophim.com"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Facebook Fanpage</label>
                        <input
                          type="text"
                          name="social_facebook"
                          value={settings['social_facebook'] || ''}
                          onChange={(e) => setSettings({ ...settings, social_facebook: e.target.value })}
                          className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm"
                          placeholder="https://facebook.com/page"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Facebook Group</label>
                        <input
                          type="text"
                          name="social_facebook_group"
                          value={settings['social_facebook_group'] || ''}
                          onChange={(e) => setSettings({ ...settings, social_facebook_group: e.target.value })}
                          className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm"
                          placeholder="https://facebook.com/groups/..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Telegram</label>
                        <input
                          type="text"
                          name="social_telegram"
                          value={settings['social_telegram'] || ''}
                          onChange={(e) => setSettings({ ...settings, social_telegram: e.target.value })}
                          className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm"
                          placeholder="https://t.me"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Discord</label>
                        <input
                          type="text"
                          name="social_discord"
                          value={settings['social_discord'] || ''}
                          onChange={(e) => setSettings({ ...settings, social_discord: e.target.value })}
                          className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm"
                          placeholder="https://discord.gg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">YouTube</label>
                        <input
                          type="text"
                          name="social_youtube"
                          value={settings['social_youtube'] || ''}
                          onChange={(e) => setSettings({ ...settings, social_youtube: e.target.value })}
                          className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm"
                          placeholder="https://youtube.com"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">TikTok</label>
                        <input
                          type="text"
                          name="social_tiktok"
                          value={settings['social_tiktok'] || ''}
                          onChange={(e) => setSettings({ ...settings, social_tiktok: e.target.value })}
                          className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm"
                          placeholder="https://tiktok.com"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Instagram</label>
                        <input
                          type="text"
                          name="social_instagram"
                          value={settings['social_instagram'] || ''}
                          onChange={(e) => setSettings({ ...settings, social_instagram: e.target.value })}
                          className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm"
                          placeholder="https://instagram.com"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">X (Twitter)</label>
                        <input
                          type="text"
                          name="social_x"
                          value={settings['social_x'] || ''}
                          onChange={(e) => setSettings({ ...settings, social_x: e.target.value })}
                          className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm"
                          placeholder="https://x.com"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Threads</label>
                        <input
                          type="text"
                          name="social_threads"
                          value={settings['social_threads'] || ''}
                          onChange={(e) => setSettings({ ...settings, social_threads: e.target.value })}
                          className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm"
                          placeholder="https://threads.net"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        className="px-6 py-2.5 bg-[#00ac47] hover:bg-[#00c250] text-white font-bold rounded-xl text-xs transition-all shadow-md active:scale-[0.98]"
                      >
                        Lưu thông tin liên hệ
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              <div className="border border-white/[0.06] bg-[#0f1118]/80 backdrop-blur-[20px] rounded-2xl shadow-lg overflow-hidden">
                <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                  <h3 className="text-base font-bold text-white m-0">Danh sách tin nhắn liên hệ</h3>
                  <span className="text-xs text-zinc-400 font-semibold bg-zinc-950 px-3 py-1 rounded-full border border-white/5">
                    Tổng số: {contactsTotal}
                  </span>
                </div>
                <div className="p-6">
                  {isContactsLoading ? (
                    <div className="text-center py-20 text-zinc-500 text-sm flex flex-col items-center justify-center gap-3">
                      <div className="w-8 h-8 border-3 border-zinc-700 border-t-emerald-400 rounded-full animate-spin"></div>
                      Đang tải danh sách liên hệ...
                    </div>
                  ) : contactsList.length === 0 ? (
                    <div className="text-center py-20 text-zinc-500 text-sm">
                      Chưa có tin nhắn liên hệ nào được gửi.
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-white/5 text-zinc-400">
                              <th className="pb-3 font-bold">Người gửi</th>
                              <th className="pb-3 font-bold">Chủ đề</th>
                              <th className="pb-3 font-bold">Nội dung tin nhắn</th>
                              <th className="pb-3 font-bold">Thời gian</th>
                              <th className="pb-3 font-bold">Trạng thái</th>
                              <th className="pb-3 font-bold text-right">Thao tác</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {contactsList.map((contact: any) => {
                              const isProcessed = contact.status === 'processed';
                              return (
                                <tr key={contact.id} className="text-zinc-300 hover:text-white transition-colors">
                                  <td className="py-4 pr-3">
                                    <div className="font-bold text-zinc-200">{contact.name}</div>
                                    <div className="text-[10px] text-zinc-500 font-semibold mt-0.5">{contact.email}</div>
                                  </td>
                                  <td className="py-4 pr-3 max-w-[180px]">
                                    <div className="font-semibold text-zinc-300 truncate" title={contact.subject || 'Không có tiêu đề'}>
                                      {contact.subject || '(Không có chủ đề)'}
                                    </div>
                                  </td>
                                  <td className="py-4 pr-3 max-w-[300px]">
                                    <div className="bg-zinc-950/40 border border-white/5 rounded-lg p-2.5">
                                      <div className="text-zinc-400 font-medium whitespace-pre-wrap leading-relaxed">
                                        {contact.message}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-4 pr-3 whitespace-nowrap text-zinc-500 font-semibold">
                                    {new Date(contact.created_at).toLocaleString('vi-VN')}
                                  </td>
                                  <td className="py-4 pr-3 whitespace-nowrap">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${isProcessed
                                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                      : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                      }`}>
                                      <span className={`w-1.5 h-1.5 rounded-full ${isProcessed ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                                      {isProcessed ? 'Đã xử lý' : 'Chờ xử lý'}
                                    </span>
                                  </td>
                                  <td className="py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      {isProcessed ? (
                                        <button
                                          onClick={() => handleUpdateContactStatus(contact.id, 'pending')}
                                          className="px-2.5 py-1.5 bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-zinc-950 rounded-lg border border-amber-500/20 transition-all text-[10px] font-extrabold cursor-pointer"
                                          title="Đánh dấu chờ xử lý"
                                        >
                                          Mở lại
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => handleUpdateContactStatus(contact.id, 'processed')}
                                          className="px-2.5 py-1.5 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-lg border border-emerald-500/20 transition-all text-[10px] font-extrabold flex items-center gap-1 cursor-pointer"
                                          title="Đánh dấu đã xử lý"
                                        >
                                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"></path>
                                          </svg>
                                          Đã xử lý
                                        </button>
                                      )}
                                      <button
                                        onClick={() => {
                                          setMailTabCustomEmail(contact.email);
                                          setMailTabSubject(`Phản hồi liên hệ: ${contact.subject || ''}`);
                                          setMailTabContent(`Chào ${contact.name},\n\nChúng tôi đã nhận được tin nhắn liên hệ của bạn với nội dung:\n"${contact.message}"\n\n...\n\nTrân trọng,\nBan quản trị Tô Phim`);
                                          setMailTabTarget('custom');
                                          setActiveTab('sendmail');
                                        }}
                                        className="px-2.5 py-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white rounded-lg border border-blue-500/20 transition-all text-[10px] font-extrabold cursor-pointer"
                                        title="Trả lời qua email"
                                      >
                                        Trả lời
                                      </button>
                                      <button
                                        onClick={() => handleDeleteContact(contact.id)}
                                        className="px-2.5 py-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg border border-red-500/20 transition-all text-[10px] font-extrabold cursor-pointer"
                                        title="Xóa tin nhắn"
                                      >
                                        Xóa
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination */}
                      {contactsTotal > 0 && (
                        <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/5">
                          <span className="text-xs text-zinc-500 font-semibold">Hiển thị {(contactsPage - 1) * 10 + 1} - {Math.min(contactsPage * 10, contactsTotal)} trong tổng số {contactsTotal} tin nhắn</span>
                          <div className="flex gap-2">
                            <button
                              disabled={contactsPage <= 1}
                              onClick={() => setContactsPage(p => p - 1)}
                              className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/5 hover:bg-zinc-800 text-white text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                              Trước
                            </button>
                            <span className="text-xs font-bold px-3 py-1.5 bg-zinc-950 border border-[#00ac47]/20 rounded-lg text-[#00ac47]">
                              Trang {contactsPage} / {Math.ceil(contactsTotal / 10)}
                            </span>
                            <button
                              disabled={contactsPage >= Math.ceil(contactsTotal / 10)}
                              onClick={() => setContactsPage(p => p + 1)}
                              className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/5 hover:bg-zinc-800 text-white text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                              Sau
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6 animate-fadeIn">
              <h2 className="text-2xl font-black text-slate-800 m-0 tracking-tight">Cấu Hình Hệ Thống</h2>

              <form onSubmit={handleSaveSettings} className="p-8 border border-white/[0.06] bg-[#0f1118]/80 backdrop-blur-[20px] rounded-2xl shadow-lg space-y-6">
                {/* Sub-Tabs */}
                <div className="flex border-b border-white/5 gap-2 overflow-x-auto pb-px mb-6">
                  {[
                    { key: 'website', label: '🌐 Thiết lập Website' },
                    { key: 'google', label: '🔑 Cấu hình Google' },
                    { key: 'smtp', label: '📧 SMTP Gửi Mail' },
                    { key: 'advanced', label: '🛠️ Nâng cao & Bảo trì' },
                    { key: 'popup', label: '💬 Popup Trang Chủ' }
                  ].map(tab => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setSettingsActiveTab(tab.key as any)}
                      className={`px-4 py-2.5 font-bold text-sm border-b-2 transition-all shrink-0 ${settingsActiveTab === tab.key
                        ? 'border-[#00ac47] text-[#00ac47]'
                        : 'border-transparent text-zinc-400 hover:text-white'
                        }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {settingsActiveTab === 'website' && (
                  <div className="space-y-6 animate-fadeIn">
                    <h3 className="text-lg font-bold text-white m-0 border-b border-white/5 pb-2">🌐 Thiết lập Website</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Tên Website</label>
                        <input
                          type="text"
                          value={settings['site_name'] || ''}
                          onChange={(e) => setSettings({ ...settings, site_name: e.target.value })}
                          className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Tiêu Đề Trang (Site Title)</label>
                        <input
                          type="text"
                          value={settings['site_title'] || ''}
                          onChange={(e) => setSettings({ ...settings, site_title: e.target.value })}
                          className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Mô Tả SEO (Site Description)</label>
                        <textarea
                          rows={3}
                          value={settings['site_description'] || ''}
                          onChange={(e) => setSettings({ ...settings, site_description: e.target.value })}
                          className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm resize-none"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Từ khóa SEO (Site Keywords)</label>
                        <input
                          type="text"
                          placeholder="Ví dụ: xem phim online, phim vietsub, hubphim..."
                          value={settings['site_keywords'] || ''}
                          onChange={(e) => setSettings({ ...settings, site_keywords: e.target.value })}
                          className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Link tải App Smart TV</label>
                        <input
                          type="text"
                          placeholder="https://..."
                          value={settings['app_download_link_tv'] || ''}
                          onChange={(e) => setSettings({ ...settings, app_download_link_tv: e.target.value })}
                          className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Link tải App Điện Thoại</label>
                        <input
                          type="text"
                          placeholder="https://..."
                          value={settings['app_download_link_phone'] || ''}
                          onChange={(e) => setSettings({ ...settings, app_download_link_phone: e.target.value })}
                          className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">TMDB API Key (Cho tính năng đồng bộ phim)</label>
                        <input
                          type="text"
                          placeholder="Nhập TMDB API Key (v3 auth)..."
                          value={settings['tmdb_api_key'] || ''}
                          onChange={(e) => setSettings({ ...settings, tmdb_api_key: e.target.value })}
                          className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm"
                        />
                      </div>
                      <div className="md:col-span-1">
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">OMDb API Key (Để lấy điểm IMDb)</label>
                        <input
                          type="text"
                          placeholder="Nhập OMDb API Key..."
                          value={settings['omdb_api_key'] || ''}
                          onChange={(e) => setSettings({ ...settings, omdb_api_key: e.target.value })}
                          className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm"
                        />
                      </div>
                      <div className="md:col-span-1">
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Giphy API Key (Cho tính năng comment ảnh GIF)</label>
                        <input
                          type="text"
                          placeholder="Nhập Giphy API Key..."
                          value={settings['giphy_api_key'] || ''}
                          onChange={(e) => setSettings({ ...settings, giphy_api_key: e.target.value })}
                          className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Logo URL</label>
                        <input
                          type="text"
                          value={settings['logo_url'] || ''}
                          onChange={(e) => setSettings({ ...settings, logo_url: e.target.value })}
                          className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Favicon URL</label>
                        <input
                          type="text"
                          value={settings['favicon_url'] || ''}
                          onChange={(e) => setSettings({ ...settings, favicon_url: e.target.value })}
                          className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Slogan Website</label>
                        <input
                          type="text"
                          value={settings['site_slogan'] || ''}
                          onChange={(e) => setSettings({ ...settings, site_slogan: e.target.value })}
                          className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {settingsActiveTab === 'google' && (
                  <div className="space-y-6 animate-fadeIn">
                    <h3 className="text-lg font-bold text-white m-0 border-b border-white/5 pb-2">🔑 Cấu hình Google & Analytics</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Google Client ID (Đăng nhập)</label>
                        <input
                          type="text"
                          value={settings['google_client_id'] || ''}
                          onChange={(e) => setSettings({ ...settings, google_client_id: e.target.value })}
                          className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Google Client Secret</label>
                        <input
                          type="password"
                          value={settings['google_client_secret'] || ''}
                          onChange={(e) => setSettings({ ...settings, google_client_secret: e.target.value })}
                          className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Google Analytics ID (Ví dụ: G-XXXXXXXXXX)</label>
                        <input
                          type="text"
                          value={settings['google_analytics_id'] || ''}
                          onChange={(e) => setSettings({ ...settings, google_analytics_id: e.target.value })}
                          className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-[#FFD166] uppercase tracking-wider mb-2">Gemini API Key (Cho tính năng AI Tìm phim)</label>
                        <input
                          type="text"
                          value={settings['gemini_api_key'] || ''}
                          onChange={(e) => setSettings({ ...settings, gemini_api_key: e.target.value })}
                          placeholder="AIzaSy..."
                          className="w-full bg-zinc-950 border border-[#FFD166]/30 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#FFD166] transition-all text-sm shadow-[0_0_10px_rgba(255,209,102,0.05)] focus:shadow-[0_0_15px_rgba(255,209,102,0.15)]"
                        />
                        <p className="text-xs text-zinc-500 mt-2">Lấy key miễn phí tại <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-blue-400 hover:underline">Google AI Studio</a>.</p>
                      </div>
                    </div>
                  </div>
                )}

                {settingsActiveTab === 'smtp' && (
                  <div className="space-y-6 animate-fadeIn">
                    <h3 className="text-lg font-bold text-white m-0 border-b border-white/5 pb-2">📧 Cấu hình SMTP gửi mail</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">SMTP Host</label>
                        <input
                          type="text"
                          value={settings['smtp_host'] || ''}
                          onChange={(e) => setSettings({ ...settings, smtp_host: e.target.value })}
                          className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">SMTP Port</label>
                        <input
                          type="text"
                          value={settings['smtp_port'] || ''}
                          onChange={(e) => setSettings({ ...settings, smtp_port: e.target.value })}
                          className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">SMTP User</label>
                        <input
                          type="text"
                          value={settings['smtp_user'] || ''}
                          onChange={(e) => setSettings({ ...settings, smtp_user: e.target.value })}
                          className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">SMTP Password</label>
                        <input
                          type="password"
                          value={settings['smtp_pass'] || ''}
                          onChange={(e) => setSettings({ ...settings, smtp_pass: e.target.value })}
                          className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">SMTP Encryption (tls / ssl)</label>
                        <select
                          value={settings['smtp_crypto'] || 'tls'}
                          onChange={(e) => setSettings({ ...settings, smtp_crypto: e.target.value })}
                          className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm cursor-pointer"
                        >
                          <option value="tls">STARTTLS (Thông thường dùng cổng 587)</option>
                          <option value="ssl">SSL/TLS (Thông thường dùng cổng 465)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {settingsActiveTab === 'advanced' && (
                  <div className="space-y-6 animate-fadeIn">
                    <h3 className="text-lg font-bold text-white m-0 border-b border-white/5 pb-2">🛠️ Tích hợp nâng cao & Bảo trì</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Mã nhúng Header (Scripts)</label>
                        <textarea
                          rows={4}
                          value={settings['header_scripts'] || ''}
                          onChange={(e) => setSettings({ ...settings, header_scripts: e.target.value })}
                          placeholder="<!-- Chèn thẻ script tracking, css... -->"
                          className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm resize-y"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Mã nhúng Footer (Scripts)</label>
                        <textarea
                          rows={4}
                          value={settings['footer_scripts'] || ''}
                          onChange={(e) => setSettings({ ...settings, footer_scripts: e.target.value })}
                          placeholder="<!-- Chèn thẻ script chat box, analytics... -->"
                          className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm resize-y"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Chế độ Bảo Trì</label>
                        <select
                          value={settings['maintenance_mode'] || 'false'}
                          onChange={(e) => setSettings({ ...settings, maintenance_mode: e.target.value })}
                          className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm cursor-pointer"
                        >
                          <option value="false">Tắt</option>
                          <option value="true">Bật</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Lý do bảo trì</label>
                        <textarea
                          rows={3}
                          placeholder="Hệ thống đang nâng cấp. Vui lòng quay lại sau..."
                          value={settings['maintenance_reason'] || ''}
                          onChange={(e) => setSettings({ ...settings, maintenance_reason: e.target.value })}
                          className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm resize-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {settingsActiveTab === 'popup' && (
                  <div className="space-y-6 animate-fadeIn">
                    <h3 className="text-lg font-bold text-white m-0 border-b border-white/5 pb-2">💬 Cấu hình Popup Trang Chủ</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Trạng thái Popup</label>
                        <select
                          value={settings['homepage_popup_enabled'] || 'false'}
                          onChange={(e) => setSettings({ ...settings, homepage_popup_enabled: e.target.value })}
                          className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm cursor-pointer"
                        >
                          <option value="false">Tắt</option>
                          <option value="true">Bật</option>
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Nội dung Popup</label>
                        <div className="rounded-xl overflow-hidden border border-white/10">
                          <TiptapEditor
                            value={settings['homepage_popup_content'] || ''}
                            onChange={(content) => setSettings({ ...settings, homepage_popup_content: content })}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Form submit */}
                <div className="flex justify-end border-t border-white/5 pt-6">
                  <button
                    type="submit"
                    disabled={isSavingSettings}
                    className="px-6 py-3 bg-[#00ac47] hover:bg-[#00c250] text-white font-bold rounded-xl transition-all shadow-md active:scale-[0.98] disabled:opacity-50"
                  >
                    {isSavingSettings ? 'Đang lưu cấu hình...' : 'Lưu Thay Đổi'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Advertisement Settings Config Tab */}
          {activeTab === 'quang-cao' && (
            <div className="space-y-6 animate-fadeIn">
              <h2 className="text-2xl font-black text-slate-800 m-0 tracking-tight">📺 Quản Lý Quảng Cáo</h2>

              <form onSubmit={handleSaveSettings} className="p-8 border border-white/[0.06] bg-[#0f1118]/80 backdrop-blur-[20px] rounded-2xl shadow-lg space-y-8">
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-white m-0 border-b border-white/5 pb-2">Cấu hình các vị trí quảng cáo</h3>

                  <div className="space-y-6">
                    {/* Banner Ads Block */}
                    <div className="p-4 rounded-xl border border-white/5 bg-zinc-950/20 space-y-4">
                      <h4 className="text-sm font-bold text-amber-400">🖼️ Quảng cáo Banner (Nổi có nút X tắt)</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Trạng thái Banner</label>
                          <select
                            value={settings['ads_banner_enabled'] || 'false'}
                            onChange={(e) => setSettings({ ...settings, ads_banner_enabled: e.target.value })}
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm cursor-pointer"
                          >
                            <option value="false">Tắt quảng cáo banner</option>
                            <option value="true">Bật quảng cáo banner</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">URL Ảnh Banner</label>
                          <input
                            type="text"
                            placeholder="Ví dụ: https://example.com/banner.png"
                            value={settings['ads_banner_image'] || ''}
                            onChange={(e) => setSettings({ ...settings, ads_banner_image: e.target.value })}
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Link liên kết Banner</label>
                          <input
                            type="text"
                            placeholder="Ví dụ: https://example.com"
                            value={settings['ads_banner_link'] || ''}
                            onChange={(e) => setSettings({ ...settings, ads_banner_link: e.target.value })}
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Redirect Ads Block */}
                    <div className="p-4 rounded-xl border border-white/5 bg-zinc-950/20 space-y-4">
                      <h4 className="text-sm font-bold text-amber-400">🔗 Quảng cáo Chuyển hướng (Redirect khi click)</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Trạng thái chuyển hướng</label>
                          <select
                            value={settings['ads_redirect_enabled'] || 'false'}
                            onChange={(e) => setSettings({ ...settings, ads_redirect_enabled: e.target.value })}
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm cursor-pointer"
                          >
                            <option value="false">Tắt chuyển hướng</option>
                            <option value="true">Bật chuyển hướng</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">URL Chuyển hướng</label>
                          <input
                            type="text"
                            placeholder="Ví dụ: https://example.com/target"
                            value={settings['ads_redirect_url'] || ''}
                            onChange={(e) => setSettings({ ...settings, ads_redirect_url: e.target.value })}
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Video Ads Block */}
                    <div className="p-4 rounded-xl border border-white/5 bg-zinc-950/20 space-y-4">
                      <h4 className="text-sm font-bold text-amber-400">🎥 Quảng cáo Video 1 (TVC trước khi phát phim)</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Trạng thái phát video ads</label>
                          <select
                            value={settings['ads_video_enabled'] || 'false'}
                            onChange={(e) => setSettings({ ...settings, ads_video_enabled: e.target.value })}
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm cursor-pointer"
                          >
                            <option value="false">Tắt quảng cáo video</option>
                            <option value="true">Bật quảng cáo video</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">URL Video Quảng cáo (MP4/M3U8)</label>
                          <input
                            type="text"
                            placeholder="Ví dụ: https://example.com/ad-video.mp4"
                            value={settings['ads_video_url'] || ''}
                            onChange={(e) => setSettings({ ...settings, ads_video_url: e.target.value })}
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Thời gian bỏ qua quảng cáo (giây)</label>
                          <input
                            type="number"
                            min="0"
                            placeholder="5"
                            value={settings['ads_video_skip_time'] || ''}
                            onChange={(e) => setSettings({ ...settings, ads_video_skip_time: e.target.value })}
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Link liên kết Video Ads</label>
                          <input
                            type="text"
                            placeholder="Ví dụ: https://example.com"
                            value={settings['ads_video_link'] || ''}
                            onChange={(e) => setSettings({ ...settings, ads_video_link: e.target.value })}
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Video Ads 2 Block */}
                    <div className="p-4 rounded-xl border border-white/5 bg-zinc-950/20 space-y-4">
                      <h4 className="text-sm font-bold text-amber-400">🎬 Quảng cáo Video 2 (TVC thứ 2 sau TVC 1)</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Trạng thái Video 2</label>
                          <select
                            value={settings['ads_video2_enabled'] || 'false'}
                            onChange={(e) => setSettings({ ...settings, ads_video2_enabled: e.target.value })}
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm cursor-pointer"
                          >
                            <option value="false">Tắt TVC 2</option>
                            <option value="true">Bật TVC 2</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">URL Video TVC 2 (MP4/M3U8)</label>
                          <input
                            type="text"
                            placeholder="Ví dụ: https://example.com/ad2.mp4"
                            value={settings['ads_video2_url'] || ''}
                            onChange={(e) => setSettings({ ...settings, ads_video2_url: e.target.value })}
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Thời gian bỏ qua TVC 2 (giây)</label>
                          <input
                            type="number"
                            min="0"
                            placeholder="5"
                            value={settings['ads_video2_skip_time'] || ''}
                            onChange={(e) => setSettings({ ...settings, ads_video2_skip_time: e.target.value })}
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Link liên kết TVC 2</label>
                          <input
                            type="text"
                            placeholder="Ví dụ: https://example.com"
                            value={settings['ads_video2_link'] || ''}
                            onChange={(e) => setSettings({ ...settings, ads_video2_link: e.target.value })}
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Banner Below Header Block */}
                    <div className="p-4 rounded-xl border border-white/5 bg-zinc-950/20 space-y-4">
                      <h4 className="text-sm font-bold text-amber-400">📍 Banner Dưới Header (toàn trang)</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Trạng thái</label>
                          <select
                            value={settings['ads_banner_below_header_enabled'] || 'false'}
                            onChange={(e) => setSettings({ ...settings, ads_banner_below_header_enabled: e.target.value })}
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm cursor-pointer"
                          >
                            <option value="false">Tắt</option>
                            <option value="true">Bật</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">URL Ảnh Banner</label>
                          <input
                            type="text"
                            placeholder="https://example.com/banner.png"
                            value={settings['ads_banner_below_header_image'] || ''}
                            onChange={(e) => setSettings({ ...settings, ads_banner_below_header_image: e.target.value })}
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Link liên kết</label>
                          <input
                            type="text"
                            placeholder="https://example.com"
                            value={settings['ads_banner_below_header_link'] || ''}
                            onChange={(e) => setSettings({ ...settings, ads_banner_below_header_link: e.target.value })}
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Banner Above Footer Block */}
                    <div className="p-4 rounded-xl border border-white/5 bg-zinc-950/20 space-y-4">
                      <h4 className="text-sm font-bold text-amber-400">📍 Banner Trên Footer (toàn trang)</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Trạng thái</label>
                          <select
                            value={settings['ads_banner_above_footer_enabled'] || 'false'}
                            onChange={(e) => setSettings({ ...settings, ads_banner_above_footer_enabled: e.target.value })}
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm cursor-pointer"
                          >
                            <option value="false">Tắt</option>
                            <option value="true">Bật</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">URL Ảnh Banner</label>
                          <input
                            type="text"
                            placeholder="https://example.com/footer-banner.png"
                            value={settings['ads_banner_above_footer_image'] || ''}
                            onChange={(e) => setSettings({ ...settings, ads_banner_above_footer_image: e.target.value })}
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Link liên kết</label>
                          <input
                            type="text"
                            placeholder="https://example.com"
                            value={settings['ads_banner_above_footer_link'] || ''}
                            onChange={(e) => setSettings({ ...settings, ads_banner_above_footer_link: e.target.value })}
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Banner Watch Page Block */}
                    <div className="p-4 rounded-xl border border-white/5 bg-zinc-950/20 space-y-4">
                      <h4 className="text-sm font-bold text-amber-400">📍 Banner Trong Trang Xem Phim (dưới player)</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Trạng thái</label>
                          <select
                            value={settings['ads_banner_watch_enabled'] || 'false'}
                            onChange={(e) => setSettings({ ...settings, ads_banner_watch_enabled: e.target.value })}
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm cursor-pointer"
                          >
                            <option value="false">Tắt</option>
                            <option value="true">Bật</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">URL Ảnh Banner</label>
                          <input
                            type="text"
                            placeholder="https://example.com/watch-banner.png"
                            value={settings['ads_banner_watch_image'] || ''}
                            onChange={(e) => setSettings({ ...settings, ads_banner_watch_image: e.target.value })}
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Link liên kết</label>
                          <input
                            type="text"
                            placeholder="https://example.com"
                            value={settings['ads_banner_watch_link'] || ''}
                            onChange={(e) => setSettings({ ...settings, ads_banner_watch_link: e.target.value })}
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Popup Ad Block */}
                    <div className="p-4 rounded-xl border border-white/5 bg-zinc-950/20 space-y-4">
                      <h4 className="text-sm font-bold text-amber-400">🪟 Popup Quảng cáo (nổi trên trang xem phim)</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Trạng thái Popup</label>
                          <select
                            value={settings['ads_popup_enabled'] || 'false'}
                            onChange={(e) => setSettings({ ...settings, ads_popup_enabled: e.target.value })}
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm cursor-pointer"
                          >
                            <option value="false">Tắt popup</option>
                            <option value="true">Bật popup</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Thời gian xuất hiện (giây sau khi vào trang)</label>
                          <input
                            type="number"
                            min="0"
                            placeholder="3"
                            value={settings['ads_popup_delay'] || ''}
                            onChange={(e) => setSettings({ ...settings, ads_popup_delay: e.target.value })}
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">URL Ảnh Popup</label>
                          <input
                            type="text"
                            placeholder="https://example.com/popup.png"
                            value={settings['ads_popup_image'] || ''}
                            onChange={(e) => setSettings({ ...settings, ads_popup_image: e.target.value })}
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Link liên kết Popup</label>
                          <input
                            type="text"
                            placeholder="https://example.com"
                            value={settings['ads_popup_link'] || ''}
                            onChange={(e) => setSettings({ ...settings, ads_popup_link: e.target.value })}
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#00ac47] transition-all text-sm"
                          />
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Form submit */}
                <div className="flex justify-end border-t border-white/5 pt-6">
                  <button
                    type="submit"
                    disabled={isSavingSettings}
                    className="px-6 py-3 bg-[#00ac47] hover:bg-[#00c250] text-white font-bold rounded-xl transition-all shadow-md active:scale-[0.98] disabled:opacity-50"
                  >
                    {isSavingSettings ? 'Đang lưu cấu hình...' : 'Lưu Thay Đổi'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SEO Guide Tab */}
          {activeTab === 'seo' && (
            <div className="space-y-8 animate-fadeIn">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black text-slate-800 m-0 tracking-tight">🎯 Hướng Dẫn Tối Ưu SEO & Kết Nối Google Console</h2>
                <span className="text-xs text-zinc-500 font-bold bg-white border border-slate-200 px-3 py-1 rounded-full shadow-sm">
                  Tô Phim SEO Suite v1.0
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Direct Links and Status */}
                <div className="lg:col-span-1 space-y-6">
                  <div className="border border-white/[0.06] bg-[#0f1118]/80 backdrop-blur-[20px] rounded-2xl p-6 shadow-lg text-white">
                    <h3 className="text-md font-bold text-white mb-4 mt-0 flex items-center gap-2">
                      🔌 Liên Kết Nhanh
                    </h3>
                    <div className="space-y-3">
                      <a
                        href="https://search.google.com/search-console"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-all group font-bold text-sm"
                      >
                        <span className="flex items-center gap-2.5">
                          <span className="text-lg">🔍</span>
                          Google Search Console
                        </span>
                        <span className="text-xs text-zinc-400 group-hover:text-white transition-colors">Truy cập ➔</span>
                      </a>
                      <a
                        href="https://analytics.google.com/analytics/web/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-all group font-bold text-sm"
                      >
                        <span className="flex items-center gap-2.5">
                          <span className="text-lg">📊</span>
                          Google Analytics
                        </span>
                        <span className="text-xs text-zinc-400 group-hover:text-white transition-colors">Truy cập ➔</span>
                      </a>
                      <a
                        href={`${settings['site_url'] || 'https://tophim.com'}/sitemap.xml`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-all group font-bold text-sm"
                      >
                        <span className="flex items-center gap-2.5">
                          <span className="text-lg">🗺️</span>
                          Sơ đồ trang (Sitemap.xml)
                        </span>
                        <span className="text-xs text-blue-400 font-mono group-hover:text-blue-300 transition-colors">Xem file ➔</span>
                      </a>
                      <a
                        href={`${settings['site_url'] || 'https://tophim.com'}/robots.txt`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-all group font-bold text-sm"
                      >
                        <span className="flex items-center gap-2.5">
                          <span className="text-lg">🤖</span>
                          Robots.txt
                        </span>
                        <span className="text-xs text-blue-400 font-mono group-hover:text-blue-300 transition-colors">Xem file ➔</span>
                      </a>
                    </div>
                  </div>

                  <div className="border border-white/[0.06] bg-[#0f1118]/80 backdrop-blur-[20px] rounded-2xl p-6 shadow-lg text-white space-y-4">
                    <h3 className="text-md font-bold text-white m-0 flex items-center gap-2">
                      📌 Thông tin Tên Miền Cấu Hình
                    </h3>
                    <div className="space-y-3.5 text-xs">
                      <div>
                        <span className="text-zinc-500 font-semibold uppercase block">Tên miền hiện tại</span>
                        <span className="text-sm font-black text-emerald-400 mt-1 block">{settings['site_url'] || 'Chưa cấu hình (Mặc định: https://tophim.com)'}</span>
                        <small className="text-zinc-400 mt-1.5 block leading-relaxed">
                          Bạn có thể thay đổi tên miền này trong phần <strong>Cài đặt hệ thống ➜ Thiết lập Website</strong> để sitemap và robots.txt tự động cập nhật theo tên miền mới.
                        </small>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Detailed SEO Guide & Search Console connection steps */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="border border-slate-200 bg-white rounded-2xl p-6 lg:p-8 shadow-sm text-slate-700 space-y-6">
                    <h3 className="text-lg font-black text-slate-800 m-0 border-b border-slate-100 pb-3 flex items-center gap-2">
                      ⚡ Hướng Dẫn Kết Nối Google Search Console (Khai Báo Website)
                    </h3>

                    <div className="space-y-5 text-sm leading-relaxed text-slate-600">
                      <div className="flex gap-4">
                        <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-md">1</div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm m-0">Truy cập Google Search Console</h4>
                          <p className="mt-1">
                            Bấm vào link liên kết nhanh <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" className="text-blue-600 font-bold hover:underline">Google Search Console</a> ở cột bên trái, đăng nhập bằng tài khoản Gmail của bạn.
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-md">2</div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm m-0">Thêm Trang Web Mới</h4>
                          <p className="mt-1">
                            Chọn mục <strong>Thêm trang web (Add Property)</strong>. Google sẽ cho bạn 2 lựa chọn xác minh:
                          </p>
                          <ul className="list-disc list-inside mt-2 space-y-1 pl-2">
                            <li><strong>Lựa chọn 1 (Khuyên dùng) - Tiền tố URL</strong>: Nhập chính xác tên miền của bạn (ví dụ: <code className="bg-slate-100 px-1 py-0.5 rounded text-rose-600 font-mono font-bold">{settings['site_url'] || 'https://tophim.com'}</code>).</li>
                            <li><strong>Lựa chọn 2 - Tên miền (Domain)</strong>: Xác minh qua DNS TXT record (cần truy cập trang quản lý tên miền để cấu hình).</li>
                          </ul>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-md">3</div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm m-0">Xác Minh Quyền Sở Hữu (Bằng Thẻ HTML Tag)</h4>
                          <p className="mt-1">
                            Nếu bạn chọn cách <strong>Tiền tố URL</strong>, hãy chọn phương thức xác minh bằng <strong>Thẻ HTML (HTML Tag)</strong>. Google sẽ cung cấp cho bạn một dòng mã dạng:
                          </p>
                          <div className="bg-slate-100 font-mono text-xs p-3 rounded-xl border border-slate-200 mt-2 text-slate-700 select-all block leading-relaxed">
                            &lt;meta name="google-site-verification" content="MÃ_XÁC_MINH_CỦA_BẠN" /&gt;
                          </div>
                          <p className="mt-2.5">
                            Copy đoạn mã này và chèn vào mục <strong>Cài đặt hệ thống ➜ Nâng cao & Bảo trì ➜ Mã nhúng Header</strong> trong trang Admin này và bấm <strong>Lưu Thay Đổi</strong>.
                          </p>
                          <p className="mt-2 text-amber-600 font-medium">
                            ⚠️ Sau khi chèn mã và Lưu, quay lại Google Search Console bấm nút <strong>Xác minh (Verify)</strong> để hoàn tất.
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-md">4</div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm m-0">Khai Báo Sơ Đồ Trang (Submit Sitemap)</h4>
                          <p className="mt-1">
                            Sau khi xác minh thành công, chọn mục <strong>Sơ đồ trang web (Sitemaps)</strong> ở menu bên trái của Google Console. Nhập đường dẫn sitemap của trang web vào:
                          </p>
                          <div className="bg-slate-100 font-mono text-xs px-4 py-2.5 rounded-xl border border-slate-200 mt-2 text-slate-700 select-all inline-block font-bold">
                            sitemap.xml
                          </div>
                          <p className="mt-2">
                            Bấm <strong>Gửi (Submit)</strong>. Google sẽ tự động đọc sơ đồ trang của Tô Phim định kỳ để cập nhật nhanh chóng tất cả phim và tập phim mới cào lên kết quả tìm kiếm Google.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border border-slate-200 bg-white rounded-2xl p-6 lg:p-8 shadow-sm text-slate-700 space-y-6">
                    <h3 className="text-lg font-black text-slate-800 m-0 border-b border-slate-100 pb-3 flex items-center gap-2">
                      💡 Các Quy Tắc Tối Ưu SEO Phim Cho Quản Trị Viên
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                      <div className="bg-slate-50 border border-slate-100 p-4.5 rounded-2xl space-y-2">
                        <h4 className="font-bold text-slate-800 m-0 flex items-center gap-1.5">
                          📝 Viết Tiêu Đề Phim Đúng Chuẩn
                        </h4>
                        <p className="text-xs leading-relaxed text-slate-500 m-0">
                          Định dạng tiêu đề phim tối ưu nhất nên bao gồm: <strong>Tên Phim + Tập (nếu có) + Vietsub/Thuyết Minh + Năm phát hành</strong>.<br />
                          Hệ thống Tô Phim đã được lập trình sẵn để tự động sinh thẻ Title chuẩn SEO cho từng trang xem phim để tối ưu hóa tỷ lệ click của người tìm kiếm.
                        </p>
                      </div>
                      <div className="bg-slate-50 border border-slate-100 p-4.5 rounded-2xl space-y-2">
                        <h4 className="font-bold text-slate-800 m-0 flex items-center gap-1.5">
                          🏷️ Điền Thẻ Từ Khóa Site Keywords
                        </h4>
                        <p className="text-xs leading-relaxed text-slate-500 m-0">
                          Hãy bổ sung các từ khóa cốt lõi của website như <code className="bg-white px-1 py-0.5 rounded border">xem phim online, phim vietsub, phim hot...</code> trong mục cấu hình Website. Thẻ này giúp Google hiểu nhanh các chủ đề chính của Tô Phim.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="border border-slate-200 bg-white rounded-2xl p-6 lg:p-8 shadow-sm text-slate-700 space-y-6">
                    <h3 className="text-lg font-black text-slate-800 m-0 border-b border-slate-100 pb-3 flex items-center gap-2">
                      🔑 Hướng Dẫn Cấu Hình Đăng Nhập Bằng Google (Google Sign-In)
                    </h3>

                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                      <strong>⚠️ Yêu cầu:</strong> Bạn cần có tài khoản Google Cloud Console (miễn phí) để lấy <strong>Client ID</strong>. Sau khi lấy được, điền vào mục <strong>Cài đặt hệ thống → Google & Analytics → Google Client ID</strong>.
                    </div>

                    <div className="space-y-5 text-sm leading-relaxed text-slate-600">
                      <div className="flex gap-4">
                        <div className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-md">1</div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm m-0">Truy cập Google Cloud Console</h4>
                          <p className="mt-1">
                            Vào <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 font-bold hover:underline">console.cloud.google.com</a> và đăng nhập bằng tài khoản Gmail.
                            Tạo một dự án mới (ví dụ: <code className="bg-slate-100 px-1 py-0.5 rounded text-rose-600 font-mono font-bold">Tô Phim</code>).
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <div className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-md">2</div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm m-0">Tạo OAuth 2.0 Credentials</h4>
                          <p className="mt-1">
                            Trong dự án, vào menu <strong>APIs & Services → Credentials</strong>. Bấm <strong>+ CREATE CREDENTIALS → OAuth client ID</strong>.
                            Chọn <strong>Application type: Web application</strong>.
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <div className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-md">3</div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm m-0">Cấu hình Authorized Origins</h4>
                          <p className="mt-1">
                            Tại phần <strong>Authorized JavaScript origins</strong>, thêm tên miền của bạn:
                          </p>
                          <div className="bg-slate-100 font-mono text-xs p-3 rounded-xl border border-slate-200 mt-2 text-slate-700 space-y-1">
                            <div>{settings['site_url'] || 'https://tophim.com'}</div>
                            <div className="text-slate-400">{/* Nếu chạy local: http://localhost:3000 */}</div>
                          </div>
                          <p className="mt-2 text-amber-700 font-medium">
                            ⚠️ <strong>Không cần</strong> thêm Redirect URIs vì Tô Phim dùng Google One Tap (không có trang callback riêng).
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <div className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-md">4</div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm m-0">Cấu hình OAuth Consent Screen</h4>
                          <p className="mt-1">
                            Vào <strong>APIs & Services → OAuth consent screen</strong>. Chọn <strong>External</strong>. Điền tên app, email hỗ trợ. Ở bước <strong>Scopes</strong>, chỉ cần chọn <code className="bg-slate-100 px-1 py-0.5 rounded text-rose-600 font-mono font-bold">email</code> và <code className="bg-slate-100 px-1 py-0.5 rounded text-rose-600 font-mono font-bold">profile</code>. Bấm <strong>SAVE AND CONTINUE</strong>.
                          </p>
                          <p className="mt-2 text-slate-500">
                            Ở bước <strong>Test users</strong>, thêm email Gmail của bạn để test trong khi app chưa được publish.
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <div className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-md">5</div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm m-0">Lấy Client ID & Dán vào Admin</h4>
                          <p className="mt-1">
                            Sau khi tạo Credentials xong, bạn sẽ thấy <strong>Your Client ID</strong> dạng:
                          </p>
                          <div className="bg-slate-100 font-mono text-xs p-3 rounded-xl border border-slate-200 mt-2 text-slate-700 select-all">
                            123456789-abcdefghijklmno.apps.googleusercontent.com
                          </div>
                          <p className="mt-2">
                            Copy Client ID này và dán vào <strong>Cài đặt hệ thống → Google & Analytics → Google Client ID</strong> trong Admin. Bấm <strong>Lưu thay đổi</strong>.
                          </p>
                          <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-emerald-800 text-xs font-medium">
                            ✅ Sau khi lưu, nút <strong>"Tiếp tục với Google"</strong> trên trang Đăng nhập / Đăng ký sẽ tự động hoạt động mà không cần cấu hình thêm.
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-md">✓</div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm m-0">Publish App (Khi deploy lên production)</h4>
                          <p className="mt-1">
                            Khi website đã live, vào lại <strong>OAuth consent screen</strong> và bấm <strong>PUBLISH APP</strong> để tất cả người dùng (không chỉ test users) có thể đăng nhập bằng Google.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}


          {/* Articles Tab */}
          {activeTab === 'articles' && (
            <AdminArticlesTab />
          )}

          {/* Article Comments Tab */}
          {activeTab === 'article-comments' && (
            <AdminArticleCommentsTab />
          )}

          {/* --- MOVIE EDIT/CREATE TAB --- */}
          {activeTab === 'edit-movie' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-slate-800 m-0 tracking-tight">{currentMovie ? 'Chỉnh sửa thông tin phim' : 'Thêm phim mới thủ công'}</h2>
            <button onClick={() => setActiveTab('movies')} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-semibold transition-colors">
              Quay lại
            </button>
          </div>
          <div className="bg-[#0f1118] border border-white/10 rounded-2xl p-6 w-full shadow-lg text-white">
            <form onSubmit={handleMovieSubmit} className="space-y-4">
              <div className="bg-[#12141c] border border-white/5 rounded-xl p-4 mb-4 flex items-end gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Mã TMDB (Để lấy thông tin tự động)</label>
                  <input type="text" name="tmdb_id" defaultValue={currentMovie?.tmdb_id || ''} placeholder="Ví dụ: 299534" className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-[#00ac47]" />
                </div>
                <button type="button" onClick={handleTmdbSync} className="bg-[#00ac47] hover:bg-[#00ac47]/90 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex-shrink-0">
                  Đồng bộ từ TMDB
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Tên phim *</label>
                  <input type="text" name="title" defaultValue={currentMovie?.title || ''} required className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-[#00ac47]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Tên gốc (Original Title)</label>
                  <input type="text" name="original_title" defaultValue={currentMovie?.original_title || ''} className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-[#00ac47]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Loại Phim</label>
                  <select name="type" defaultValue={currentMovie?.type || 'phimle'} className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-[#00ac47]">
                    <option value="phimle">Phim Lẻ</option>
                    <option value="phimbo">Phim Bộ</option>
                    <option value="hoathinh">Hoạt Hình</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Trạng thái (Status)</label>
                  <input type="text" name="status" defaultValue={currentMovie?.status || 'Full'} placeholder="Ví dụ: Tập 12 Vietsub, Hoàn thành" className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-[#00ac47]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Năm phát hành</label>
                  <input type="number" name="year" defaultValue={currentMovie?.year || new Date().getFullYear()} className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-[#00ac47]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Thời lượng</label>
                  <input type="text" name="duration" defaultValue={currentMovie?.duration || ''} placeholder="Ví dụ: 90 phút, 45 phút / tập" className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-[#00ac47]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Độ phân giải (Quality)</label>
                  <input type="text" name="quality" defaultValue={currentMovie?.quality || 'FHD'} className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-[#00ac47]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Ngôn ngữ</label>
                  <input type="text" name="language" defaultValue={currentMovie?.language || 'Vietsub'} className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-[#00ac47]" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Đạo diễn</label>
                  <input type="text" name="director" defaultValue={currentMovie?.director || ''} className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-[#00ac47]" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Poster URL (Ảnh dọc)</label>
                  <input type="text" id="poster_url_input" name="poster_url" defaultValue={currentMovie?.poster_url || ''} className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-[#00ac47]" />
                  {tmdbPosters.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-zinc-400 mb-2">Chọn Poster:</p>
                      <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                        {tmdbPosters.map((url, idx) => (
                          <img 
                            key={idx} 
                            src={url} 
                            alt={`poster-${idx}`} 
                            className="h-32 w-24 object-cover rounded cursor-pointer border-2 border-transparent hover:border-[#00ac47] transition-all flex-shrink-0"
                            onClick={() => {
                              const input = document.getElementById('poster_url_input') as HTMLInputElement;
                              if (input) input.value = url;
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Thumbnail URL (Ảnh ngang)</label>
                  <input type="text" id="thumb_url_input" name="thumb_url" defaultValue={currentMovie?.thumb_url || ''} className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-[#00ac47]" />
                  {tmdbThumbs.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-zinc-400 mb-2">Chọn Thumbnail:</p>
                      <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                        {tmdbThumbs.map((url, idx) => (
                          <img 
                            key={idx} 
                            src={url} 
                            alt={`thumb-${idx}`} 
                            className="h-20 w-36 object-cover rounded cursor-pointer border-2 border-transparent hover:border-[#00ac47] transition-all flex-shrink-0"
                            onClick={() => {
                              const input = document.getElementById('thumb_url_input') as HTMLInputElement;
                              if (input) input.value = url;
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Logo URL (Ảnh chữ / Logo phim cho Slider)</label>
                  <input type="text" id="logo_url_input" name="logo_url" defaultValue={currentMovie?.logo_url || ''} className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-[#00ac47]" />
                  {tmdbLogos.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-zinc-400 mb-2">Chọn Logo:</p>
                      <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar bg-zinc-900/50 p-2 rounded-lg border border-white/5">
                        {tmdbLogos.map((url, idx) => (
                          <div key={idx} className="relative flex-shrink-0 bg-zinc-950/50 rounded flex items-center justify-center overflow-hidden border-2 border-transparent hover:border-[#00ac47] transition-all cursor-pointer h-20 w-36" onClick={() => {
                            const input = document.getElementById('logo_url_input') as HTMLInputElement;
                            if (input) input.value = url;
                          }}>
                            {/* Checkerboard background pattern for transparent logos */}
                            <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(45deg, #2a2d3a 25%, transparent 25%), linear-gradient(-45deg, #2a2d3a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #2a2d3a 75%), linear-gradient(-45deg, transparent 75%, #2a2d3a 75%)', backgroundSize: '10px 10px', backgroundPosition: '0 0, 0 5px, 5px -5px, -5px 0px' }}></div>
                            <img 
                              src={url} 
                              alt={`logo-${idx}`} 
                              className="relative h-full w-full object-contain p-2"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Trailer URL</label>
                  <input type="text" name="trailer_url" defaultValue={currentMovie?.trailer_url || ''} className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-[#00ac47]" />
                </div>
                <div className="sm:col-span-2 flex flex-wrap items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer select-none py-2">
                    <input type="checkbox" name="is_hot" defaultChecked={!!currentMovie?.is_hot} className="w-4 h-4 rounded bg-zinc-950 border-white/10 text-[#00ac47] focus:ring-[#00ac47]" />
                    <span className="text-xs font-semibold text-zinc-300">Phim đề cử (Hiện trên Slider lớn ở trang chủ)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-400">Ưu tiên:</span>
                    <input
                      type="number"
                      name="hot_priority"
                      defaultValue={currentMovie?.hot_priority || 0}
                      className="w-24 bg-zinc-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs outline-none focus:border-[#00ac47]"
                      placeholder="0"
                    />
                  </div>
                </div>
                {/* Category selections */}
                <div className="sm:col-span-2 mt-2">
                  <h4 className="text-xs font-bold border-b border-white/5 pb-2 text-white uppercase tracking-wider">Phân Loại (Thể loại, Quốc gia, Chủ đề)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                    {/* Thể loại */}
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 mb-1">Thể loại</label>
                      <div className="max-h-36 overflow-y-auto border border-white/10 rounded-lg p-2 bg-zinc-950/50 space-y-1">
                        {allCategories.filter(c => c.type === 'genre').map(c => (
                          <label key={c.id} className="flex items-center gap-2 cursor-pointer py-0.5 text-xs text-zinc-300 hover:text-white">
                            <input
                              type="checkbox"
                              checked={selectedCategoryIds.includes(c.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedCategoryIds(prev => [...prev, c.id]);
                                } else {
                                  setSelectedCategoryIds(prev => prev.filter(id => id !== c.id));
                                }
                              }}
                              className="w-3.5 h-3.5 rounded bg-zinc-900 border-white/10 text-[#00ac47] focus:ring-[#00ac47]"
                            />
                            <span>{c.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Quốc gia */}
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 mb-1">Quốc gia</label>
                      <div className="max-h-36 overflow-y-auto border border-white/10 rounded-lg p-2 bg-zinc-950/50 space-y-1">
                        {allCategories.filter(c => c.type === 'country').map(c => (
                          <label key={c.id} className="flex items-center gap-2 cursor-pointer py-0.5 text-xs text-zinc-300 hover:text-white">
                            <input
                              type="checkbox"
                              checked={selectedCategoryIds.includes(c.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedCategoryIds(prev => [...prev, c.id]);
                                } else {
                                  setSelectedCategoryIds(prev => prev.filter(id => id !== c.id));
                                }
                              }}
                              className="w-3.5 h-3.5 rounded bg-zinc-900 border-white/10 text-[#00ac47] focus:ring-[#00ac47]"
                            />
                            <span>{c.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Tuyển tập */}
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 mb-1">Chủ đề / Tuyển tập</label>
                      <div className="max-h-36 overflow-y-auto border border-white/10 rounded-lg p-2 bg-zinc-950/50 space-y-1">
                        {allCategories.filter(c => c.type === 'collection').map(c => (
                          <label key={c.id} className="flex items-center gap-2 cursor-pointer py-0.5 text-xs text-zinc-300 hover:text-white">
                            <input
                              type="checkbox"
                              checked={selectedCategoryIds.includes(c.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedCategoryIds(prev => [...prev, c.id]);
                                } else {
                                  setSelectedCategoryIds(prev => prev.filter(id => id !== c.id));
                                }
                              }}
                              className="w-3.5 h-3.5 rounded bg-zinc-900 border-white/10 text-[#00ac47] focus:ring-[#00ac47]"
                            />
                            <span>{c.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Tóm tắt nội dung</label>
                  <textarea rows={4} name="description" defaultValue={currentMovie?.description || ''} className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-[#00ac47] resize-none" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Thứ tự ưu tiên Server (Tùy chọn)</label>
                  {movieServers.length > 0 ? (
                    <div className="flex flex-wrap gap-3 p-3 bg-zinc-950/50 border border-white/10 rounded-lg">
                      {movieServers.map(server => {
                        const isChecked = currentMovie?.server_priority?.includes(server);
                        return (
                          <label key={server} className="flex items-center gap-1.5 cursor-pointer text-sm">
                            <input type="checkbox" name="server_priority" value={server} defaultChecked={isChecked} className="w-3.5 h-3.5 accent-[#00ac47]" />
                            <span className="text-zinc-300">{server}</span>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <input type="text" name="server_priority" defaultValue={currentMovie?.server_priority || ''} placeholder="VD: VIP 1, FB, Dự phòng" className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-[#00ac47]" />
                  )}
                  <p className="text-[10px] text-zinc-500 mt-1">Chọn server để ưu tiên phát trước. Nếu chưa có tập phim, bạn có thể nhập tên server cách nhau bởi dấu phẩy.</p>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button type="button" onClick={() => setActiveTab('movies')} className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-semibold transition-colors">Hủy</button>
                <button type="submit" className="px-5 py-2.5 bg-[#00ac47] hover:bg-[#00c250] text-white rounded-xl text-sm font-bold transition-all shadow-md active:scale-[0.98]">Xác Nhận</button>
              </div>
            </form>
          </div>
        </div>
      )}
        </main>
      </div>

      {/* --- EPISODE EDIT/CREATE MODAL --- */}
      {episodeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn" onClick={() => setEpisodeModalOpen(false)}>
          <div className="bg-[#0f1118] border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative text-white" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-6 mt-0">{currentEpisode ? 'Sửa thông tin tập phim' : 'Thêm tập phim mới'}</h3>
            <button onClick={() => setEpisodeModalOpen(false)} className="absolute top-4 right-4 bg-transparent border-none text-zinc-400 hover:text-white text-2xl cursor-pointer">×</button>

            <form onSubmit={handleEpisodeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Tên tập phim *</label>
                <input type="text" name="name" defaultValue={currentEpisode?.name || ''} placeholder="Ví dụ: 1, 2, Full..." required className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-[#00ac47]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Tên Server (Máy chủ) *</label>
                <input type="text" name="server_name" defaultValue={currentEpisode?.server_name || 'KK - Default'} required className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-[#00ac47]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Đường dẫn Video (m3u8 / embed) *</label>
                <input type="text" name="video_url" defaultValue={currentEpisode?.video_url || ''} required className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-[#00ac47]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Số thứ tự (Order Number)</label>
                <input type="number" name="order_num" defaultValue={currentEpisode?.order_num || 0} className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-[#00ac47]" />
              </div>

              {currentEpisode && (
                <div className="mt-6 pt-4 border-t border-white/5 space-y-4">
                  <h4 className="text-sm font-bold text-white">Quản lý Phụ đề (Subtitles)</h4>

                  {/* List of existing subtitles */}
                  {episodeSubtitles.length > 0 ? (
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {episodeSubtitles.map((sub: any) => (
                        <div key={sub.id} className="flex items-center justify-between bg-zinc-950 p-2.5 rounded-lg border border-white/5 text-xs">
                          <div className="min-w-0 flex-1">
                            <span className="font-semibold text-[#00ac47] mr-2">[{sub.language.toUpperCase()}]</span>
                            <span className="font-medium text-white mr-2">{sub.label}</span>
                            <span className="text-zinc-500 font-mono block mt-0.5 truncate max-w-[280px]" title={sub.url}>{sub.url}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteSubtitle(sub.id)}
                            className="text-rose-500 hover:text-rose-400 p-1 font-semibold ml-2 shrink-0"
                          >
                            Xóa
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500 italic">Chưa có phụ đề nào cho tập này.</p>
                  )}

                  {/* Add subtitle form */}
                  <div className="bg-zinc-950 p-3 rounded-lg border border-white/5 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-zinc-400 mb-1">Nhãn hiển thị</label>
                        <input
                          type="text"
                          value={newSubLabel}
                          onChange={(e) => setNewSubLabel(e.target.value)}
                          placeholder="Ví dụ: Vietsub, English..."
                          className="w-full bg-zinc-900 border border-white/10 rounded px-2.5 py-1 text-xs text-white outline-none focus:border-[#00ac47]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-zinc-400 mb-1">Mã ngôn ngữ</label>
                        <input
                          type="text"
                          value={newSubLang}
                          onChange={(e) => setNewSubLang(e.target.value)}
                          placeholder="Ví dụ: vi, en, ja..."
                          className="w-full bg-zinc-900 border border-white/10 rounded px-2.5 py-1 text-xs text-white outline-none focus:border-[#00ac47]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-zinc-400 mb-1">Upload hoặc Nhập Link phụ đề (.vtt, .srt)</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newSubUrl}
                          onChange={(e) => setNewSubUrl(e.target.value)}
                          placeholder="Nhập đường dẫn URL..."
                          className="flex-1 bg-zinc-900 border border-white/10 rounded px-2.5 py-1 text-xs text-white outline-none focus:border-[#00ac47]"
                        />
                        <label className="cursor-pointer bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold px-3 py-1 rounded flex items-center justify-center shrink-0 border border-white/10 select-none">
                          {isUploadingSub ? 'Đang tải...' : 'Upload File'}
                          <input type="file" accept=".vtt,.srt" onChange={handleSubFileUpload} className="hidden" disabled={isUploadingSub} />
                        </label>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddSubtitle}
                      disabled={!newSubUrl.trim()}
                      className="w-full bg-[#00ac47] hover:bg-[#00c250] disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-white text-xs font-bold py-1.5 rounded transition-all active:scale-[0.99]"
                    >
                      Thêm Phụ Đề
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button type="button" onClick={() => setEpisodeModalOpen(false)} className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-semibold transition-colors">Hủy</button>
                <button type="submit" className="px-5 py-2.5 bg-[#00ac47] hover:bg-[#00c250] text-white rounded-xl text-sm font-bold transition-all shadow-md active:scale-[0.98]">Xác Nhận</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* --- BAN COMMENT USER MODAL --- */}
      {banUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn" onClick={() => setBanUser(null)}>
          <div className="bg-[#0f1118] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl relative text-white" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4 mt-0">Cấm Bình Luận Thành Viên</h3>
            <p className="text-sm text-zinc-400 mb-4">
              Thành viên: <strong>{banUser.name}</strong> ({banUser.email})
            </p>

            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const bannedUntil = formData.get('banned_until') as string;

              try {
                const res = await fetch('/api/admin/users', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ id: banUser.id, banned_until: bannedUntil ? new Date(bannedUntil).toISOString() : null })
                });
                const data = await res.json();
                if (res.ok && data.success) {
                  alert('Cập nhật trạng thái cấm bình luận thành công!');
                  setBanUser(null);
                  loadUsers();
                } else {
                  alert(data.error || 'Có lỗi xảy ra.');
                }
              } catch (err) {
                console.error(err);
              }
            }} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Cấm bình luận đến thời gian:</label>
                <input
                  type="datetime-local"
                  name="banned_until"
                  defaultValue={banUser.banned_until ? new Date(new Date(banUser.banned_until).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                  className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-[#00ac47]"
                />
                <small className="text-zinc-500 text-[10px] mt-1 block">Để trống nếu muốn gỡ cấm bình luận (cho phép bình luận bình thường).</small>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button type="button" onClick={() => setBanUser(null)} className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-semibold transition-colors">Hủy</button>
                <button type="submit" className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-sm font-bold transition-all shadow-md active:scale-[0.98]">Xác Nhận</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- USER DETAIL POPUP MODAL --- */}
      {selectedDetailUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-fadeIn" onClick={() => setSelectedDetailUser(null)}>
          <div className="bg-[#0f1118] border border-white/10 rounded-2xl p-6 w-full max-w-3xl shadow-2xl relative text-white max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-6 mt-0 flex items-center gap-2 text-emerald-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
              Chi tiết thành viên: {selectedDetailUser.name}
            </h3>
            <button onClick={() => setSelectedDetailUser(null)} className="absolute top-4 right-4 bg-transparent border-none text-zinc-400 hover:text-white text-2xl cursor-pointer outline-none">×</button>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 overflow-y-auto pr-1 flex-1 custom-scrollbar">
              {/* User overview and role settings */}
              <div className="md:col-span-1 space-y-4 border-r border-white/5 pr-0 md:pr-6">
                <div className="flex flex-col items-center text-center p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                  <img
                    src={selectedDetailUser.avatar || '/avt/meme/avatar-hai-huoc-vo-tri-0.jpg'}
                    alt=""
                    className="w-20 h-20 rounded-full object-cover border border-white/10 mb-3"
                  />
                  <h4 className="font-bold text-base text-white mb-1">{selectedDetailUser.name}</h4>
                  <span className={`px-2 py-0.5 text-xs font-bold rounded-full uppercase ${selectedDetailUser.role === 'admin' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-zinc-800 text-zinc-400'}`}>
                    {selectedDetailUser.role}
                  </span>
                </div>

                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-zinc-500 text-xs font-semibold block uppercase">ID thành viên</span>
                    <span className="font-semibold text-white">{selectedDetailUser.id}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-xs font-semibold block uppercase">Email</span>
                    <span className="font-semibold text-white break-all">{selectedDetailUser.email}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-xs font-semibold block uppercase">Xác minh Email</span>
                    {selectedDetailUser.email_verified ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-400 font-semibold bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20 mt-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Đã xác minh
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-red-400 font-semibold bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 mt-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Chưa xác minh
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-zinc-500 text-xs font-semibold block uppercase">IP đăng nhập cuối</span>
                    <span className="font-mono text-xs text-zinc-300 bg-black/40 px-2 py-1 rounded mt-1 inline-block">{selectedDetailUser.last_ip || 'Chưa có dữ liệu'}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-xs font-semibold block uppercase">Ngày tham gia</span>
                    <span className="font-semibold text-white">{new Date(selectedDetailUser.created_at).toLocaleDateString('vi-VN')}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5">
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Thay đổi vai trò</label>
                  <div className="flex gap-2">
                    <select
                      value={detailUserRole}
                      onChange={(e) => setDetailUserRole(e.target.value)}
                      className="flex-1 bg-zinc-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-[#00ac47]"
                    >
                      <option value="user">USER (Thành viên / Tùy chỉnh)</option>
                      <option value="admin">ADMIN (Toàn quyền)</option>
                    </select>

                    {detailUserRole === 'user' && (
                      <select
                        value={detailUserRoleId || ''}
                        onChange={(e) => setDetailUserRoleId(e.target.value ? Number(e.target.value) : null)}
                        className="flex-1 bg-zinc-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-[#00ac47]"
                      >
                        <option value="">Không có quyền (Thành viên thường)</option>
                        {allRoles.map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    )}

                    <button
                      type="button"
                      onClick={handleUpdateDetailUserRole}
                      disabled={isSavingDetailUserRole}
                      className="px-3 py-1.5 bg-[#00ac47] hover:bg-[#00c250] text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                    >
                      Lưu
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5">
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Gắn Nhãn Thành Viên</label>
                  <select
                    value={selectedDetailUser.label_id || ''}
                    onChange={async (e) => {
                      const labelId = e.target.value;
                      if (!selectedDetailUser) return;
                      try {
                        const res = await fetch('/api/admin/users', {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ id: selectedDetailUser.id, label_id: labelId ? parseInt(labelId) : null })
                        });
                        const data = await res.json();
                        if (res.ok && data.success) {
                          alert('Cập nhật nhãn thành công!');
                          setUsersList(prev => prev.map(u => u.id === selectedDetailUser.id ? { ...u, label_id: labelId ? parseInt(labelId) : null } : u));
                          setSelectedDetailUser((prev: any) => prev ? { ...prev, label_id: labelId ? parseInt(labelId) : null } : null);
                        } else {
                          alert(data.error || 'Có lỗi xảy ra.');
                        }
                      } catch (err) {
                        console.error(err);
                        alert('Lỗi kết nối.');
                      }
                    }}
                    className="w-full bg-zinc-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-[#00ac47]"
                  >
                    <option value="">-- Không có nhãn --</option>
                    {labelsList.map(lbl => (
                      <option key={lbl.id} value={lbl.id}>{lbl.name}</option>
                    ))}
                  </select>
                </div>

                <div className="pt-4 border-t border-white/5">
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Kiểm tra mật khẩu</label>
                  <form onSubmit={handleCheckPassword} className="space-y-2">
                    <input
                      type="password"
                      placeholder="Nhập mật khẩu cần kiểm tra..."
                      value={checkPassInput}
                      onChange={(e) => {
                        setCheckPassInput(e.target.value);
                        setCheckPassResult(null);
                      }}
                      className="w-full bg-zinc-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#00ac47]"
                    />
                    <button
                      type="submit"
                      disabled={isCheckingPassword || !checkPassInput.trim()}
                      className="w-full px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                    >
                      {isCheckingPassword ? 'Đang kiểm tra...' : 'Kiểm tra'}
                    </button>
                    {checkPassResult !== null && (
                      <div className={`text-[11px] font-bold mt-1 text-center p-1.5 rounded ${checkPassResult ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                        {checkPassResult ? '✅ Mật khẩu chính xác!' : '❌ Mật khẩu không đúng!'}
                      </div>
                    )}
                  </form>
                </div>

                <div className="pt-4 border-t border-white/5">
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Đặt lại mật khẩu mới</label>
                  <form onSubmit={handleResetPassword} className="space-y-2">
                    <input
                      type="password"
                      placeholder="Mật khẩu mới (tối thiểu 6 ký tự)..."
                      value={resetPassInput}
                      onChange={(e) => setResetPassInput(e.target.value)}
                      className="w-full bg-zinc-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#00ac47]"
                    />
                    <button
                      type="submit"
                      disabled={isResettingPassword || !resetPassInput.trim()}
                      className="w-full px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                    >
                      {isResettingPassword ? 'Đang đặt lại...' : 'Đặt lại mật khẩu'}
                    </button>
                  </form>
                </div>
              </div>

              {/* Logs table list */}
              <div className="md:col-span-2 flex flex-col min-h-[300px]">
                <h4 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-3 mt-0">Nhật ký hoạt động (50 bản ghi gần nhất)</h4>
                <div className="flex-1 overflow-y-auto border border-white/5 rounded-xl bg-black/30 p-2 max-h-[350px] custom-scrollbar">
                  {isDetailUserLogsLoading ? (
                    <div className="h-full flex items-center justify-center text-zinc-500 text-xs animate-pulse">Đang tải nhật ký...</div>
                  ) : detailUserLogs.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-zinc-500 text-xs">Chưa có nhật ký hoạt động nào.</div>
                  ) : (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-white/5 text-zinc-500 font-bold uppercase text-[10px]">
                          <th className="py-2 px-2">Thời gian</th>
                          <th className="py-2 px-2">Hành động</th>
                          <th className="py-2 px-2">Chi tiết</th>
                          <th className="py-2 px-2">Địa chỉ IP</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailUserLogs.map((log) => (
                          <tr key={log.id} className="border-b border-white/[0.03] hover:bg-white/[0.01]">
                            <td className="py-2 px-2 text-zinc-400 whitespace-nowrap">{new Date(log.created_at).toLocaleString('vi-VN')}</td>
                            <td className="py-2 px-2 font-semibold text-white">{log.action}</td>
                            <td className="py-2 px-2 text-zinc-400 max-w-[150px] truncate" title={log.details}>{log.details || '-'}</td>
                            <td className="py-2 px-2 text-zinc-500 font-mono">{log.ip_address || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-white/5 shrink-0">
              <button type="button" onClick={() => setSelectedDetailUser(null)} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-semibold transition-colors">Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* --- SEND EMAIL MODAL --- */}
      {mailTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn" onClick={() => { setMailTargetUser(null); setEmailSubject(''); setEmailContent(''); }}>
          <div className="bg-[#0f1118] border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative text-white" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4 mt-0">Gửi Email Thành Viên</h3>
            <p className="text-sm text-zinc-400 mb-4">
              Gửi tới: <strong>{mailTargetUser.name}</strong> {mailTargetUser.email !== 'all' ? `(${mailTargetUser.email})` : ''}
            </p>

            <form onSubmit={handleSendEmail} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Tiêu đề email *</label>
                <input
                  type="text"
                  required
                  placeholder="Nhập tiêu đề email..."
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-[#00ac47]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Nội dung email (hỗ trợ HTML) *</label>
                <textarea
                  rows={6}
                  required
                  placeholder="Nhập nội dung thư gửi..."
                  value={emailContent}
                  onChange={(e) => setEmailContent(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-[#00ac47] resize-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button type="button" onClick={() => { setMailTargetUser(null); setEmailSubject(''); setEmailContent(''); }} className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-semibold transition-colors">Hủy</button>
                <button type="submit" disabled={isSendingEmail} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-all shadow-md active:scale-[0.98] disabled:opacity-50">
                  {isSendingEmail ? 'Đang gửi...' : 'Gửi Thư'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


    </div>
  );
}
