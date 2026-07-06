'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getProxyImageUrl } from '@/lib/image';

interface ForgotPasswordFormProps {
  logoUrl: string;
  siteName: string;
  bgMovies: string[];
}

export default function ForgotPasswordForm({ logoUrl, siteName, bgMovies }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Gửi yêu cầu thất bại. Vui lòng thử lại!');
        setIsLoading(false);
        return;
      }

      setSuccess(data.message || 'Đã gửi hướng dẫn khôi phục mật khẩu vào email của bạn. Vui lòng kiểm tra hộp thư!');
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
          <h2 className="text-[26px] font-bold text-white mb-2 tracking-tight">Quên Mật Khẩu</h2>
          <p className="text-sm text-zinc-400">Nhập email của bạn, chúng tôi sẽ gửi link đặt lại mật khẩu.</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs text-left mb-5 flex items-center gap-2 animate-shake">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-[#34d399] p-3 rounded-xl text-xs text-left mb-5 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            <span>{success}</span>
          </div>
        )}

        {!success && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-mail absolute left-4 text-zinc-400 w-4 h-4 pointer-events-none"><rect width="20" height="16" x="2" y="4" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg>
              <input 
                type="email" 
                placeholder="Địa chỉ email" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-white/[0.08] bg-black/30 text-white text-sm outline-none focus:border-[#00ac47] focus:bg-black/50 transition-all"
              />
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
                  <span>Đang xử lý...</span>
                </>
              ) : (
                'Gửi Yêu Cầu'
              )}
            </button>
          </form>
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
