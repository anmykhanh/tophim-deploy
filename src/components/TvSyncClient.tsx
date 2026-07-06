'use client';

import React, { useState, useEffect, useRef } from 'react';

export default function TvSyncClient() {
  const [code, setCode] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<number>(0); // in seconds
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Generate code
  const handleGenerateCode = async () => {
    setLoading(true);
    setCopied(false);
    try {
      const res = await fetch('/api/tv/generate-code', {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCode(data.code);
        setTimeLeft(data.expiresIn);
      } else {
        alert(data.error || 'Có lỗi xảy ra khi tạo mã.');
      }
    } catch (err) {
      console.error(err);
      alert('Không thể kết nối đến máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  // Timer logic
  useEffect(() => {
    if (timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setCode('');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeLeft]);

  // Copy code
  const handleCopyCode = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper to format remaining time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Expiration percentage for progress bar
  const progressPercent = timeLeft > 0 ? (timeLeft / 300) * 100 : 0;

  return (
    <main className="flex-1 min-w-0 pt-28 pb-16 px-4 md:px-8 bg-[#0f111a] text-white">
      <section className="relative mx-auto w-full max-w-5xl">
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-[#FFD166]/5 to-transparent pointer-events-none"></div>
        
        <div className="mb-10 text-center lg:text-left">
          <h1 className="text-[28px] font-black tracking-tight text-white lg:text-[40px]">
            Đăng Nhập Smart TV
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-white/60 lg:mx-0">
            Nhập mã dưới đây vào ứng dụng TV của bạn để đồng bộ tài khoản ngay lập tức.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* Main Card */}
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#171a24] p-4 shadow-2xl shadow-black/40 sm:p-6 lg:p-10">
            <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-[20px] font-black text-white">Mã liên kết TV</h2>
                <p className="mt-1.5 text-[14px] text-white/50 font-medium">
                  Mã này sẽ tự động hết hạn sau 5 phút để bảo mật.
                </p>
              </div>
              <button
                type="button"
                onClick={handleGenerateCode}
                disabled={loading}
                className="group relative inline-flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-[#FFD166] px-6 text-[14px] font-bold text-[#0f111a] transition-all hover:bg-[#ffe08a] hover:shadow-[0_0_20px_rgba(255,209,102,0.4)] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto shrink-0"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`h-4.5 w-4.5 transition-transform group-hover:rotate-180 ${loading ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                >
                  <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                  <path d="M3 3v5h5"></path>
                  <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path>
                  <path d="M16 16h5v5"></path>
                </svg>
                {loading ? 'Đang tạo...' : 'Tạo mã TV'}
              </button>
            </div>

            {/* Digit Slots */}
            <div className="relative z-10 mt-10">
              <div className="grid grid-cols-6 gap-1.5 sm:gap-4" aria-live="polite">
                {[0, 1, 2, 3, 4, 5].map((index) => {
                  const digit = code ? code[index] : '-';
                  const hasDigit = code !== '';
                  return (
                    <div
                      key={index}
                      className={`relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-xl border-2 bg-[#11141d] text-[28px] font-black shadow-inner sm:aspect-square sm:rounded-2xl sm:text-[56px] lg:text-[64px] transition-colors ${
                        hasDigit ? 'border-[#FFD166] text-[#FFD166]' : 'border-white/5 text-white/20'
                      }`}
                    >
                      <span className="relative z-10">{digit}</span>
                    </div>
                  );
                })}
              </div>

              {/* Progress & Countdown */}
              <div
                className={`mt-8 flex flex-col gap-2 transition-opacity duration-500 ${
                  code ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
              >
                <div className="flex items-center justify-between text-[13px] font-bold">
                  <span className="flex items-center gap-1.5 text-white/60">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="lucide lucide-clock h-4 w-4"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="M12 6v6h4"></path>
                    </svg>
                    Thời gian hiệu lực
                  </span>
                  <span className="text-[#FFD166] font-extrabold">{formatTime(timeLeft)}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#FFD166] to-[#ffb833] transition-all duration-1000 ease-linear"
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="relative z-10 mt-8 flex flex-col gap-4 border-t border-white/5 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-[13px] text-white/50 font-medium">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4 shrink-0"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" x2="12" y1="8" y2="12"></line>
                  <line x1="12" x2="12.01" y1="16" y2="16"></line>
                </svg>
                <span>Không chia sẻ mã này cho người khác.</span>
              </div>
              <button
                type="button"
                disabled={!code}
                onClick={handleCopyCode}
                className="inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 text-[13px] font-bold text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>
                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
                </svg>
                {copied ? 'Đã sao chép!' : 'Sao chép mã'}
              </button>
            </div>
          </div>

          {/* Guide Card */}
          <div className="h-fit rounded-3xl border border-white/5 bg-[#11141d]/80 p-6 backdrop-blur-xl lg:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5 text-white/80"
                  aria-hidden="true"
                >
                  <path d="M18 8V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h8"></path>
                  <path d="M10 19v-3.96 3.15"></path>
                  <path d="M7 19h5"></path>
                  <rect width="6" height="10" x="16" y="12" rx="2"></rect>
                </svg>
              </div>
              <h2 className="text-[17px] font-black text-white">Hướng dẫn kết nối</h2>
            </div>
            
            <div className="mt-8 space-y-2">
              {/* Step 1 */}
              <div className="group relative flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#171a24] text-[#FFD166] transition-colors group-hover:border-[#FFD166]/30 group-hover:bg-[#FFD166]/10">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4.5 w-4.5"
                      aria-hidden="true"
                    >
                      <path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"></path>
                      <circle cx="16.5" cy="7.5" r=".5" fill="currentColor"></circle>
                    </svg>
                  </div>
                  <div className="my-2 h-10 w-px bg-white/5 transition-colors group-hover:bg-[#FFD166]/20"></div>
                </div>
                <div className="pb-2 pt-1">
                  <div className="text-[14px] font-black text-white transition-colors group-hover:text-[#FFD166]">
                    Lấy mã liên kết
                  </div>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-white/50 transition-colors group-hover:text-white/70 font-medium">
                    Nhấn nút tạo mã phía bên để hệ thống cấp một dãy 6 số ngẫu nhiên.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="group relative flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#171a24] text-[#FFD166] transition-colors group-hover:border-[#FFD166]/30 group-hover:bg-[#FFD166]/10">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4.5 w-4.5"
                      aria-hidden="true"
                    >
                      <path d="m17 2-5 5-5-5"></path>
                      <rect width="20" height="15" x="2" y="7" rx="2"></rect>
                    </svg>
                  </div>
                  <div className="my-2 h-10 w-px bg-white/5 transition-colors group-hover:bg-[#FFD166]/20"></div>
                </div>
                <div className="pb-2 pt-1">
                  <div className="text-[14px] font-black text-white transition-colors group-hover:text-[#FFD166]">
                    Mở ứng dụng TV
                  </div>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-white/50 transition-colors group-hover:text-white/70 font-medium">
                    Truy cập mục Đăng nhập trên TV và chọn phương thức &apos;Đăng nhập bằng mã&apos;.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="group relative flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#171a24] text-[#FFD166] transition-colors group-hover:border-[#FFD166]/30 group-hover:bg-[#FFD166]/10">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4.5 w-4.5"
                      aria-hidden="true"
                    >
                      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path>
                      <path d="m9 12 2 2 4-4"></path>
                    </svg>
                  </div>
                </div>
                <div className="pb-2 pt-1">
                  <div className="text-[14px] font-black text-white transition-colors group-hover:text-[#FFD166]">
                    Hoàn tất đồng bộ
                  </div>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-white/50 transition-colors group-hover:text-white/70 font-medium">
                    Nhập mã 6 số vào TV. Tài khoản sẽ được kết nối tự động chỉ trong vài giây.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
