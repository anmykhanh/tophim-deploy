import { Metadata } from "next";
import prisma from "@/lib/db";
import { Eye, ShieldCheck, Database, Key, Server, UserX } from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  let siteName = 'Tô Phim';
  try {
    const settings = await prisma.settings.findMany();
    const settingsMap = new Map(settings.map(s => [s.key, s.value]));
    siteName = settingsMap.get('site_name') || 'Tô Phim';
  } catch (err) {}
  return {
    title: `Chính sách bảo mật - ${siteName}`,
    description: `Chính sách bảo mật thông tin người dùng tại ${siteName}.`,
  };
}

export default async function PrivacyPage() {
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
            Chính sách bảo mật
          </h1>
          <p className="text-zinc-400 text-[15px] leading-relaxed max-w-[600px] font-light">
            Quyền riêng tư của bạn là ưu tiên hàng đầu tại {siteName}. Chính sách bảo mật này giải thích cách chúng tôi thu thập, sử dụng và bảo vệ thông tin cá nhân của bạn.
          </p>
        </div>

        {/* Content sections */}
        <div className="space-y-6">
          {/* Section 1 */}
          <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-3">
              <Database className="w-5 h-5 text-yellow-500" />
              1. Thu thập thông tin cá nhân
            </h2>
            <p className="text-sm text-zinc-400 leading-[1.8] mb-3">
              Chúng tôi chỉ thu thập thông tin cần thiết tối thiểu để vận hành dịch vụ, bao gồm:
            </p>
            <div className="text-sm text-zinc-400 leading-[1.8] space-y-2 pl-4">
              <p>• <strong>Thông tin tài khoản:</strong> Email, tên hiển thị, mật khẩu được mã hóa một chiều khi bạn đăng ký thành viên hoặc đăng nhập qua Google.</p>
              <p>• <strong>Dữ liệu hoạt động:</strong> Lịch sử xem phim, phim yêu thích, bình luận, và báo lỗi để phục vụ cá nhân hóa trải nghiệm giải trí của bạn.</p>
              <p>• <strong>Dữ liệu truy cập tự động:</strong> Địa chỉ IP, trình duyệt web, thời gian truy cập (sử dụng cho mục đích phân tích thống kê phi danh tính).</p>
            </div>
          </div>

          {/* Section 2 */}
          <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-3">
              <Eye className="w-5 h-5 text-yellow-500" />
              2. Sử dụng thông tin
            </h2>
            <p className="text-sm text-zinc-400 leading-[1.8] mb-3">
              Mục đích thu thập thông tin nhằm nâng cao trải nghiệm của người dùng trên website {siteName}:
            </p>
            <div className="text-sm text-zinc-400 leading-[1.8] space-y-2 pl-4">
              <p>• Lưu giữ lịch sử xem phim giúp bạn dễ dàng theo dõi tiếp tập phim đang xem dở.</p>
              <p>• Xử lý và phản hồi trực tiếp các thắc mắc, yêu cầu báo lỗi hoặc liên hệ của bạn.</p>
              <p>• Ngăn chặn các hoạt động gian lận, phá hoại hoặc spam phá hoại hệ thống.</p>
            </div>
          </div>

          {/* Section 3 */}
          <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-yellow-500" />
              3. Bảo mật thông tin của bạn
            </h2>
            <p className="text-sm text-zinc-400 leading-[1.8] mb-3">
              Chúng tôi áp dụng các biện pháp bảo mật tối tân để bảo vệ dữ liệu khỏi sự truy cập bất hợp pháp:
            </p>
            <p className="text-sm text-zinc-400 leading-[1.8]">
              Toàn bộ thông tin nhạy cảm (như mật khẩu) đều được mã hóa bằng thuật toán băm bảo mật cao trước khi lưu trữ vào hệ thống máy chủ. Ngoài ra, giao thức SSL mã hóa đường truyền dữ liệu giữa trình duyệt của bạn và máy chủ luôn được thiết lập đầy đủ.
            </p>
          </div>

          {/* Section 4 */}
          <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-3">
              <Key className="w-5 h-5 text-yellow-500" />
              4. Cookies
            </h2>
            <p className="text-sm text-zinc-400 leading-[1.8]">
              {siteName} sử dụng cookie để lưu thông tin phiên đăng nhập và ghi nhớ các cài đặt cá nhân như tăng/giảm âm lượng trình phát video, chế độ giao diện tối, hoặc lưu vết lịch sử xem phim nhanh. Bạn có thể chọn vô hiệu hóa cookie trong phần cài đặt trình duyệt, tuy nhiên điều này có thể ảnh hưởng đến khả năng đăng nhập và một số tính năng ghi nhớ tự động trên website.
            </p>
          </div>

          {/* Section 5 */}
          <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-3">
              <UserX className="w-5 h-5 text-yellow-500" />
              5. Quyền kiểm soát của bạn
            </h2>
            <p className="text-sm text-zinc-400 leading-[1.8]">
              Bạn hoàn toàn có quyền thay đổi thông tin hồ sơ hiển thị cá nhân bất cứ lúc nào trong bảng quản trị tài khoản. Nếu bạn muốn xóa bỏ tài khoản thành viên vĩnh viễn và các dữ liệu liên quan khỏi cơ sở dữ liệu của chúng tôi, vui lòng liên hệ gửi yêu cầu qua email hoặc biểu mẫu trực tuyến, chúng tôi sẽ xử lý yêu cầu của bạn ngay khi tiếp nhận.
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
