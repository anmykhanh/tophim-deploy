import { Metadata } from "next";
import Link from "next/link";
import { Mail, MessageCircle, Gamepad2, Bug, ShieldCheck, Handshake, Lightbulb, UserCog, Users, Clock } from "lucide-react";
import prisma from "@/lib/db";
import ContactForm from "@/components/ContactForm";

export async function generateMetadata(): Promise<Metadata> {
  let siteName = 'Tô Phim';
  try {
    const settings = await prisma.settings.findMany();
    const settingsMap = new Map(settings.map(s => [s.key, s.value]));
    siteName = settingsMap.get('site_name') || 'Tô Phim';
  } catch (err) {}
  return {
    title: `Liên hệ - ${siteName}`,
    description: `Liên hệ với ${siteName}. Chúng tôi luôn sẵn sàng lắng nghe góp ý, báo lỗi, hợp tác từ bạn.`,
  };
}

export default async function ContactPage() {
  // Query site settings
  let siteName = 'Tô Phim.Com';
  let contactEmail = 'contact@tophim.com';
  let telegramUrl = '#';
  let discordUrl = '#';
  let facebookUrl = '#';

  try {
    const settings = await prisma.settings.findMany();
    const settingsMap = new Map(settings.map(s => [s.key, s.value]));
    siteName = settingsMap.get('site_name') || 'Tô Phim.Com';
    contactEmail = settingsMap.get('contact_email') || 'contact@tophim.com';
    telegramUrl = settingsMap.get('social_telegram') || '#';
    discordUrl = settingsMap.get('social_discord') || '#';
    facebookUrl = settingsMap.get('social_facebook') || '#';
  } catch (err) {
    console.error("Failed to query settings for contact page:", err);
  }

  const displaySiteName = siteName.replace(/\.(com|net|org|vn|xyz)$/i, '');

  return (
    <main className="min-h-screen text-white/90 pt-24 pb-20 bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
      <div className="max-w-[860px] mx-auto px-4">
        {/* Header */}
        <div className="mb-12 animate-fade-in">
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-3 tracking-tight bg-gradient-to-r from-yellow-400 via-amber-200 to-yellow-500 bg-clip-text text-transparent">
            Liên hệ
          </h1>
          <p className="text-zinc-400 text-[15px] leading-relaxed max-w-[600px] font-light">
            Chúng tôi luôn sẵn sàng lắng nghe. Dù bạn muốn báo lỗi, góp ý, hợp tác hay đơn giản là nói xin chào — hãy liên hệ qua các kênh dưới đây.
          </p>
        </div>

        {/* Contact Channels */}
        <section className="mb-14">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-yellow-500 rounded-full"></span>
            Kênh liên hệ
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Email */}
            <a
              href={`mailto:${contactEmail}`}
              className="block bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-yellow-500/20 rounded-xl p-5 transition-all duration-300 group"
            >
              <Mail className="w-6 h-6 text-yellow-500 mb-3 group-hover:scale-110 transition-transform duration-300" />
              <h3 className="font-semibold text-white mb-1 group-hover:text-yellow-400 transition-colors">Email</h3>
              <p className="text-sm text-zinc-400 mb-3 leading-relaxed">
                Dành cho yêu cầu gỡ bản quyền, hỗ trợ tài khoản, và các vấn đề cần xử lý chi tiết.
              </p>
              <p className="text-sm text-yellow-500 font-semibold break-all">{contactEmail}</p>
              <p className="text-xs text-zinc-500 mt-1">Phản hồi trong 24-48 giờ</p>
            </a>

            {/* Telegram */}
            <a
              href={telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-yellow-500/20 rounded-xl p-5 transition-all duration-300 group"
            >
              <MessageCircle className="w-6 h-6 text-yellow-500 mb-3 group-hover:scale-110 transition-transform duration-300" />
              <h3 className="font-semibold text-white mb-1 group-hover:text-yellow-400 transition-colors">Telegram</h3>
              <p className="text-sm text-zinc-400 mb-3 leading-relaxed">
                Kênh cộng đồng chính thức. Thảo luận phim, đề xuất phim mới, nhận thông báo cập nhật.
              </p>
              <p className="text-sm text-yellow-500 font-semibold">Tham gia nhóm Telegram</p>
              <p className="text-xs text-zinc-500 mt-1">Phản hồi nhanh trong giờ hoạt động</p>
            </a>

            {/* Discord */}
            <a
              href={discordUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-yellow-500/20 rounded-xl p-5 transition-all duration-300 group"
            >
              <Gamepad2 className="w-6 h-6 text-yellow-500 mb-3 group-hover:scale-110 transition-transform duration-300" />
              <h3 className="font-semibold text-white mb-1 group-hover:text-yellow-400 transition-colors">Discord</h3>
              <p className="text-sm text-zinc-400 mb-3 leading-relaxed">
                Server cộng đồng với các kênh riêng cho từng thể loại phim, review và đề xuất.
              </p>
              <p className="text-sm text-yellow-500 font-semibold">Tham gia server Discord</p>
              <p className="text-xs text-zinc-500 mt-1">Cộng đồng hoạt động 24/7</p>
            </a>

            {/* Facebook */}
            <a
              href={facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-yellow-500/20 rounded-xl p-5 transition-all duration-300 group"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-yellow-500 mb-3 group-hover:scale-110 transition-transform duration-300"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
              <h3 className="font-semibold text-white mb-1 group-hover:text-yellow-400 transition-colors">Facebook</h3>
              <p className="text-sm text-zinc-400 mb-3 leading-relaxed">
                Theo dõi fanpage để nhận tin tức, phim mới nổi bật và sự kiện cộng đồng.
              </p>
              <p className="text-sm text-yellow-500 font-semibold">Theo dõi Fanpage</p>
              <p className="text-xs text-zinc-500 mt-1">Cập nhật hàng ngày</p>
            </a>
          </div>
        </section>

        {/* Contact Form Section */}
        <section className="mb-14 bg-white/[0.01] border border-white/5 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-yellow-500 rounded-full"></span>
            Gửi tin nhắn trực tuyến
          </h2>
          <ContactForm />
        </section>

        {/* Support Categories */}
        <section className="mb-14">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-yellow-500 rounded-full"></span>
            Bạn cần hỗ trợ gì?
          </h2>
          <div className="space-y-4">
            <div className="bg-white/[0.01] border border-white/5 rounded-xl p-5">
              <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                <Bug className="w-5 h-5 text-yellow-500" />
                Báo lỗi phim
              </h3>
              <p className="text-sm text-zinc-400 leading-[1.8]">
                Phim không tải, sai phụ đề, thiếu tập, link hỏng? Sử dụng nút "Báo lỗi" trên trang xem phim hoặc mô tả chi tiết qua email.
              </p>
            </div>

            <div className="bg-white/[0.01] border border-white/5 rounded-xl p-5">
              <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-yellow-500" />
                Yêu cầu gỡ bản quyền (DMCA)
              </h3>
              <p className="text-sm text-zinc-400 leading-[1.8]">
                Nếu bạn là chủ sở hữu bản quyền, gửi email tới <a href={`mailto:${contactEmail}`} className="text-yellow-500 hover:text-yellow-400 font-medium underline">{contactEmail}</a> kèm: tên nội dung, URL trên {displaySiteName}, bằng chứng quyền sở hữu. Chúng tôi xử lý trong 48 giờ.
              </p>
            </div>

            <div className="bg-white/[0.01] border border-white/5 rounded-xl p-5">
              <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                <Handshake className="w-5 h-5 text-yellow-500" />
                Hợp tác
              </h3>
              <p className="text-sm text-zinc-400 leading-[1.8]">
                Bạn muốn hợp tác nội dung, cung cấp nguồn phim, hoặc quảng bá thương hiệu? Liên hệ qua email với tiêu đề "[Hợp tác] ...".
              </p>
            </div>

            <div className="bg-white/[0.01] border border-white/5 rounded-xl p-5">
              <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-yellow-500" />
                Góp ý &amp; Đề xuất
              </h3>
              <p className="text-sm text-zinc-400 leading-[1.8]">
                Mọi ý kiến đóng góp đều quý giá. Bạn muốn tính năng mới, thể loại phim mới, hay cải thiện giao diện? Chia sẻ với chúng tôi qua bất kỳ kênh nào.
              </p>
            </div>

            <div className="bg-white/[0.01] border border-white/5 rounded-xl p-5">
              <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                <UserCog className="w-5 h-5 text-yellow-500" />
                Hỗ trợ tài khoản
              </h3>
              <p className="text-sm text-zinc-400 leading-[1.8]">
                Không đăng nhập được, muốn xóa tài khoản, hoặc gặp vấn đề với tài khoản? Gửi email kèm địa chỉ email đăng ký để được hỗ trợ.
              </p>
            </div>

            <div className="bg-white/[0.01] border border-white/5 rounded-xl p-5">
              <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                <Users className="w-5 h-5 text-yellow-500" />
                Ứng tuyển cộng tác viên
              </h3>
              <p className="text-sm text-zinc-400 leading-[1.8]">
                Bạn giỏi biên dịch phụ đề, thiết kế, lập trình hoặc quản lý cộng đồng? Gửi CV ngắn hoặc giới thiệu bản thân qua email với tiêu đề "[CTV] ...".
              </p>
            </div>
          </div>
        </section>

        {/* Response Time */}
        <section className="bg-white/[0.01] border border-white/5 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-500" />
            Thời gian phản hồi
          </h2>
          <div className="text-sm text-zinc-400 leading-[1.8] space-y-2">
            <p>• <strong className="text-white">Báo lỗi phim:</strong> 12 - 24 giờ</p>
            <p>• <strong className="text-white">Hỗ trợ tài khoản:</strong> 24 - 48 giờ</p>
            <p>• <strong className="text-white">Yêu cầu DMCA:</strong> 48 giờ làm việc</p>
            <p>• <strong className="text-white">Hợp tác:</strong> 3 - 5 ngày làm việc</p>
            <p className="text-zinc-500 mt-3 text-xs">* Thời gian có thể thay đổi tùy khối lượng yêu cầu. Chúng tôi cố gắng phản hồi nhanh nhất có thể.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
