import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="pt-16">
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="text-center max-w-lg">
          <h1 
            className="text-[80px] sm:text-[100px] font-black leading-none tracking-tight mb-2 select-none bg-clip-text"
            style={{ 
              background: 'linear-gradient(rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.15))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            404
          </h1>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">Trang này không tồn tại</h2>
          <p className="text-white/40 text-sm sm:text-[15px] leading-relaxed mb-8 max-w-sm mx-auto">
            Trang bạn đang tìm không tồn tại hoặc đã bị xóa.
          </p>
          <Link 
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#FFD166] text-[#0f111a] font-bold text-sm hover:bg-[#FFD166]/90 transition-all shadow-[0_4px_20px_rgba(255,209,102,0.2)]" 
            href="/"
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
              className="lucide lucide-house w-4 h-4" 
              aria-hidden="true"
            >
              <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"></path>
              <path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            </svg>
            Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}
