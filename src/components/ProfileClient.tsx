'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import UserArticlesTab from './UserArticlesTab';

interface ProfileClientProps {
  user: {
    id: number;
    name: string;
    email: string;
    avatar: string | null;
    gender: string | null;
    email_verified: boolean;
    created_at: string;
  };
  favoriteCount: number;
  watchLaterCount: number;
  historyCount: number;
  totalWatchTimeSec: number;
  userRank: number | string;
  last7Days: Array<{
    dateStr: string;
    label: string;
    seconds: number;
    height: number;
  }>;
  weeklySec: number;
  avgDailySec: number;
  recordSec: number;
}

const PRESET_AVATARS = [
  {
    category: 'Hoạt hình / Anime',
    items: [
      { name: 'Anime Boy Cute', url: '/avt/hoat-hinh/anime-boy-cute.webp' },
      { name: 'One Piece Cute', url: '/avt/hoat-hinh/avatar-one-piece-dang-yeu_082623284.jpg' },
      { name: 'Conan', url: '/avt/hoat-hinh/conan-2-1720169717392338102246-0-60-949-1873-crop-1720169781004470165817.webp' },
      { name: 'Anime Girl Cute', url: '/avt/hoat-hinh/cute-anime-girl-12.jpg' },
      { name: 'Naruto', url: '/avt/hoat-hinh/Hinh-dai-dien-avt-Naruto-an-tuong-nhat.png' },
      { name: 'Nobita', url: '/avt/hoat-hinh/nobita-thanh-nien-hau-dau-hay-tai-nang-thien-bam-1739110844736484718301-1739238946253-17392389463833-1747390952764-1747390953406154026840.webp' },
      { name: 'Luffy', url: '/avt/hoat-hinh/one-piece-05-1761900851265876853380-0-31-700-1368-crop-17619009907011159877237.webp' },
      { name: 'Doraemon', url: '/avt/hoat-hinh/tell-me-the-best-epsiode-and-best-doraemon-movie-v0-nmdyic3mnpfg1.webp' },
      ...Array.from({ length: 30 }, (_, i) => {
        const num = i + 10;
        if (num === 29 || num === 36) return null;
        return { name: `Hoạt hình ${num}`, url: `/avt/hoat-hinh/${num}.jpg` };
      }).filter(Boolean) as any[]
    ]
  },
  {
    category: 'Meme vui nhộn',
    items: [
      { name: 'Meme đáng yêu', url: '/avt/meme/(600x375)_crop_anh-27-meme-dang-yeu-didongmy.jpg' },
      { name: 'Vô tri 1', url: '/avt/meme/avatar-hai-huoc-vo-tri-0.jpg' },
      { name: 'Mèo Meme 1', url: '/avt/meme/avatar-meme-meo-2.webp' },
      { name: 'Mèo Meme 2', url: '/avt/meme/avatar-meo-vo-tri-meme-9.webp' },
      { name: 'Vô tri 2', url: '/avt/meme/avatar-vo-tri-meme-12.jpg' },
      { name: 'Meme 26', url: '/avt/meme/avatar_meme_26_3c2fc5c187.jpg' },
      { name: 'Meme vui nhộn', url: '/avt/meme/hinh-anh-meme-avatar-hai-huoc.webp' },
      { name: 'Tạo tiếng cười', url: '/avt/meme/hinh-anh-meme-avatar-tao-tieng-cuoi.webp' },
      { name: 'Meme Dog', url: '/avt/meme/images.jpg' },
      { name: 'Meme châm biếm', url: '/avt/meme/meme-avatar-phong-cach-cham-biem-hai-huoc.webp' },
      ...Array.from({ length: 7 }, (_, i) => {
        const num = String(i + 2).padStart(2, '0');
        return { name: `Meme ${num}`, url: `/avt/meme/${num}.jpg` };
      })
    ]
  },
  {
    category: 'Trung Quốc',
    items: Array.from({ length: 16 }, (_, i) => {
      const idx = String(i + 1).padStart(2, '0');
      return { name: `Trung Quốc ${idx}`, url: `/avt/trungquoc/${idx}.jpg` };
    })
  },
  {
    category: 'Hàn Quốc',
    items: Array.from({ length: 15 }, (_, i) => {
      const idx = String(i + 1).padStart(2, '0');
      return { name: `Hàn Quốc ${idx}`, url: `/avt/hanquoc/${idx}.jpg` };
    })
  },
  {
    category: 'Âu Mỹ',
    items: Array.from({ length: 15 }, (_, i) => {
      const idx = String(i + 1).padStart(2, '0');
      return { name: `Âu Mỹ ${idx}`, url: `/avt/aumy/${idx}.jpg` };
    })
  }
];

export default function ProfileClient({
  user,
  favoriteCount,
  watchLaterCount,
  historyCount,
  totalWatchTimeSec,
  userRank,
  last7Days,
  weeklySec,
  avgDailySec,
  recordSec,
}: ProfileClientProps) {

  const formatWatchTime = (sec: number) => {
    if (sec === 0) return '0 phút';
    if (sec < 60) return `${sec} giây`;
    const m = Math.floor(sec / 60);
    return `${m} phút`;
  };
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  
  const initialTab = (tabParam === 'stats' || tabParam === 'utils' || tabParam === 'logs' || tabParam === 'articles') 
    ? tabParam 
    : 'info';
  const [activeTab, setActiveTab] = useState<'info' | 'stats' | 'utils' | 'logs' | 'articles'>(
    initialTab as any
  );

  useEffect(() => {
    if (tabParam === 'stats' || tabParam === 'utils' || tabParam === 'logs' || tabParam === 'articles') {
      setActiveTab(tabParam as any);
    } else {
      setActiveTab('info');
    }
  }, [tabParam]);

  // Logs state
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Email verification state
  const [isEmailVerified, setIsEmailVerified] = useState(user.email_verified);
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isConfirmingOtp, setIsConfirmingOtp] = useState(false);
  const [otpSuccess, setOtpSuccess] = useState('');
  const [otpError, setOtpError] = useState('');

  const fetchLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await fetch('/api/user/logs');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setLogs(data.logs || []);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs();
    }
  }, [activeTab]);

  const handleSendVerificationEmail = async () => {
    setOtpSuccess('');
    setOtpError('');
    setIsSendingOtp(true);
    try {
      const res = await fetch('/api/user/verify-email', {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        setOtpSuccess(data.message || 'Mã xác minh đã được gửi đến email của bạn.');
        setIsVerifying(true);
      } else {
        setOtpError(data.error || 'Gửi mã xác minh thất bại.');
      }
    } catch (err) {
      console.error(err);
      setOtpError('Lỗi kết nối, vui lòng thử lại.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyEmailCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpSuccess('');
    setOtpError('');
    setIsConfirmingOtp(true);
    try {
      const res = await fetch('/api/user/verify-email', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: otpCode }),
      });
      const data = await res.json();
      if (res.ok) {
        setOtpSuccess(data.message || 'Xác minh email thành công!');
        setIsEmailVerified(true);
        setIsVerifying(false);
        setOtpCode('');
      } else {
        setOtpError(data.error || 'Mã xác minh không chính xác.');
      }
    } catch (err) {
      console.error(err);
      setOtpError('Lỗi kết nối, vui lòng thử lại.');
    } finally {
      setIsConfirmingOtp(false);
    }
  };

  // Profile update state
  const [name, setName] = useState(user.name);
  const [avatar, setAvatar] = useState(user.avatar || '');
  const [gender, setGender] = useState(user.gender || 'Khác');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Avatar selector state
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [avatarSelectorTab, setAvatarSelectorTab] = useState(0);

  // Password update state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passSuccess, setPassSuccess] = useState('');
  const [passError, setPassError] = useState('');
  const [isUpdatingPass, setIsUpdatingPass] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess('');
    setProfileError('');
    setIsUpdatingProfile(true);

    try {
      const res = await fetch('/api/user/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, avatar, gender }),
      });
      const data = await res.json();
      if (!res.ok) {
        setProfileError(data.error || 'Cập nhật thất bại!');
      } else {
        setProfileSuccess(data.message || 'Cập nhật thông tin thành công!');
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
      setProfileError('Có lỗi xảy ra, vui lòng thử lại!');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassSuccess('');
    setPassError('');
    setIsUpdatingPass(true);

    try {
      const res = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPassError(data.error || 'Đổi mật khẩu thất bại!');
      } else {
        setPassSuccess(data.message || 'Đổi mật khẩu thành công!');
        setOldPassword('');
        setNewPassword('');
      }
    } catch (err) {
      console.error(err);
      setPassError('Có lỗi xảy ra, vui lòng thử lại!');
    } finally {
      setIsUpdatingPass(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/';
    } catch (err) {
      console.error(err);
    }
  };

  const avatarUrl = avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`;
  const createdDate = new Date(user.created_at).toLocaleDateString('vi-VN');
  const emailPrefix = user.email.split('@')[0];

  return (
    <div className="min-h-screen bg-[#0f111a] text-white pt-24 pb-20">
      <div className="relative py-12 px-4 border-b border-zinc-900/50 bg-gradient-to-b from-[#00ac47]/10 to-transparent mb-10">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center md:items-end justify-between gap-6">
            <div className="flex flex-col md:flex-row items-center md:items-end gap-6 text-center md:text-left">
              <div className="relative group">
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="w-32 h-32 rounded-full object-cover border border-[#00ac47]/30 bg-zinc-900 shadow-2xl transition-transform hover:scale-105 duration-300"
                />
                <button
                  type="button"
                  className="absolute bottom-0 right-0 p-2.5 bg-[#00ac47] rounded-full text-white hover:bg-[#00c250] transition-colors shadow-lg border-2 border-[#0f111a]"
                  onClick={() => setShowAvatarSelector(true)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></svg>
                </button>
              </div>
              <div className="space-y-1">
                <h1 className="text-3xl md:text-5xl font-black mb-1 text-white tracking-tight drop-shadow-md">{name}</h1>
                <p className="text-zinc-400 font-semibold mb-1">@{emailPrefix}</p>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 text-zinc-500 text-xs mt-1">
                  <span>Thành viên từ {createdDate}</span>
                  <span className="hidden md:inline">•</span>
                  {isEmailVerified ? (
                    <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      Đã xác minh
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                      Chưa xác minh
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm hover:shadow active:scale-95 font-semibold text-sm cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></svg>
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8 max-w-6xl">
        {profileSuccess && (
          <div className="bg-[#00ac47]/10 text-[#00ac47] p-4 rounded-xl mb-6 border border-[#00ac47]/20 text-sm">
            {profileSuccess}
          </div>
        )}
        {profileError && (
          <div className="bg-red-500/10 text-red-400 p-4 rounded-xl mb-6 border border-red-500/20 text-sm">
            {profileError}
          </div>
        )}
        {passSuccess && (
          <div className="bg-[#00ac47]/10 text-[#00ac47] p-4 rounded-xl mb-6 border border-[#00ac47]/20 text-sm">
            {passSuccess}
          </div>
        )}
        {passError && (
          <div className="bg-red-500/10 text-red-400 p-4 rounded-xl mb-6 border border-red-500/20 text-sm">
            {passError}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <div className="bg-[#0f1118]/80 border border-white/[0.06] backdrop-blur-[20px] rounded-2xl p-5 hover:bg-white/[0.03] hover:border-[#00ac47]/20 transition-all duration-300 hover:-translate-y-1 shadow-[0_4px_20px_rgba(0,0,0,0.3)] flex flex-col justify-between min-h-[110px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Yêu thích</span>
              <div className="p-1.5 rounded-lg bg-[#00ac47]/15 border border-[#00ac47]/20">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#00ac47] fill-[#00ac47] w-4 h-4"><path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5"></path></svg>
              </div>
            </div>
            <p className="text-3xl font-extrabold text-white tracking-tight mt-2">{favoriteCount}</p>
          </div>
          <div className="bg-[#0f1118]/80 border border-white/[0.06] backdrop-blur-[20px] rounded-2xl p-5 hover:bg-white/[0.03] hover:border-[#00ac47]/20 transition-all duration-300 hover:-translate-y-1 shadow-[0_4px_20px_rgba(0,0,0,0.3)] flex flex-col justify-between min-h-[110px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Xem tiếp</span>
              <div className="p-1.5 rounded-lg bg-[#00ac47]/15 border border-[#00ac47]/20">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#00ac47] w-4 h-4"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>
              </div>
            </div>
            <p className="text-3xl font-extrabold text-white tracking-tight mt-2">{watchLaterCount}</p>
          </div>
          <div className="bg-[#0f1118]/80 border border-white/[0.06] backdrop-blur-[20px] rounded-2xl p-5 hover:bg-white/[0.03] hover:border-[#00ac47]/20 transition-all duration-300 hover:-translate-y-1 shadow-[0_4px_20px_rgba(0,0,0,0.3)] flex flex-col justify-between min-h-[110px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Đã xem</span>
              <div className="p-1.5 rounded-lg bg-[#00ac47]/15 border border-[#00ac47]/20">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#00ac47] w-4 h-4"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><path d="M12 7v5l4 2"></path></svg>
              </div>
            </div>
            <p className="text-3xl font-extrabold text-white tracking-tight mt-2">{historyCount}</p>
          </div>
          <div className="bg-[#0f1118]/80 border border-white/[0.06] backdrop-blur-[20px] rounded-2xl p-5 hover:bg-white/[0.03] hover:border-[#00ac47]/20 transition-all duration-300 hover:-translate-y-1 shadow-[0_4px_20px_rgba(0,0,0,0.3)] flex flex-col justify-between min-h-[110px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Xem / Tuần</span>
              <div className="p-1.5 rounded-lg bg-[#00ac47]/15 border border-[#00ac47]/20">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#00ac47] w-4 h-4"><path d="M12 6v6l4 2"></path><circle cx="12" cy="12" r="10"></circle></svg>
              </div>
            </div>
            <p className="text-3xl font-extrabold text-white tracking-tight mt-2">{Math.floor(weeklySec / 60)}m</p>
          </div>
        </div>

        <div className="mt-6 w-full space-y-6">
          <div className="flex gap-2 border-b border-white/10 pb-1 overflow-x-auto flex-nowrap custom-scrollbar">
            <button
              onClick={() => setActiveTab('info')}
              className={`px-5 py-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap shrink-0 outline-none ${activeTab === 'info' ? 'border-[#00ac47] text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
            >
              Thông tin cá nhân
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`px-5 py-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap shrink-0 outline-none ${activeTab === 'stats' ? 'border-[#00ac47] text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
            >
              Thống kê giờ xem
            </button>
            <button
              onClick={() => setActiveTab('articles')}
              className={`px-5 py-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap shrink-0 outline-none ${activeTab === 'articles' ? 'border-[#00ac47] text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
            >
              Quản lý bài viết
            </button>
            <button
              onClick={() => setActiveTab('utils')}
              className={`px-5 py-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap shrink-0 outline-none ${activeTab === 'utils' ? 'border-[#00ac47] text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
            >
              Tiện ích
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-5 py-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap shrink-0 outline-none ${activeTab === 'logs' ? 'border-[#00ac47] text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
            >
              Nhật ký hoạt động
            </button>
          </div>

          <div className="w-full">
            {activeTab === 'info' && (
              <div className="space-y-6">
                <div className="bg-[#0f1118]/80 border border-white/[0.06] backdrop-blur-[20px] rounded-2xl overflow-hidden p-6 shadow-md">
                  <form onSubmit={handleUpdateProfile}>
                    <div className="mb-6">
                      <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2 block">Họ và tên</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="w-full bg-[#12131a] border border-white/[0.08] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00ac47]/60 focus:ring-1 focus:ring-[#00ac47]/30 transition-all text-sm"
                      />
                    </div>
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500 block m-0">Email</label>
                        {isEmailVerified ? (
                          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#00ac47]/10 text-[#00ac47] border border-[#00ac47]/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#00ac47]"></span>
                            Đã xác minh
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                            Chưa xác minh
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="email"
                          value={user.email}
                          readOnly
                          className="flex-1 bg-zinc-900/40 border border-white/[0.04] rounded-xl px-4 py-3 text-zinc-400 cursor-not-allowed text-sm"
                        />
                        {!isEmailVerified && !isVerifying && (
                          <button
                            type="button"
                            onClick={handleSendVerificationEmail}
                            disabled={isSendingOtp}
                            className="px-5 py-3 bg-[#00ac47]/10 hover:bg-[#00ac47] text-[#00ac47] hover:text-white border border-[#00ac47]/20 hover:border-[#00ac47] text-xs font-bold rounded-xl transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
                          >
                            {isSendingOtp ? 'Đang gửi...' : 'Xác minh'}
                          </button>
                        )}
                      </div>
                      {isVerifying && (
                        <div className="mt-3 p-4 bg-[#12131a] border border-white/[0.08] rounded-xl">
                          <p className="text-xs text-zinc-400 mb-3">Nhập mã OTP 6 số đã được gửi đến email của bạn:</p>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              maxLength={6}
                              placeholder="Mã OTP"
                              value={otpCode}
                              onChange={(e) => setOtpCode(e.target.value)}
                              className="flex-1 bg-black/50 border border-white/[0.08] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#00ac47]/60 text-center text-sm font-semibold tracking-widest"
                            />
                            <button
                              type="button"
                              onClick={handleVerifyEmailCode}
                              disabled={isConfirmingOtp || otpCode.length < 6}
                              className="px-4 py-2 bg-[#00ac47] hover:bg-[#00c250] text-white text-xs font-bold rounded-lg transition-all disabled:opacity-50"
                            >
                              {isConfirmingOtp ? 'Đang xử lý...' : 'Xác nhận'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsVerifying(false)}
                              className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-xs font-semibold rounded-lg transition-colors"
                            >
                              Hủy
                            </button>
                          </div>
                        </div>
                      )}
                      {otpSuccess && (
                        <div className="mt-2 text-xs text-[#00ac47] font-medium">{otpSuccess}</div>
                      )}
                      {otpError && (
                        <div className="mt-2 text-xs text-red-400 font-medium">{otpError}</div>
                      )}
                    </div>
                    <div className="mb-6">
                      <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2 block">Giới tính</label>
                      <div className="flex gap-3">
                        {['Nam', 'Nữ', 'Khác'].map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setGender(g)}
                            className={`flex-1 py-3 text-sm font-semibold rounded-xl border transition-all cursor-pointer outline-none ${
                              gender === g
                                ? 'bg-[#00ac47] text-white border-transparent font-bold'
                                : 'bg-[#12131a] text-zinc-400 border-white/[0.08] hover:text-white hover:border-white/20'
                            }`}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="mb-6">
                      <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2 block">Ảnh đại diện</label>
                      <div className="flex items-center gap-4 p-4 bg-[#12131a] border border-white/[0.08] rounded-xl">
                        <img
                          src={avatarUrl}
                          alt="Selected Avatar"
                          className="w-16 h-16 rounded-full object-cover border border-white/10 bg-zinc-900"
                        />
                        <div>
                          <button
                            type="button"
                            onClick={() => setShowAvatarSelector(true)}
                            className="px-4 py-2 bg-[#00ac47]/10 hover:bg-[#00ac47] text-[#00ac47] hover:text-white border border-[#00ac47]/20 hover:border-[#00ac47] text-xs font-bold rounded-lg transition-all cursor-pointer"
                          >
                            Chọn ảnh đại diện có sẵn
                          </button>
                          <p className="text-[10px] text-zinc-500 mt-1.5">Chọn từ bộ sưu tập anime, meme và diễn viên nổi tiếng.</p>
                        </div>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={isUpdatingProfile}
                      className="px-6 py-3 bg-[#00ac47] hover:bg-[#00c250] text-white font-bold rounded-xl transition-all text-sm disabled:opacity-50 active:scale-[0.98]"
                    >
                      {isUpdatingProfile ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                  </form>
                </div>

                <div className="bg-[#0f1118]/80 border border-white/[0.06] backdrop-blur-[20px] rounded-2xl overflow-hidden p-6 shadow-md">
                  <h3 className="text-lg font-bold mb-4">Đổi mật khẩu</h3>
                  <form onSubmit={handleChangePassword}>
                    <div className="mb-6">
                      <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2 block">Mật khẩu cũ</label>
                      <input
                        type="password"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        required
                        className="w-full bg-[#12131a] border border-white/[0.08] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00ac47]/60 focus:ring-1 focus:ring-[#00ac47]/30 transition-all text-sm"
                      />
                    </div>
                    <div className="mb-6">
                      <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2 block">Mật khẩu mới</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        className="w-full bg-[#12131a] border border-white/[0.08] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00ac47]/60 focus:ring-1 focus:ring-[#00ac47]/30 transition-all text-sm"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isUpdatingPass}
                      className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-all text-sm disabled:opacity-50 border border-white/[0.05] active:scale-[0.98]"
                    >
                      {isUpdatingPass ? 'Đang đổi...' : 'Đổi mật khẩu'}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {activeTab === 'stats' && (
              <div className="w-full">
                <div className="w-full bg-[#0f1118]/80 border border-white/[0.06] backdrop-blur-[20px] rounded-2xl p-6 shadow-2xl relative overflow-hidden">
                  <div className="flex items-center justify-between mb-8 relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-tr from-[#00ac47] to-emerald-500 rounded-xl shadow-lg shadow-[#00ac47]/20">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-white animate-pulse"><path d="M3 3v16a2 2 0 0 0 2 2h16"></path><path d="M18 17V9"></path><path d="M13 17V5"></path><path d="M8 17v-3"></path></svg>
                      </div>
                      <div>
                        <h2 className="text-lg font-bold tracking-tight text-white">Thống Kê Giờ Xem</h2>
                        <p className="text-xs text-zinc-400">Xu hướng xem phim của bạn trong 7 ngày qua</p>
                      </div>
                    </div>
                  </div>
                  <div className="relative h-60 w-full mb-8 z-10 flex items-end justify-between px-2 border-b border-white/5 pb-2">
                    {last7Days.map((day, idx) => (
                      <div key={idx} className="flex flex-col items-center flex-1 h-full justify-end group cursor-pointer relative">
                        <div className="opacity-0 group-hover:opacity-100 absolute -top-12 bg-black/80 text-white text-xs py-1 px-2 rounded border border-white/10 whitespace-nowrap pointer-events-none transition-opacity z-20 text-center">
                          {day.dateStr}<br />
                          <span className="text-[#00ac47] font-bold">{formatWatchTime(day.seconds)}</span>
                        </div>
                        <div className="w-8 sm:w-12 md:w-16 h-full flex items-end justify-center relative">
                          <div
                            className="w-full rounded-t-lg bg-gradient-to-t from-[#00ac47]/80 to-emerald-400/90 hover:from-[#00ac47] hover:to-emerald-400 transition-all duration-300 relative"
                            style={{ height: `${day.height}%` }}
                          >
                            <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/40 rounded-t-lg"></div>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-zinc-400 mt-3 group-hover:text-white transition-colors duration-200">{day.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 relative z-10">
                    <div className="bg-white/5 border border-white/5 rounded-xl p-4 flex flex-col justify-between hover:bg-white/10 hover:border-white/10 transition-all duration-300 group">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Tổng thời gian</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-[#00ac47] group-hover:rotate-12 transition-transform"><path d="M12 6v6l4 2"></path><circle cx="12" cy="12" r="10"></circle></svg>
                      </div>
                      <div className="mt-2">
                        <span className="text-xl font-extrabold text-white tracking-tight">{formatWatchTime(weeklySec)}</span>
                        <p className="text-[10px] text-zinc-500 mt-0.5">7 ngày qua</p>
                      </div>
                    </div>
                    <div className="bg-white/5 border border-white/5 rounded-xl p-4 flex flex-col justify-between hover:bg-white/10 hover:border-white/10 transition-all duration-300 group">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Trung bình ngày</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-[#00ac47] group-hover:scale-110 transition-transform"><path d="M16 7h6v6"></path><path d="m22 7-8.5 8.5-5-5L2 17"></path></svg>
                      </div>
                      <div className="mt-2">
                        <span className="text-xl font-extrabold text-white tracking-tight">{formatWatchTime(avgDailySec)}</span>
                        <p className="text-[10px] text-zinc-500 mt-0.5">mỗi ngày</p>
                      </div>
                    </div>
                    <div className="bg-white/5 border border-white/5 rounded-xl p-4 flex flex-col justify-between hover:bg-white/10 hover:border-white/10 transition-all duration-300 group">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Kỷ lục tuần</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-[#00ac47] group-hover:scale-110 transition-transform"><path d="M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4"></path></svg>
                      </div>
                      <div className="mt-2">
                        <span className="text-xl font-extrabold text-white tracking-tight">{recordSec > 0 ? formatWatchTime(recordSec) : 'Chưa có'}</span>
                        <p className="text-[10px] text-zinc-500 mt-0.5">{recordSec > 0 ? 'kỷ lục' : '0 phút'}</p>
                      </div>
                    </div>
                    <div className="bg-white/5 border border-white/5 rounded-xl p-4 flex flex-col justify-between hover:bg-white/10 hover:border-white/10 transition-all duration-300 group">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Hạng server</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-[#00ac47] group-hover:rotate-12 transition-transform"><path d="M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978"></path><path d="M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978"></path><path d="M18 9h1.5a1 1 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z"></path><path d="M6 9H4.5a1 1 0 0 1 0-5H6"></path></svg>
                      </div>
                      <div className="mt-2">
                        <span className="text-xl font-extrabold text-[#00ac47] tracking-tight">#{userRank}</span>
                        <p className="text-[10px] text-zinc-500 mt-0.5">toàn hệ thống</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'articles' && (
              <UserArticlesTab />
            )}

            {activeTab === 'utils' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link
                  className="group block bg-[#0f1118]/85 border border-white/[0.06] backdrop-blur-[20px] rounded-2xl p-6 transition-all duration-300 hover:border-zinc-700/80 hover:bg-[#131520] shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:-translate-y-1 min-h-[160px] flex flex-col justify-between"
                  href="/thu-vien"
                >
                  <div className="flex items-center justify-between">
                    <div className="p-2 rounded-xl bg-zinc-900 border border-white/[0.08] text-zinc-400 group-hover:text-white transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><rect width="18" height="18" x="3" y="3" rx="2"></rect><path d="M7 3v18"></path><path d="M3 7.5h4"></path><path d="M3 12h18"></path><path d="M3 16.5h4"></path><path d="M17 3v18"></path><path d="M17 7.5h4"></path><path d="M17 16.5h4"></path></svg>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-zinc-600 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all"><path d="m9 18 6-6-6-6"></path></svg>
                  </div>
                  <div className="mt-4">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Thư viện</p>
                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-[#00ac47] transition-colors">Thư viện của bạn</h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                      <span className="flex items-center gap-1.5"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-zinc-500"><path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5"></path></svg> {favoriteCount} yêu thích</span>
                      <span className="flex items-center gap-1.5"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-zinc-500"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg> {watchLaterCount} xem tiếp</span>
                    </div>
                  </div>
                </Link>

                <Link
                  className="group block bg-[#0f1118]/85 border border-white/[0.06] backdrop-blur-[20px] rounded-2xl p-6 transition-all duration-300 hover:border-zinc-700/80 hover:bg-[#131520] shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:-translate-y-1 min-h-[160px] flex flex-col justify-between"
                  href="/lich-su"
                >
                  <div className="flex items-center justify-between">
                    <div className="p-2 rounded-xl bg-zinc-900 border border-white/[0.08] text-zinc-400 group-hover:text-white transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><path d="M12 7v5l4 2"></path></svg>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-zinc-600 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all"><path d="m9 18 6-6-6-6"></path></svg>
                  </div>
                  <div className="mt-4">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Hoạt động</p>
                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-[#00ac47] transition-colors">Lịch sử xem</h3>
                    <p className="text-2xl font-black text-[#00ac47]">{historyCount} <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">phim</span></p>
                  </div>
                </Link>

                <div className="bg-[#0f1118]/85 border border-white/[0.06] backdrop-blur-[20px] rounded-2xl p-6 transition-all duration-300 hover:border-zinc-700/80 hover:bg-[#131520] shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:-translate-y-1 min-h-[160px] flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div className="p-2 rounded-xl bg-zinc-900 border border-white/[0.08] text-zinc-400">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><line x1="10" x2="14" y1="2" y2="2"></line><line x1="12" x2="15" y1="14" y2="11"></line><circle cx="12" cy="14" r="8"></circle></svg>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Thống kê</p>
                    <h3 className="text-lg font-bold text-white mb-2">Tổng thời gian xem</h3>
                    <p className="text-2xl font-black text-[#00ac47]">{formatWatchTime(totalWatchTimeSec)}</p>
                  </div>
                </div>

                <div className="bg-[#0f1118]/85 border border-white/[0.06] backdrop-blur-[20px] rounded-2xl p-6 transition-all duration-300 hover:border-zinc-700/80 hover:bg-[#131520] shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:-translate-y-1 min-h-[160px] flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div className="p-2 rounded-xl bg-zinc-900 border border-white/[0.08] text-zinc-400">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978"></path><path d="M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978"></path><path d="M18 9h1.5a1 1 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z"></path><path d="M6 9H4.5a1 1 0 0 1 0-5H6"></path></svg>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Bảng xếp hạng</p>
                    <h3 className="text-lg font-bold text-white mb-2">Xếp hạng của bạn</h3>
                    <p className="text-2xl font-black text-[#00ac47]">Top {userRank}</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'logs' && (
              <div className="bg-[#0f1118]/80 border border-white/[0.06] backdrop-blur-[20px] rounded-2xl overflow-hidden p-6 shadow-md">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-white">Nhật ký hoạt động</h3>
                  <button
                    onClick={fetchLogs}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                    Tải lại
                  </button>
                </div>

                {isLoadingLogs ? (
                  <div className="py-12 text-center text-zinc-500 text-sm animate-pulse">Đang tải nhật ký...</div>
                ) : logs.length === 0 ? (
                  <div className="py-12 text-center text-zinc-500 text-sm">Chưa có hoạt động nào được ghi nhận.</div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-zinc-800">
                    <table className="w-full text-left text-sm border-collapse bg-zinc-950/30">
                      <thead>
                        <tr className="border-b border-zinc-800 bg-zinc-900/50 text-[#00ac47] text-xs uppercase tracking-wider font-bold">
                          <th className="py-3 px-4">Thời gian</th>
                          <th className="py-3 px-4">Hành động</th>
                          <th className="py-3 px-4">Chi tiết</th>
                          <th className="py-3 px-4">Địa chỉ IP</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.map((log) => (
                          <tr key={log.id} className="border-b border-zinc-900/60 hover:bg-white/[0.02] transition-colors">
                            <td className="py-3.5 px-4 text-xs text-zinc-400 whitespace-nowrap">
                              {new Date(log.created_at).toLocaleString('vi-VN')}
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-white whitespace-nowrap">
                              {log.action}
                            </td>
                            <td className="py-3.5 px-4 text-zinc-400 max-w-xs truncate">
                              {log.details || '-'}
                            </td>
                            <td className="py-3.5 px-4 text-xs font-mono text-zinc-500">
                              {log.ip_address || 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Avatar Selector Modal */}
      {showAvatarSelector && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md animate-fadeIn"
          onClick={() => setShowAvatarSelector(false)}
        >
          <div
            className="bg-[#0f1118] border border-white/[0.08] rounded-3xl p-6 w-full max-w-2xl shadow-2xl relative max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white mt-0">Chọn ảnh đại diện có sẵn</h3>
              <button
                onClick={() => setShowAvatarSelector(false)}
                className="bg-transparent border-none text-zinc-400 hover:text-white text-2xl cursor-pointer outline-none"
              >
                ×
              </button>
            </div>

            {/* Selector Categories tabs */}
            <div className="flex gap-1 border-b border-white/10 pb-2 scrollbar-none overflow-x-auto mb-4 shrink-0">
              {PRESET_AVATARS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setAvatarSelectorTab(idx)}
                  className={`px-3 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-colors border-none cursor-pointer outline-none ${avatarSelectorTab === idx ? 'bg-[#00ac47] text-white' : 'bg-transparent text-zinc-400 hover:text-white'}`}
                >
                  {preset.category}
                </button>
              ))}
            </div>

            {/* Avatar grid */}
            <div className="overflow-y-auto pr-1 flex-1 py-2 scrollbar-none">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                {PRESET_AVATARS[avatarSelectorTab].items.map((item, idx) => {
                  const isSelected = avatar === item.url;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setAvatar(item.url);
                        setShowAvatarSelector(false);
                      }}
                      className="group flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-white/5 transition-all border-none bg-transparent cursor-pointer outline-none"
                    >
                      <div className={`relative w-16 h-16 rounded-full overflow-hidden border-2 ${isSelected ? 'border-[#00ac47]' : 'border-white/10 group-hover:border-white/30'} transition-all`}>
                        <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                        {isSelected && (
                          <div className="absolute inset-0 bg-[#00ac47]/20 flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path>
                            </svg>
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-zinc-400 group-hover:text-white text-center truncate w-full">{item.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end mt-4 pt-4 border-t border-white/10 shrink-0">
              <button
                type="button"
                onClick={() => setShowAvatarSelector(false)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl cursor-pointer text-xs border-none outline-none"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
