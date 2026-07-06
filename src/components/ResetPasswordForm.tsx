'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getProxyImageUrl } from '@/lib/image';

interface ResetPasswordFormProps {
  token: string;
  logoUrl: string;
  siteName: string;
  bgMovies: string[];
}

export default function ResetPasswordForm({ token, logoUrl, siteName, bgMovies }: ResetPasswordFormProps) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError('Liên kết không hợp lệ.');
        setIsValidating(false);
        return;
      }

      try {
        const response = await fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`);
        const data = await response.json();

        if (response.ok) {
          setIsTokenValid(true);
        } else {
          setError(data.error || 'Liên kết đã hết hạn hoặc không hợp lệ. Vui lòng yêu cầu lại.');
        }
      } catch (err) {
        setError('Không thể kết nối tới máy chủ. Vui lòng tải lại trang.');
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirm) {
      setError('Mật khẩu xác nhận không khớp!');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password, confirm }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Có lỗi xảy ra, vui lòng thử lại sau.');
        setIsLoading(false);
        return;
      }

      setSuccess(data.message || 'Đổi mật khẩu thành công! Bây giờ bạn có thể đăng nhập.');
      setIsLoading(false);
    } catch (err) {
      console.error(err);
      setError('Kết nối máy chủ thất bại. Vui lòng thử lại!');
      setIsLoading(false);
    }
  };

  return (
    <div className="relative w-full min-h-screen flex justify-center items-center py-10 px-4 bg-[#08080a] overflow-hidden">
      {/* Hide header and footer on this page */}
      <style dangerouslySetInnerHTML={{ __html: 'header, footer { display: none !important; }' }} />

      {/* Slanted grid background */}
      <div className="absolute inset-[-10%] grid grid-cols-6 gap-4 z-1 transform scale-115 -rotate-6 blur-[3px] brightness-[0.18] pointer-events-none">
        {bgMovies.map((poster, idx) => (
          <div 
            key={idx} 
            className="bg-cover bg-center rounded-lg shadow-2xl opacity-60 aspect-[2/3] bg-zinc-900 border border-white/5"
            style={{ backgroundImage: `url('${getProxyImageUrl(poster, 120)}')` }}
          />
        ))}
      </div>

      {/* Abstract Glowing Orbs in Background */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-[#00ac47]/5 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full bg-yellow-500/5 blur-[120px] pointer-events-none"></div>

      {/* Standalone Logo */}
      <div className="absolute top-8 left-8 z-[100]">
        <Link href="/" className="text-2xl font-black tracking-tight text-white select-none">
          {logoUrl ? (
            <img src={logoUrl} alt={siteName} className="h-10 w-auto object-contain" />
          ) : (
            <>Hub<span className="text-[#00ac47]">Phim</span></>
          )}
        </Link>
      </div>

      {/* Glassmorphism Card */}
      <div className="relative z-10 w-full max-w-[420px] bg-[#0f1118]/80 backdrop-blur-[20px] border border-white/[0.06] rounded-[24px] p-8 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.7)] text-center text-white before:absolute before:top-0 before:left-1/4 before:right-1/4 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-[#00ac47]/50 before:to-transparent">
        <div className="mb-8">
          <h2 className="text-[26px] font-bold text-white mb-2 tracking-tight">Đặt Lại Mật Khẩu</h2>
          <p className="text-sm text-zinc-400">Vui lòng nhập mật khẩu mới cho tài khoản của bạn.</p>
        </div>

        {isValidating ? (
          <div className="flex flex-col items-center justify-center py-6 gap-3">
            <svg className="animate-spin h-8 w-8 text-[#00ac47]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-zinc-400 text-sm">Đang xác thực liên kết...</span>
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs text-left mb-5 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="space-y-6">
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-[#34d399] p-3 rounded-xl text-xs text-left flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                  <span>{success}</span>
                </div>
                <Link 
                  href="/pages/login" 
                  className="w-full py-3.5 rounded-xl bg-[#00ac47] hover:bg-[#00c250] text-white font-bold text-[15px] transition-all shadow-[0_4px_15px_rgba(0,172,71,0.2)] hover:shadow-[0_6px_20px_rgba(0,172,71,0.35)] active:scale-[0.98] inline-block text-center"
                >
                  Đăng Nhập Ngay
                </Link>
              </div>
            )}

            {!success && isTokenValid && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-lock absolute left-4 text-zinc-400 w-4 h-4 pointer-events-none"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Mật khẩu mới" 
                    required 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-11 py-3.5 rounded-xl border border-white/[0.08] bg-black/30 text-white text-sm outline-none focus:border-[#00ac47] focus:bg-black/50 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 text-zinc-400 hover:text-white transition-colors cursor-pointer outline-none"
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path><line x1="2" y1="2" x2="22" y2="22"></line></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    )}
                  </button>
                </div>

                <div className="relative flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-lock absolute left-4 text-zinc-400 w-4 h-4 pointer-events-none"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                  <input 
                    type={showConfirm ? "text" : "password"} 
                    placeholder="Xác nhận mật khẩu mới" 
                    required 
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="w-full pl-11 pr-11 py-3.5 rounded-xl border border-white/[0.08] bg-black/30 text-white text-sm outline-none focus:border-[#00ac47] focus:bg-black/50 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-4 text-zinc-400 hover:text-white transition-colors cursor-pointer outline-none"
                  >
                    {showConfirm ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path><line x1="2" y1="2" x2="22" y2="22"></line></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    )}
                  </button>
                </div>

                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full py-3.5 rounded-xl bg-[#00ac47] hover:bg-[#00c250] text-white font-bold text-[15px] transition-all shadow-[0_4px_15px_rgba(0,172,71,0.2)] hover:shadow-[0_6px_20px_rgba(0,172,71,0.35)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Đang cập nhật...</span>
                    </>
                  ) : (
                    'Cập Nhật'
                  )}
                </button>
              </form>
            )}

            {!success && !isTokenValid && error === 'Liên kết đã hết hạn hoặc không hợp lệ. Vui lòng yêu cầu lại.' && (
              <div className="mt-6">
                <Link 
                  href="/pages/forgot-password" 
                  className="w-full py-3.5 rounded-xl bg-[#374151] hover:bg-[#4b5563] text-white font-bold text-[15px] transition-all active:scale-[0.98] inline-block text-center"
                >
                  Yêu Cầu Lại
                </Link>
              </div>
            )}
          </>
        )}

        <div className="mt-8 text-sm text-zinc-400">
          <Link href="/pages/login" className="text-white font-bold hover:text-[#00c250] transition-colors flex items-center justify-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            Quay lại đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}
