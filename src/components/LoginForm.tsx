'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getProxyImageUrl } from '@/lib/image';

interface LoginFormProps {
  logoUrl: string;
  siteName: string;
  bgMovies: string[];
  googleClientId?: string;
}

// Add declaration for window.google
declare global {
  interface Window {
    google?: any;
  }
}

export default function LoginForm({ logoUrl, siteName, bgMovies, googleClientId }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Load Google Sign-In SDK dynamically if clientId is present
  useEffect(() => {
    if (!googleClientId) return;

    // Check if script is already present
    let script = document.getElementById('google-gsi-client') as HTMLScriptElement;
    if (!script) {
      script = document.createElement('script');
      script.id = 'google-gsi-client';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }

    const handleGoogleLogin = async (response: any) => {
      setError('');
      setIsLoading(true);
      try {
        const res = await fetch('/api/auth/google', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ credential: response.credential }),
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Đăng nhập Google thất bại!');
          setIsLoading(false);
          return;
        }

        router.push('/');
        router.refresh();
      } catch (err) {
        console.error(err);
        setError('Kết nối máy chủ thất bại khi đăng nhập Google!');
        setIsLoading(false);
      }
    };

    const initializeGoogle = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleLogin,
        });

        const btnParent = document.getElementById('google-login-btn-parent');
        if (btnParent) {
          window.google.accounts.id.renderButton(btnParent, {
            theme: 'filled_black',
            size: 'large',
            width: btnParent.offsetWidth || 340,
            text: 'continue_with',
            shape: 'rectangular',
          });
        }
      }
    };

    script.onload = () => {
      initializeGoogle();
    };

    // If script is already loaded
    if (window.google?.accounts?.id) {
      initializeGoogle();
    }
  }, [googleClientId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Đăng nhập thất bại. Vui lòng thử lại!');
        setIsLoading(false);
        return;
      }

      // Success - redirect to home page and reload
      router.push('/');
      router.refresh();
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
          <h2 className="text-[26px] font-bold text-white mb-2 tracking-tight">Chào mừng trở lại</h2>
          <p className="text-sm text-zinc-400">Cùng thưởng thức những bộ phim tuyệt vời nhất.</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs text-left mb-5 flex items-center gap-2 animate-shake">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-mail absolute left-4 text-zinc-400 w-4 h-4 pointer-events-none"><rect width="20" height="16" x="2" y="4" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg>
            <input 
              type="email" 
              placeholder="Email đăng nhập" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-white/[0.08] bg-black/30 text-white text-sm outline-none focus:border-[#00ac47] focus:bg-black/50 transition-all"
            />
          </div>

          <div className="relative flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-lock absolute left-4 text-zinc-400 w-4 h-4 pointer-events-none"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="Mật khẩu" 
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

          <div className="flex justify-end pt-1">
            <Link href="/pages/forgot-password" className="text-xs text-zinc-400 hover:text-white hover:underline transition-colors">
              Quên mật khẩu?
            </Link>
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
              'Đăng nhập'
            )}
          </button>

          <div className="flex items-center my-6">
            <div className="flex-1 h-px bg-white/10"></div>
            <span className="px-3 text-xs text-zinc-500 font-medium uppercase tracking-wider">Hoặc</span>
            <div className="flex-1 h-px bg-white/10"></div>
          </div>

          {googleClientId ? (
            <div className="relative w-full h-[46px] mt-4 overflow-hidden rounded-xl">
              {/* Invisible official Google button on top */}
              <div 
                id="google-login-btn-parent" 
                className="absolute inset-0 opacity-0 z-10 w-full h-full cursor-pointer [&_iframe]:!w-full [&_iframe]:!h-full [&_iframe]:!max-w-full"
              ></div>
              
              {/* Custom styled button underneath */}
              <button 
                type="button"
                className="absolute inset-0 flex items-center justify-center gap-2.5 w-full h-full rounded-xl bg-white hover:bg-zinc-50 text-zinc-900 font-bold text-sm transition-all border border-zinc-200 pointer-events-none shadow-md"
              >
                <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" className="w-5 h-5" />
                <span>Tiếp tục với Google</span>
              </button>
            </div>
          ) : (
            <button 
              type="button"
              onClick={() => alert('Chưa cấu hình Google Client ID trong Admin!')}
              className="flex items-center justify-center gap-2.5 w-full py-3 rounded-xl bg-white hover:bg-zinc-50 text-zinc-800 font-bold text-sm transition-all border border-zinc-200 active:scale-[0.98]"
            >
              <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" className="w-5 h-5" />
              Tiếp tục với Google
            </button>
          )}
        </form>

        <div className="mt-8 text-sm text-zinc-400">
          Chưa có tài khoản?
          <Link href="/pages/register" className="text-white font-bold hover:text-[#00c250] ml-1 transition-colors">
            Đăng ký ngay
          </Link>
        </div>
      </div>
    </div>
  );
}
