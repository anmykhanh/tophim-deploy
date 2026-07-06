import Link from 'next/link';
import prisma from '@/lib/db';
import AdBanner from '@/components/AdBanner';

export default async function Footer() {
  // Query site settings
  const settings = await prisma.settings.findMany();
  const settingsMap = new Map(settings.map(s => [s.key, s.value]));

  const logoUrl = settingsMap.get('logo_url') || '/branding/logo.png';
  const siteName = settingsMap.get('site_name') || 'Tô Phim.Com';
  const siteDescription = settingsMap.get('site_description') || 'TÔ PHIM - Trang xem phim online chất lượng cao miễn phí Vietsub, thuyết minh, lồng tiếng full HD. Kho phim mới khổng lồ, phim chiếu rạp, phim bộ, phim lẻ từ nhiều quốc gia như Việt Nam, Hàn Quốc, Trung Quốc, Thái Lan, Nhật Bản, Âu Mỹ… đa dạng thể loại. Khám phá nền tảng phim trực tuyến hay nhất 2026 với chất lượng 4K!';

  // Above-footer ad banner
  const aboveFooterEnabled = settingsMap.get('ads_banner_above_footer_enabled') === 'true';
  const aboveFooterImage = settingsMap.get('ads_banner_above_footer_image') || '';
  const aboveFooterLink = settingsMap.get('ads_banner_above_footer_link') || '';

  // Social media links from settings
  const socialTelegram = settingsMap.get('social_telegram') || 'https://t.me';
  const socialDiscord = settingsMap.get('social_discord') || 'https://discord.gg';
  const socialX = settingsMap.get('social_x') || 'https://x.com';
  const socialFacebook = settingsMap.get('social_facebook') || 'https://facebook.com';
  const socialTiktok = settingsMap.get('social_tiktok') || 'https://tiktok.com';
  const socialYoutube = settingsMap.get('social_youtube') || 'https://youtube.com';
  const socialThreads = settingsMap.get('social_threads') || 'https://threads.net';
  const socialInstagram = settingsMap.get('social_instagram') || 'https://instagram.com';

  // Query movie count
  const moviesCount = await prisma.movies.count();

  return (
    <footer className="bg-[#0a0a0f] border-t border-white/5 mt-16 pb-12 w-full">
      {/* Above-footer ad banner (Sticky bottom) */}
      {aboveFooterEnabled && aboveFooterImage && (
        <div className="fixed bottom-0 left-0 w-full z-[999] pointer-events-none flex justify-center pb-0 sm:pb-2">
          <div className="w-full max-w-[1400px] px-0 sm:px-4 pointer-events-auto">
            <AdBanner 
              image={aboveFooterImage} 
              link={aboveFooterLink} 
              position="above_footer" 
              className="shadow-[0_-5px_20px_rgba(0,0,0,0.8)] sm:rounded-lg border-t sm:border border-white/10 [&>img]:!max-h-[70px] sm:[&>img]:!max-h-[90px]" 
            />
          </div>
        </div>
      )}
      <div className="max-w-[1400px] mx-auto px-4 pt-10">
        
        {/* Flag badge & Movie count badge */}
        <div className="mb-10 flex flex-wrap items-center gap-3 text-left">
          <div className="inline-flex items-center gap-2 bg-[#8c171e] text-white px-4 py-2 rounded-full text-sm font-medium shadow-md">
            <img
              alt="VN Flag"
              loading="lazy"
              width="18"
              height="18"
              className="rounded-[2px] object-cover"
              src="/icons/vn_flag.svg"
            />
            <span>Một tình yêu cho Việt Nam ❤️</span>
          </div>
          <div className="inline-flex items-center gap-2 bg-[#12121a] border border-white/5 text-white/80 px-4 py-2 rounded-full text-sm font-medium shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Tổng số phim: <strong className="text-white font-semibold">{moviesCount.toLocaleString('vi-VN')}</strong></span>
          </div>
        </div>

        {/* Logo and Social links */}
        <div className="flex flex-col md:flex-row md:items-center pt-2 pb-6 gap-8 md:gap-8 justify-between">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <Link className="inline-block shrink-0 mx-auto md:mx-0" href="/">
              <img
                alt={siteName}
                loading="lazy"
                width="260"
                height="80"
                className="h-[72px] md:h-[80px] w-auto object-contain"
                src={logoUrl}
              />
            </Link>
            <div className="hidden md:block w-px h-10 bg-white/10"></div>
          </div>

          {/* Social media links */}
          <div className="flex flex-nowrap items-center justify-center md:justify-start gap-2.5 sm:gap-3 overflow-x-auto overflow-y-hidden w-full md:w-auto pb-2 md:pb-0 scrollbar-none shrink-0">
            <a href={socialTelegram} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-[#12121a] flex items-center justify-center text-white/80 hover:bg-[#1c1c28] transition-colors">
              <img alt="Telegram" loading="lazy" width="18" height="18" className="opacity-80 hover:opacity-100 transition-opacity" src="/icons/telegram-icon.svg" />
            </a>
            <a href={socialDiscord} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-[#12121a] flex items-center justify-center text-white/80 hover:bg-[#1c1c28] transition-colors">
              <img alt="Discord" loading="lazy" width="18" height="18" className="opacity-80 hover:opacity-100 transition-opacity" src="/icons/discord-icon.svg" />
            </a>
            <a href={socialX} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-[#12121a] flex items-center justify-center text-white/80 hover:bg-[#1c1c28] transition-colors">
              <img alt="X" loading="lazy" width="16" height="16" className="opacity-80 hover:opacity-100 transition-opacity" src="/icons/x-icon.svg" />
            </a>
            <a href={socialFacebook} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-[#12121a] flex items-center justify-center text-white/80 hover:bg-[#1c1c28] transition-colors">
              <img alt="Facebook" loading="lazy" width="18" height="18" className="opacity-80 hover:opacity-100 transition-opacity" src="/icons/facebook-icon.svg" />
            </a>
            <a href={socialTiktok} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-[#12121a] flex items-center justify-center text-white/80 hover:bg-[#1c1c28] transition-colors">
              <img alt="TikTok" loading="lazy" width="18" height="18" className="opacity-80 hover:opacity-100 transition-opacity" src="/icons/tiktok-icon.svg" />
            </a>
            <a href={socialYoutube} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-[#12121a] flex items-center justify-center text-white/80 hover:bg-[#1c1c28] transition-colors">
              <img alt="YouTube" loading="lazy" width="18" height="18" className="opacity-80 hover:opacity-100 transition-opacity" src="/icons/youtube-icon.svg" />
            </a>
            <a href={socialThreads} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-[#12121a] flex items-center justify-center text-white/80 hover:bg-[#1c1c28] transition-colors">
              <img alt="Threads" loading="lazy" width="18" height="18" className="opacity-80 hover:opacity-100 transition-opacity" src="/icons/threads-icon.svg" />
            </a>
            <a href={socialInstagram} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-[#12121a] flex items-center justify-center text-white/80 hover:bg-[#1c1c28] transition-colors">
              <img alt="Instagram" loading="lazy" width="18" height="18" className="opacity-80 hover:opacity-100 transition-opacity" src="/icons/instagram-icon.svg" />
            </a>
          </div>
        </div>

        {/* Footer Navigation links */}
        <div className="flex flex-wrap items-center gap-6 mt-8 mb-6 justify-start">
          <Link className="text-[15px] font-medium text-white/90 hover:text-yellow-400 transition-colors" href="/hoi-dap">Hỏi-Đáp</Link>
          <Link className="text-[15px] font-medium text-white/90 hover:text-yellow-400 transition-colors" href="/chinh-sach-bao-mat">Chính sách bảo mật</Link>
          <Link className="text-[15px] font-medium text-white/90 hover:text-yellow-400 transition-colors" href="/dieu-khoan-su-dung">Điều khoản sử dụng</Link>
          <Link className="text-[15px] font-medium text-white/90 hover:text-yellow-400 transition-colors" href="/gioi-thieu">Giới thiệu</Link>
          <Link className="text-[15px] font-medium text-white/90 hover:text-yellow-400 transition-colors" href="/lien-he">Liên hệ</Link>
        </div>

        {/* SEO description */}
        <div className="mt-4 max-w-5xl text-left">
          <p className="text-[14px] leading-[1.8] text-white/60 max-w-[85ch]">
            {siteDescription}
          </p>
        </div>

        {/* Copyright */}
        <div className="mt-6 pt-2 border-t border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-left">
          <p className="text-[14px] text-white/80">© {new Date().getFullYear()} {siteName}</p>
          <p className="text-[14px] text-white/60">Tổng số phim: <span className="text-yellow-400 font-semibold">{moviesCount.toLocaleString('vi-VN')}</span></p>
        </div>

      </div>
    </footer>
  );
}
