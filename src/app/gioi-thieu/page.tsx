import { Metadata } from "next";
import Link from "next/link";
import { Film, Smartphone, Bell, PlayCircle, Search, Heart, AlertTriangle } from "lucide-react";
import prisma from "@/lib/db";

export async function generateMetadata(): Promise<Metadata> {
  let siteName = 'Tô Phim';
  try {
    const settings = await prisma.settings.findMany();
    const settingsMap = new Map(settings.map(s => [s.key, s.value]));
    siteName = settingsMap.get('site_name') || 'Tô Phim';
  } catch (err) {}
  return {
    title: `Giới thiệu - ${siteName}`,
    description: `${siteName} ra đời với sứ mệnh mang đến cho khán giả Việt Nam một nơi xem phim trực tuyến miễn phí, chất lượng cao và hoàn toàn bằng tiếng Việt.`,
  };
}

export default async function AboutPage() {
  // Query site settings for logo and name
  let logoUrl = '/branding/logo.png';
  let siteName = 'Tô Phim.Com';
  let siteSlogan = 'Một Hub. Vạn Phim';
  try {
    const settings = await prisma.settings.findMany();
    const settingsMap = new Map(settings.map(s => [s.key, s.value]));
    logoUrl = settingsMap.get('logo_url') || '/branding/logo.png';
    siteName = settingsMap.get('site_name') || 'Tô Phim.Com';
    siteSlogan = settingsMap.get('site_slogan') || 'Một Hub. Vạn Phim';
  } catch (err) {
    console.error("Failed to query settings for about page:", err);
  }

  // Remove schema (e.g. .com) for display title if needed
  const displaySiteName = siteName.replace(/\.(com|net|org|vn|xyz)$/i, '');

  return (
    <main className="min-h-screen text-white/90 pt-24 pb-20 bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
      <div className="max-w-[860px] mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16 animate-fade-in">
          <img
            alt={siteName}
            width="280"
            height="80"
            className="mx-auto mb-6 h-[72px] w-auto object-contain filter drop-shadow-[0_0_15px_rgba(234,179,8,0.15)]"
            src={logoUrl}
          />
          <h1 className="text-3xl md:text-4xl font-extrabold mb-4 text-white tracking-tight bg-gradient-to-r from-yellow-400 via-amber-200 to-yellow-500 bg-clip-text text-transparent">
            {siteSlogan}
          </h1>
          <p className="text-lg text-zinc-400 max-w-[600px] mx-auto leading-relaxed font-light">
            {displaySiteName} ra đời với sứ mệnh đơn giản: mang đến cho khán giả Việt Nam một nơi xem phim trực tuyến miễn phí, chất lượng cao và hoàn toàn bằng tiếng Việt.
          </p>
        </div>

        {/* Story */}
        <section className="mb-14 bg-white/[0.01] border border-white/5 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2 border-b border-white/5 pb-3">
            <span className="w-1.5 h-6 bg-yellow-500 rounded-full"></span>
            Câu chuyện của chúng tôi
          </h2>
          <div className="space-y-4 text-[15px] leading-[1.9] text-zinc-300">
            <p>
              {displaySiteName} được xây dựng bởi những người yêu phim ảnh, lớn lên cùng những bộ phim Hàn Quốc lồng tiếng trên HTV3, những bộ phim hành động Hồng Kông chiếu xuyên đêm trên truyền hình, và những buổi tối cuối tuần cả nhà quây quần trước màn hình nhỏ.
            </p>
            <p>
              Chúng tôi nhận thấy rằng khán giả Việt Nam xứng đáng có một nền tảng phim trực tuyến được thiết kế riêng cho mình — nơi mà giao diện hoàn toàn tiếng Việt, phụ đề được chau chuốt, và mọi thao tác đều quen thuộc như đang lướt một ứng dụng Việt.
            </p>
            <p>
              Từ một dự án nhỏ giữa năm 2025, {displaySiteName} dần phát triển thành một nền tảng phục vụ hàng nghìn lượt xem mỗi ngày, với kho phim liên tục được cập nhật từ nhiều nguồn đáng tin cậy.
            </p>
          </div>
        </section>

        {/* Mission */}
        <section className="mb-14 bg-white/[0.01] border border-white/5 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2 border-b border-white/5 pb-3">
            <span className="w-1.5 h-6 bg-yellow-500 rounded-full"></span>
            Sứ mệnh
          </h2>
          <div className="space-y-4 text-[15px] leading-[1.9] text-zinc-300">
            <p>
              Chúng tôi tin rằng giải trí chất lượng không nên bị giới hạn bởi rào cản tài chính. Sứ mệnh của {displaySiteName} là:
            </p>
            <ul className="list-none pl-0 space-y-3">
              <li className="flex items-start gap-2.5">
                <span className="text-yellow-500 text-lg mt-0.5">•</span>
                <span><strong className="text-white">Miễn phí hoàn toàn</strong> — Không thu phí xem phim, không paywall ẩn, không quảng cáo xâm phạm trải nghiệm.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-yellow-500 text-lg mt-0.5">•</span>
                <span><strong className="text-white">Chất lượng cao</strong> — Hỗ trợ phát HD, Full HD và 4K khi có sẵn. Phụ đề Vietsub được biên dịch tự nhiên, dễ hiểu.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-yellow-500 text-lg mt-0.5">•</span>
                <span><strong className="text-white">Kho phim đa dạng</strong> — Phim Hàn, Trung, Nhật, Thái, Âu Mỹ, Việt Nam, hoạt hình… tất cả được phân loại rõ ràng, dễ tìm kiếm.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-yellow-500 text-lg mt-0.5">•</span>
                <span><strong className="text-white">Trải nghiệm Việt</strong> — Giao diện, ngôn ngữ và cách tổ chức nội dung được tối ưu cho người dùng Việt Nam.</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Highlight Features */}
        <section className="mb-14">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-yellow-500 rounded-full"></span>
            Điểm nổi bật
          </h2>
          <div className="grid sm:grid-cols-2 gap-4 mt-6">
            <div className="bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-yellow-500/20 rounded-xl p-5 transition-all duration-300 group">
              <Film className="w-6 h-6 text-yellow-500 mb-3 group-hover:scale-110 transition-transform duration-300" />
              <h3 className="font-semibold text-white mb-1">Kho phim khổng lồ</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Hàng chục nghìn bộ phim và tập phim từ Hàn Quốc, Trung Quốc, Nhật Bản, Thái Lan, Âu Mỹ và Việt Nam.
              </p>
            </div>

            <div className="bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-yellow-500/20 rounded-xl p-5 transition-all duration-300 group">
              <Smartphone className="w-6 h-6 text-yellow-500 mb-3 group-hover:scale-110 transition-transform duration-300" />
              <h3 className="font-semibold text-white mb-1">Tương thích mọi thiết bị</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Xem mượt mà trên điện thoại, máy tính bảng, laptop và TV thông minh.
              </p>
            </div>

            <div className="bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-yellow-500/20 rounded-xl p-5 transition-all duration-300 group">
              <Bell className="w-6 h-6 text-yellow-500 mb-3 group-hover:scale-110 transition-transform duration-300" />
              <h3 className="font-semibold text-white mb-1">Thông báo phim mới</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Nhận thông báo khi tập mới của phim bạn đang theo dõi được cập nhật.
              </p>
            </div>

            <div className="bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-yellow-500/20 rounded-xl p-5 transition-all duration-300 group">
              <PlayCircle className="w-6 h-6 text-yellow-500 mb-3 group-hover:scale-110 transition-transform duration-300" />
              <h3 className="font-semibold text-white mb-1">Tiếp tục xem</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Tự động lưu tiến trình. Quay lại bất kỳ lúc nào và xem tiếp ngay tại nơi bạn dừng lại.
              </p>
            </div>

            <div className="bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-yellow-500/20 rounded-xl p-5 transition-all duration-300 group">
              <Search className="w-6 h-6 text-yellow-500 mb-3 group-hover:scale-110 transition-transform duration-300" />
              <h3 className="font-semibold text-white mb-1">Tìm kiếm thông minh</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Lọc phim theo quốc gia, thể loại, năm sản xuất, trạng thái phim và nhiều tiêu chí khác.
              </p>
            </div>

            <div className="bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-yellow-500/20 rounded-xl p-5 transition-all duration-300 group">
              <Heart className="w-6 h-6 text-yellow-500 mb-3 group-hover:scale-110 transition-transform duration-300" />
              <h3 className="font-semibold text-white mb-1">Yêu thích &amp; Danh sách</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Lưu phim vào danh sách cá nhân, tạo bộ sưu tập riêng để xem sau.
              </p>
            </div>
          </div>
        </section>

        {/* Community */}
        <section className="mb-14 bg-white/[0.01] border border-white/5 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2 border-b border-white/5 pb-3">
            <span className="w-1.5 h-6 bg-yellow-500 rounded-full"></span>
            Cộng đồng
          </h2>
          <div className="space-y-4 text-[15px] leading-[1.9] text-zinc-300">
            <p>
              {displaySiteName} không chỉ là nơi xem phim — mà còn là cộng đồng của những người yêu điện ảnh. Chúng tôi đang xây dựng các kênh cộng đồng trên Telegram, Discord và Facebook để mọi người có thể chia sẻ phim hay, thảo luận nội dung, và đề xuất phim mới.
            </p>
            <p>
              Mọi phản hồi, góp ý và báo lỗi từ cộng đồng đều được đội ngũ tiếp nhận và xử lý trong thời gian sớm nhất. {displaySiteName} lớn lên nhờ cộng đồng, và cộng đồng luôn là trung tâm trong mọi quyết định phát triển của chúng tôi.
            </p>
          </div>
        </section>

        {/* Disclaimer */}
        <section className="bg-red-500/[0.02] border border-red-500/10 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
          <h2 className="text-lg font-bold text-red-400 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Tuyên bố miễn trừ
          </h2>
          <p className="text-sm text-zinc-400 leading-[1.8]">
            {displaySiteName} không lưu trữ bất kỳ tệp phim nào trên máy chủ. Toàn bộ nội dung được nhúng từ các nguồn bên thứ ba có sẵn công khai trên Internet. Chúng tôi chỉ đóng vai trò tổng hợp và hiển thị thông tin phim. Nếu bạn là chủ sở hữu bản quyền và muốn gỡ nội dung, vui lòng liên hệ với chúng tôi qua trang <Link href="/lien-he" className="text-yellow-500 hover:text-yellow-400 font-medium underline transition-colors">Liên hệ</Link>.
          </p>
        </section>
      </div>
    </main>
  );
}
