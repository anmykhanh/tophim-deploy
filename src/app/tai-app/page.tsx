import React from "react";
import { Metadata } from "next";
import { Download, Tv, Zap, Languages, MonitorSmartphone, PlayCircle, ListVideo, ChevronDown, CheckCircle2 } from "lucide-react";
import prisma from "@/lib/db";

export const metadata: Metadata = {
  title: "Tải Ứng Dụng Tô Phim",
  description: "Tải ngay ứng dụng Tô Phim cho Smart TV & Điện thoại Android để xem phim 4K miễn phí.",
};

export default async function DownloadAppPage() {
  let settingsMap: Record<string, string> = {};
  try {
    const settings = await prisma.settings.findMany({
      where: { key: { in: ['app_download_link_tv', 'app_download_link_phone'] } }
    });
    settings.forEach(s => {
      settingsMap[s.key] = s.value || '';
    });
  } catch (err) {
    console.error("Lỗi khi tải cài đặt app:", err);
  }

  const tvLink = settingsMap['app_download_link_tv'] || "https://icdn.darkbytes.xyz/file/bmdvcXVhbmdodXk/smarttv.apk";
  const phoneLink = settingsMap['app_download_link_phone'] || "#";

  return (
    <div className="min-h-screen pt-24 pb-16 bg-[#0f111a] text-white selection:bg-[#FFD166]/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* HERO SECTION */}
        <div className="flex flex-col lg:flex-row items-center gap-12 py-12 border-b border-white/10">
          <div className="flex-1 space-y-6">
            <h1 className="text-3xl md:text-5xl font-bold leading-tight">
              App Tô Phim dành cho <span className="text-[#FFD166]">TV & Điện thoại Android</span>
            </h1>
            <p className="text-lg text-gray-400 max-w-2xl">
              Thưởng thức hàng ngàn bộ phim bom tấn với chất lượng 4K HDR hoàn toàn miễn phí ngay trên màn hình TV và thiết bị di động của bạn.
            </p>
            
            <div className="flex flex-wrap items-center gap-4 pt-4">
              <a 
                href={tvLink}
                className="flex items-center gap-2 px-6 py-3 bg-[#FFD166] hover:bg-[#FFD166]/90 text-[#171717] font-semibold rounded-lg transition-colors"
              >
                <Tv className="w-5 h-5" />
                Tải cho Smart TV
              </a>
              <a 
                href={phoneLink}
                className="flex items-center gap-2 px-6 py-3 bg-[#FFD166] hover:bg-[#FFD166]/90 text-[#171717] font-semibold rounded-lg transition-colors"
              >
                <MonitorSmartphone className="w-5 h-5" />
                Tải cho Điện thoại
              </a>
              <a 
                href="#install"
                className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg transition-colors"
              >
                Hướng dẫn cài đặt
              </a>
            </div>
          </div>
          
          <div className="flex-1 w-full max-w-lg lg:max-w-none">
            <div className="rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-black">
              <img 
                src="/images/xemtv.png" 
                alt="App Interface" 
                className="w-full h-auto aspect-video object-cover"
              />
            </div>
          </div>
        </div>

        {/* FEATURES SECTION */}
        <div className="py-16 border-b border-white/10" id="features">
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-2">Các tính năng nổi bật</h2>
            <p className="text-gray-400">Trải nghiệm xem phim hoàn hảo trên Smart TV.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard 
              icon={<PlayCircle className="text-[#FFD166] w-6 h-6" />}
              title="Không cần đăng ký"
              desc="Tải về là xem ngay. Tất cả nội dung đều miễn phí không giới hạn."
            />
            <FeatureCard 
              icon={<Languages className="text-[#FFD166] w-6 h-6" />}
              title="Đa dạng ngôn ngữ"
              desc="Kho phim với phụ đề, lồng tiếng, thuyết minh cập nhật liên tục."
            />
            <FeatureCard 
              icon={<Zap className="text-[#FFD166] w-6 h-6" />}
              title="Siêu tốc độ"
              desc="Thưởng thức các bộ phim với độ trễ thấp nhất nhờ server mạnh mẽ."
            />
            <FeatureCard 
              icon={<MonitorSmartphone className="text-[#FFD166] w-6 h-6" />}
              title="Đa thiết bị"
              desc="Hỗ trợ đầy đủ các dòng Smart TV Android hiện nay."
            />
            <FeatureCard 
              icon={<Tv className="text-[#FFD166] w-6 h-6" />}
              title="Chất lượng 4K"
              desc="Tận hưởng độ phân giải cao cấp nhất cho hình ảnh sắc nét."
            />
            <FeatureCard 
              icon={<ListVideo className="text-[#FFD166] w-6 h-6" />}
              title="Lịch sử & Yêu thích"
              desc="Dễ dàng theo dõi tiến độ xem phim và lưu lại phim yêu thích."
            />
          </div>
        </div>

        {/* INSTALL INSTRUCTIONS */}
        <div className="py-16 border-b border-white/10" id="install">
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-2">Hướng dẫn cài đặt</h2>
            <p className="text-gray-400">Các cách cài đặt ứng dụng APK trên Android TV.</p>
          </div>
          
          <div className="space-y-4">
            <Accordion title="Cách 1: Sử dụng USB (Khuyên dùng)" defaultOpen>
              <ul className="space-y-3 text-gray-300 list-decimal pl-5">
                <li>Truy cập trang này trên máy tính và tải file APK.</li>
                <li>Copy file APK vừa tải vào USB.</li>
                <li>Cắm USB vào TV. Mở ứng dụng <strong>File Manager</strong> (Quản lý file) trên TV và tìm đến USB.</li>
                <li>Bấm vào file APK. Nếu TV yêu cầu cấp quyền cài đặt ứng dụng không rõ nguồn gốc, hãy vào Cài đặt TV để cho phép.</li>
                <li>Chọn <strong>Cài đặt</strong> và bắt đầu sử dụng.</li>
              </ul>
            </Accordion>
            
            <Accordion title="Cách 2: Gửi qua ứng dụng Send Files to TV">
              <ul className="space-y-3 text-gray-300 list-decimal pl-5">
                <li>Cài đặt app <strong>Send Files to TV</strong> trên cả điện thoại Android và Smart TV từ Google Play.</li>
                <li>Tải file APK của Tô Phim về điện thoại.</li>
                <li>Mở ứng dụng trên cả 2 thiết bị. Chọn <strong>Send</strong> trên điện thoại và <strong>Receive</strong> trên TV.</li>
                <li>Chọn file APK và gửi sang TV.</li>
                <li>Mở file APK đã nhận trên TV và tiến hành cài đặt.</li>
              </ul>
            </Accordion>

            <Accordion title="Cách 3: Sử dụng ứng dụng Downloader">
              <ul className="space-y-3 text-gray-300 list-decimal pl-5">
                <li>Cài đặt app <strong>Downloader</strong> từ kho ứng dụng của TV.</li>
                <li>Mở ứng dụng Downloader.</li>
                <li>Nhập đường link trang web này vào thanh địa chỉ của Downloader.</li>
                <li>Dùng remote di chuyển đến nút <strong>Tải APK</strong> và bấm OK.</li>
                <li>Sau khi tải xong, chọn Install để cài đặt.</li>
              </ul>
            </Accordion>
          </div>
        </div>

        {/* FAQ SECTION */}
        <div className="py-16" id="faq">
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-2">Câu hỏi thường gặp</h2>
            <p className="text-gray-400">Giải đáp các thắc mắc phổ biến khi cài đặt.</p>
          </div>
          
          <div className="space-y-4">
            <Accordion title="Lỗi 'nguồn không tin cậy' hoặc 'không xác định' phải làm sao?">
              <p className="text-gray-300">
                Hãy vào <strong>Cài đặt TV &gt; Bảo mật &amp; Hạn chế &gt; Nguồn không xác định</strong>, sau đó bật quyền cho phép ứng dụng File Manager (hoặc Downloader) cài đặt ứng dụng.
              </p>
            </Accordion>
            <Accordion title="Ứng dụng có dùng được trên TV Samsung (Tizen) hoặc LG (WebOS) không?">
              <p className="text-gray-300">
                Hiện tại ứng dụng chỉ hỗ trợ các dòng Smart TV sử dụng hệ điều hành <strong>Android TV</strong> hoặc <strong>Google TV</strong> (như Sony, TCL, Xiaomi...).
              </p>
            </Accordion>
            <Accordion title="TV không nhận USB hoặc không tìm thấy file APK?">
              <p className="text-gray-300">
                Hãy thử cắm USB vào cổng khác của TV, đảm bảo USB được định dạng chuẩn FAT32, và TV đã được cấp quyền đọc bộ nhớ ngoài.
              </p>
            </Accordion>
          </div>
        </div>

      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="p-6 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
      <div className="w-12 h-12 rounded-lg bg-[#FFD166]/10 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

function Accordion({ title, children, defaultOpen = false }: { title: string, children: React.ReactNode, defaultOpen?: boolean }) {
  return (
    <details className="group bg-white/5 border border-white/5 rounded-lg [&_summary::-webkit-details-marker]:hidden" open={defaultOpen}>
      <summary className="flex items-center justify-between p-5 cursor-pointer font-medium text-white select-none">
        {title}
        <ChevronDown className="w-5 h-5 text-gray-500 transition-transform duration-300 group-open:rotate-180 shrink-0" />
      </summary>
      <div className="px-5 pb-5 pt-0">
        <div className="pt-4 border-t border-white/10">
          {children}
        </div>
      </div>
    </details>
  );
}
