import { Metadata } from "next";
import prisma from "@/lib/db";
import FAQClient from "@/components/FAQClient";

export async function generateMetadata(): Promise<Metadata> {
  let siteName = 'Tô Phim';
  try {
    const settings = await prisma.settings.findMany();
    const settingsMap = new Map(settings.map(s => [s.key, s.value]));
    siteName = settingsMap.get('site_name') || 'Tô Phim';
  } catch (err) {}
  return {
    title: `Hỏi đáp & Hướng dẫn - ${siteName}`,
    description: `Câu hỏi thường gặp và hướng dẫn giải quyết sự cố xem phim tại ${siteName}.`,
  };
}

export default async function FAQPage() {
  let siteName = 'Tô Phim.Com';
  try {
    const settings = await prisma.settings.findMany();
    const settingsMap = new Map(settings.map(s => [s.key, s.value]));
    siteName = settingsMap.get('site_name') || 'Tô Phim.Com';
  } catch (err) {}

  return (
    <main className="min-h-screen text-white/90 pt-24 pb-20 bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
      <div className="max-w-[860px] mx-auto px-4">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-3 tracking-tight bg-gradient-to-r from-yellow-400 via-amber-200 to-yellow-500 bg-clip-text text-transparent">
            Hỏi-Đáp
          </h1>
          <p className="text-zinc-400 text-[15px] leading-relaxed max-w-[600px] font-light">
            Tìm câu trả lời nhanh cho các vấn đề thường gặp khi trải nghiệm dịch vụ xem phim trực tuyến tại {siteName}.
          </p>
        </div>

        {/* Interactive Accordion Component */}
        <FAQClient siteName={siteName} />

        {/* Support Callout */}
        <div className="mt-12 p-6 md:p-8 bg-white/[0.01] border border-white/5 rounded-2xl text-center backdrop-blur-sm">
          <h3 className="font-bold text-white mb-2 text-[15px] md:text-base">Vẫn chưa tìm thấy câu trả lời?</h3>
          <p className="text-sm text-zinc-500 mb-4 max-w-[500px] mx-auto leading-relaxed">
            Nếu bạn gặp sự cố kỹ thuật phức tạp hơn hoặc có đề nghị hợp tác, vui lòng gửi tin nhắn trực tiếp cho chúng tôi.
          </p>
          <a
            href="/lien-he"
            className="inline-flex items-center justify-center px-6 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-zinc-950 text-xs font-bold rounded-xl transition-all shadow-md"
          >
            Liên hệ với Ban Quản Trị
          </a>
        </div>
      </div>
    </main>
  );
}
