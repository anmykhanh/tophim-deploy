import { Metadata } from "next";
import prisma from "@/lib/db";
import { ShieldAlert, BookOpen, UserCheck, Copyright, Scale, AlertCircle } from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  let siteName = 'Tô Phim';
  try {
    const settings = await prisma.settings.findMany();
    const settingsMap = new Map(settings.map(s => [s.key, s.value]));
    siteName = settingsMap.get('site_name') || 'Tô Phim';
  } catch (err) {}
  return {
    title: `Điều khoản sử dụng - ${siteName}`,
    description: `Điều khoản sử dụng dịch vụ tại ${siteName}. Vui lòng đọc kỹ trước khi sử dụng.`,
  };
}

export default async function TermsPage() {
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
            Điều khoản sử dụng
          </h1>
          <p className="text-zinc-400 text-[15px] leading-relaxed max-w-[600px] font-light">
            Chào mừng bạn đến với {siteName}. Bằng cách truy cập và sử dụng trang web của chúng tôi, bạn đồng ý tuân thủ các điều khoản và điều kiện dưới đây.
          </p>
        </div>

        {/* Content sections */}
        <div className="space-y-6">
          {/* Section 1 */}
          <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-3">
              <BookOpen className="w-5 h-5 text-yellow-500" />
              1. Chấp nhận các điều khoản
            </h2>
            <p className="text-sm text-zinc-400 leading-[1.8] mb-3">
              Bằng việc truy cập, duyệt web hoặc sử dụng bất kỳ dịch vụ nào trên hệ thống của {siteName}, bạn xác nhận đã đọc, hiểu và đồng ý hoàn toàn với các điều khoản này.
            </p>
            <p className="text-sm text-zinc-400 leading-[1.8]">
              Nếu bạn không đồng ý với bất kỳ điều khoản nào trong văn bản này, vui lòng ngừng sử dụng dịch vụ của chúng tôi ngay lập tức.
            </p>
          </div>

          {/* Section 2 */}
          <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-3">
              <Copyright className="w-5 h-5 text-yellow-500" />
              2. Quyền sở hữu trí tuệ và DMCA
            </h2>
            <p className="text-sm text-zinc-400 leading-[1.8] mb-3">
              {siteName} tôn trọng quyền sở hữu trí tuệ của các bên thứ ba. Nội dung trên trang web được tổng hợp và cung cấp dựa trên tinh thần phi lợi nhuận và chia sẻ cộng đồng.
            </p>
            <p className="text-sm text-zinc-400 leading-[1.8]">
              Nếu bạn là chủ sở hữu bản quyền hợp pháp của bất kỳ nội dung nào xuất hiện trên trang web và muốn yêu cầu gỡ bỏ, vui lòng liên hệ trực tiếp với chúng tôi qua trang <a href="/lien-he" className="text-yellow-500 hover:text-yellow-400 underline">Liên hệ</a> hoặc gửi email yêu cầu DMCA theo đúng quy trình quy định để được hỗ trợ gỡ bỏ trong vòng 48 giờ.
            </p>
          </div>

          {/* Section 3 */}
          <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-3">
              <UserCheck className="w-5 h-5 text-yellow-500" />
              3. Quyền và trách nhiệm người dùng
            </h2>
            <div className="text-sm text-zinc-400 leading-[1.8] space-y-3">
              <p>• Bạn được phép sử dụng dịch vụ và xem phim trên website hoàn toàn miễn phí cho mục đích giải trí cá nhân phi thương mại.</p>
              <p>• Nghiêm cấm mọi hành vi tấn công, phá hoại, spam, can thiệp vào mã nguồn hoặc cấu trúc máy chủ của {siteName}.</p>
              <p>• Người dùng tự chịu trách nhiệm về các bình luận, đóng góp ý kiến trên hệ thống. Tránh phát ngôn kích động bạo lực, vi phạm pháp luật hoặc thuần phong mỹ tục Việt Nam.</p>
            </div>
          </div>

          {/* Section 4 */}
          <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-3">
              <Scale className="w-5 h-5 text-yellow-500" />
              4. Tuyên bố từ chối trách nhiệm
            </h2>
            <p className="text-sm text-zinc-400 leading-[1.8] mb-3">
              {siteName} cung cấp dịch vụ trên cơ sở "như hiện có" và "sẵn có". Chúng tôi không đảm bảo rằng website sẽ luôn hoạt động liên tục không gián đoạn hoặc không có lỗi kỹ thuật phát sinh.
            </p>
            <p className="text-sm text-zinc-400 leading-[1.8]">
              Chúng tôi không chịu trách nhiệm pháp lý đối với bất kỳ thiệt hại trực tiếp, gián tiếp hoặc ngẫu nhiên nào phát sinh từ việc sử dụng hoặc không thể sử dụng dịch vụ trên website.
            </p>
          </div>

          {/* Section 5 */}
          <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-500" />
              5. Thay đổi điều khoản
            </h2>
            <p className="text-sm text-zinc-400 leading-[1.8]">
              {siteName} giữ quyền thay đổi, sửa đổi, thêm hoặc bớt bất kỳ phần nào của Điều khoản sử dụng này vào bất kỳ lúc nào mà không cần báo trước. Các thay đổi sẽ có hiệu lực ngay khi được đăng tải trên trang này. Bạn có trách nhiệm kiểm tra thường xuyên trang này để cập nhật thông tin mới nhất.
            </p>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-8 text-center text-xs text-zinc-500 font-light">
          Cập nhật lần cuối: Tháng 6, 2026
        </div>
      </div>
    </main>
  );
}
