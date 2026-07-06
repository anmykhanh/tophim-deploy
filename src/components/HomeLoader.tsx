'use client';

import { useEffect, useState } from 'react';

interface HomeLoaderProps {
  logoUrl?: string;
}

export default function HomeLoader({ logoUrl = '/branding/logo.png' }: HomeLoaderProps) {
  const [loading, setLoading] = useState(true);
  const [fadingOut, setFadingOut] = useState(false);
  const [isRemoved, setIsRemoved] = useState(false);

  useEffect(() => {
    // Block scrolling on the body while loading
    document.body.style.overflow = 'hidden';

    // Simulate page loading completion or a brief delay
    const fadeTimer = setTimeout(() => {
      setFadingOut(true);
    }, 600); // Wait 0.6s before fading out

    const removeTimer = setTimeout(() => {
      setLoading(false);
      setIsRemoved(true);
      document.body.style.overflow = '';
    }, 900); // 0.6s delay + 0.3s transition time

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
      document.body.style.overflow = '';
    };
  }, []);

  if (isRemoved) return null;

  return (
    <div
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center overflow-hidden bg-[#0f111a] transition-all duration-300 ease-in-out ${
        fadingOut ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Background Image Container */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="hidden md:block w-full h-full relative">
          <img
            alt="Home Background"
            src="/images/home-background.jpg"
            className="w-full h-full object-cover object-left-top origin-top-left scale-110"
          />
          <div className="absolute inset-0 bg-[#0f111a]/85 backdrop-blur-[2px]" />
        </div>
      </div>

      {/* Pulsing Logo Content */}
      <div className="relative z-10 flex flex-col items-center animate-gentlePulse">
        <div className="relative w-80 h-40 md:w-[520px] md:h-[200px] mb-2 select-none pointer-events-none">
          <img
            alt="Logo"
            src={logoUrl}
            className="w-full h-full object-contain"
          />
        </div>
        <p className="hidden md:block text-white/30 font-medium text-[16px] md:text-[20px] text-center max-w-lg md:max-w-xl drop-shadow-md px-4 tracking-wider uppercase font-semibold">
          Xem Phim Miễn Phí Cực Nhanh, Chất Lượng Cao và Cập Nhật Liên Tục
        </p>
      </div>
    </div>
  );
}

