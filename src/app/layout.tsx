import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { cookies } from "next/headers";

const beVietnamPro = Be_Vietnam_Pro({
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  subsets: ["latin", "vietnamese"],
  variable: "--font-be-vietnam-pro",
});

import prisma from "@/lib/db";

export async function generateMetadata(): Promise<Metadata> {
  let settings: Record<string, string | null> = {};
  try {
    const settingsList = await prisma.settings.findMany();
    settings = settingsList.reduce((acc, item) => {
      acc[item.key] = item.value;
      return acc;
    }, {} as Record<string, string | null>);
  } catch (err) {
    console.error("Failed to fetch metadata settings:", err);
  }

  const siteTitle = settings.site_title || "TÔ PHIM - Web Phim Online Chất Lượng Cao";
  const siteDescription = settings.site_description || "Trang web xem phim trực tuyến chất lượng cao với giao diện TSX hiện đại, hỗ trợ crawl tự động và tốc độ tải trang nhanh.";
  const siteKeywords = settings.site_keywords || "hubphim, xem phim online, phim vietsub, web xem phim";
  const favicon = settings.favicon_url || "/favicon.ico";
  const ogImage = settings.og_image_url || "/assets/images/og-image.jpg";

  const siteUrl = settings.site_url || 'https://tophim.com';

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: siteTitle,
      template: `%s | Tô Phim`,
    },
    description: siteDescription,
    keywords: siteKeywords,
    referrer: 'strict-origin-when-cross-origin',
    icons: {
      icon: favicon,
      shortcut: favicon,
      apple: favicon,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    openGraph: {
      title: siteTitle,
      description: siteDescription,
      siteName: 'Tô Phim',
      locale: 'vi_VN',
      type: 'website',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: siteTitle,
        }
      ]
    },
    twitter: {
      card: 'summary_large_image',
      title: siteTitle,
      description: siteDescription,
      images: [ogImage],
    },
  };
}


export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let settings: Record<string, string> = {};
  let isAdmin = false;

  try {
    const settingsList = await prisma.settings.findMany();
    settingsList.forEach(item => {
      settings[item.key] = item.value || '';
    });
  } catch (err) {
    console.error("Failed to query settings in layout:", err);
  }

  const cookieStore = await cookies();
  const { getSession } = await import('@/lib/auth');
  const session = await getSession();
  const userIdStr = session?.userId?.toString();
  let userId: number | null = null;
  if (userIdStr) {
    userId = parseInt(userIdStr);
    try {
      const user = await prisma.users.findUnique({
        where: { id: userId },
        select: { role: true }
      });
      isAdmin = user?.role === 'admin';
    } catch (err) {
      console.error("Failed to check user role:", err);
    }
  }

  // Track visitor activity
  if (!isAdmin) {
    try {
      const { headers } = await import('next/headers');
      const headerList = await headers();
      const ip = headerList.get('x-forwarded-for')?.split(',')[0] || headerList.get('x-real-ip') || '127.0.0.1';
      const { trackVisitorActivity } = await import('@/lib/activity');
      trackVisitorActivity(userId, ip).catch(err => console.error("Activity track error:", err));
    } catch (err) {
      console.error("Activity track setup error:", err);
    }
  }

  const maintenanceEnabled = settings.maintenance_mode === 'true' || settings.maintenance_mode === 'on';
  const headerScripts = settings.header_scripts || '';
  const footerScripts = settings.footer_scripts || '';

  return (
    <html
      lang="vi"
      className={`${beVietnamPro.variable} ${beVietnamPro.className} h-full antialiased`}
    >
      <body suppressHydrationWarning className={`${beVietnamPro.className} min-h-full flex flex-col bg-[#0f111a] text-zinc-50`}>
        {headerScripts && (
          <div style={{ display: 'none' }} dangerouslySetInnerHTML={{ __html: headerScripts }} />
        )}

        {maintenanceEnabled && !isAdmin ? (
          <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#09090b] text-white p-6 relative overflow-hidden font-sans">
            {/* Ambient Background Effects */}
            <div className="absolute inset-0 z-0">
              <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#FFD166]/10 rounded-full blur-[120px] mix-blend-screen animate-pulse duration-10000" />
              <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-amber-600/10 rounded-full blur-[150px] mix-blend-screen animate-pulse duration-7000 delay-1000" />
              <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay"></div>
            </div>
            
            <div className="max-w-xl w-full text-center relative z-10 space-y-10">
              {/* Logo Section */}
              <div className="flex flex-col items-center justify-center space-y-4 animate-[fadeInDown_0.8s_ease-out]">
                <div className="relative group cursor-default">
                  <div className="absolute -inset-4 bg-gradient-to-r from-[#FFD166]/20 to-amber-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                  <img 
                    src={settings.logo_url || '/branding/logo.png'} 
                    alt={settings.site_name || 'Logo'} 
                    className="h-16 md:h-20 w-auto object-contain relative z-10 drop-shadow-2xl hover:scale-105 transition-transform duration-500" 
                  />
                </div>
              </div>

              {/* Main Card */}
              <div className="bg-[#12141c]/60 border border-white/[0.04] p-10 md:p-14 rounded-[2rem] backdrop-blur-2xl shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#FFD166]/30 to-transparent opacity-50"></div>
                
                {/* Icon */}
                <div className="w-20 h-20 bg-[#FFD166]/10 border border-[#FFD166]/20 rounded-2xl flex items-center justify-center mx-auto text-[#FFD166] mb-8 shadow-[0_0_30px_rgba(255,209,102,0.15)] group-hover:shadow-[0_0_40px_rgba(255,209,102,0.25)] transition-shadow duration-500">
                  <svg className="w-10 h-10 animate-[spin_4s_linear_infinite]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.25 2.25 0 0115.622 23H8.378a2.25 2.25 0 01-1.628-2.83l5.83-5.83z"></path>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-1.5a2.25 2.25 0 01-2.25-2.25V6.75a2.25 2.25 0 012.25-2.25h1.5a2.25 2.25 0 012.25 2.25z"></path>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 0a2.25 2.25 0 00-2.25-2.25h-1.5a2.25 2.25 0 00-2.25 2.25v1.5a2.25 2.25 0 002.25 2.25h1.5A2.25 2.25 0 0012 8.25z"></path>
                  </svg>
                </div>
                
                <div className="space-y-4">
                  <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white/90">Hệ Thống <span className="text-[#FFD166]">Bảo Trì</span></h1>
                  <p className="text-zinc-400 text-sm md:text-base leading-relaxed max-w-sm mx-auto font-medium">
                    {settings.maintenance_reason || "Chúng tôi đang tiến hành nâng cấp định kỳ để mang lại trải nghiệm xem phim hoàn hảo nhất. Vui lòng quay lại sau ít phút!"}
                  </p>
                </div>

                {/* Progress bar effect */}
                <div className="mt-10 max-w-xs mx-auto">
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#FFD166]/40 via-[#FFD166] to-[#FFD166]/40 w-full animate-[translateX_2s_infinite_linear] origin-left" style={{ animationName: 'progress-shimmer' }}></div>
                  </div>
                  <div className="mt-4 flex justify-between text-[11px] font-bold tracking-widest text-zinc-500 uppercase">
                    <span>Trạng thái</span>
                    <span className="text-[#FFD166] animate-pulse">Đang cập nhật...</span>
                  </div>
                </div>
              </div>

              {/* Footer text */}
              <div className="text-zinc-500 text-sm font-medium pt-4 opacity-80">
                &copy; {new Date().getFullYear()} {settings.site_name || 'Tô Phim'}. All rights reserved.
              </div>
            </div>
            
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes progress-shimmer {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
              }
              @keyframes fadeInDown {
                from { opacity: 0; transform: translateY(-20px); }
                to { opacity: 1; transform: translateY(0); }
              }
            `}} />
          </div>
        ) : (
          <>
            {maintenanceEnabled && isAdmin && (
              <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-500 px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                Chế độ bảo trì đang BẬT. Chỉ có Quản trị viên (Admin) mới có thể xem được trang web này.
              </div>
            )}
            <Navbar />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </>
        )}

        {footerScripts && (
          <div style={{ display: 'none' }} dangerouslySetInnerHTML={{ __html: footerScripts }} />
        )}
      </body>
    </html>
  );
}
