'use client';

import { useState } from 'react';
import { HelpCircle, ChevronDown, MessageSquareCode, Film, Tv, ShieldCheck, User } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
  icon: any;
}

export default function FAQClient({ siteName }: { siteName: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqData: FAQItem[] = [
    {
      icon: HelpCircle,
      question: `${siteName} là gì? Xem phim có mất phí không?`,
      answer: `${siteName} là trang web xem phim trực tuyến miễn phí chất lượng cao, cung cấp đa dạng các thể loại phim lẻ, phim bộ, hoạt hình anime với phụ đề Vietsub và thuyết minh tiếng Việt. Toàn bộ dịch vụ trên website được cung cấp miễn phí 100% nhằm mục đích giải trí và chia sẻ cộng đồng phi thương mại.`
    },
    {
      icon: Film,
      question: "Tại sao phim bị đứng hình, load chậm hoặc không phát được?",
      answer: "Tốc độ tải phim phụ thuộc vào kết nối mạng của bạn và tải lượng của máy chủ lưu trữ (server). Để khắc phục, bạn có thể: \n1. F5/Tải lại trang web.\n2. Chọn một Server phát dự phòng khác (nếu có) trên trình phát video.\n3. Kiểm tra lại đường truyền mạng hoặc tắt VPN nếu đang kích hoạt."
    },
    {
      icon: MessageSquareCode,
      question: "Làm thế nào để báo lỗi phim hỏng, thiếu tập hoặc sai phụ đề?",
      answer: "Trên giao diện xem phim của mỗi tập phim đều có nút 'Báo lỗi' (biểu tượng cảnh báo hoặc nút màu đỏ). Bạn chỉ cần nhấn vào đó và mô tả sơ qua lỗi gặp phải. Đội ngũ kỹ thuật của chúng tôi nhận được báo cáo sẽ khắc phục lỗi trong vòng 12-24 giờ."
    },
    {
      icon: User,
      question: "Đăng ký thành viên trên website mang lại lợi ích gì?",
      answer: "Khi đăng ký tài khoản miễn phí trên website, bạn sẽ có các tính năng cao cấp:\n• Lưu phim vào danh sách yêu thích cá nhân.\n• Tự động đồng bộ lịch sử xem phim và tập phim đang xem dở trên mọi thiết bị đăng nhập.\n• Tham gia thảo luận, bình luận và đánh giá phim."
    },
    {
      icon: Tv,
      question: "Làm sao để yêu cầu cập nhật phim mới hoặc thêm tập phim?",
      answer: "Bạn có thể gửi yêu cầu đề xuất phim trực tiếp qua trang 'Liên hệ' trực tuyến của chúng tôi hoặc tham gia cộng đồng Telegram / Discord của website. Ban quản trị sẽ cố gắng thu thập và cập nhật phim sớm nhất có thể."
    },
    {
      icon: ShieldCheck,
      question: "Thông tin cá nhân của tôi có được bảo mật không?",
      answer: "Chúng tôi cam kết bảo mật tuyệt đối thông tin của bạn. Email và thông tin đăng nhập luôn được mã hóa bảo mật tối đa và hoàn toàn không chia sẻ cho bất kỳ bên thứ ba nào. Bạn có thể xem chi tiết tại trang 'Chính sách bảo mật'."
    }
  ];

  return (
    <div className="space-y-4">
      {faqData.map((item, index) => {
        const isOpen = openIndex === index;
        const IconComponent = item.icon;

        return (
          <div
            key={index}
            className={`border rounded-2xl transition-all duration-300 ${
              isOpen
                ? 'bg-white/[0.02] border-yellow-500/20'
                : 'bg-white/[0.01] border-white/5 hover:border-white/10'
            }`}
          >
            <button
              onClick={() => setOpenIndex(isOpen ? null : index)}
              className="w-full text-left p-5 md:p-6 flex items-start gap-4 focus:outline-none group"
            >
              <div className={`p-2.5 rounded-xl border shrink-0 transition-colors ${
                isOpen 
                  ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500' 
                  : 'bg-white/5 border-white/5 text-zinc-400 group-hover:text-white'
              }`}>
                <IconComponent className="w-5 h-5" />
              </div>
              <div className="flex-1 pt-1">
                <h3 className={`font-bold text-[15px] md:text-base transition-colors ${
                  isOpen ? 'text-yellow-500' : 'text-zinc-200 group-hover:text-white'
                }`}>
                  {item.question}
                </h3>
              </div>
              <div className={`pt-2 transition-transform duration-300 ${isOpen ? 'rotate-180 text-yellow-500' : 'text-zinc-500'}`}>
                <ChevronDown className="w-5 h-5" />
              </div>
            </button>

            {/* Answer body */}
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                isOpen ? 'max-h-[300px] border-t border-white/5' : 'max-h-0'
              }`}
            >
              <div className="p-5 md:p-6 text-sm text-zinc-400 leading-[1.8] whitespace-pre-line font-light">
                {item.answer}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
