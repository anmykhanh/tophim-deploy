'use client';

import { useState, useEffect } from 'react';

export default function HomepagePopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState('');

  useEffect(() => {
    // Only run on client
    const hasSeenPopup = sessionStorage.getItem('hubphim_popup_closed');
    if (hasSeenPopup) return;

    const fetchPopup = async () => {
      try {
        const res = await fetch('/api/settings/popup');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.enabled && data.content) {
            setContent(data.content);
            setIsOpen(true);
          }
        }
      } catch (err) {
        console.error('Error fetching homepage popup:', err);
      }
    };

    fetchPopup();
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    sessionStorage.setItem('hubphim_popup_closed', 'true');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      {/* Modal Container */}
      <div 
        className="relative w-full max-w-2xl bg-[#161824] border border-[#FFD166]/20 rounded-2xl shadow-[0_0_40px_rgba(255,209,102,0.15)] overflow-hidden animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header decoration */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#FFD166] to-transparent opacity-70" />
        
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-black/20 hover:bg-[#FFD166]/20 text-zinc-400 hover:text-[#FFD166] transition-colors z-10"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
          </svg>
        </button>

        {/* Content Area */}
        <div className="p-6 sm:p-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
          <div className="prose prose-invert max-w-none text-zinc-300 text-sm sm:text-base leading-relaxed">
            <style dangerouslySetInnerHTML={{ __html: `
              .prose a { color: #FFD166; text-decoration: none; font-weight: 600; transition: color 0.2s; }
              .prose a:hover { color: #ffb703; text-decoration: underline; }
              .prose img { max-width: 100%; height: auto; border-radius: 8px; margin: 1rem auto; display: block; box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
              .prose p { margin-bottom: 1rem; }
              .prose p:last-child { margin-bottom: 0; }
              .prose h1, .prose h2, .prose h3 { color: #fff; margin-top: 1.5rem; margin-bottom: 0.75rem; font-weight: 700; }
              .prose h1:first-child, .prose h2:first-child, .prose h3:first-child { margin-top: 0; }
              .prose ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 1rem; }
              .prose ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 1rem; }
            `}} />
            <div dangerouslySetInnerHTML={{ __html: content }} />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:px-8 border-t border-white/10 bg-black/20 flex justify-end">
          <button
            onClick={handleClose}
            className="px-6 py-2 bg-[#FFD166] hover:bg-amber-400 text-black font-bold rounded-lg text-sm transition-all active:scale-95 shadow-md"
          >
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
}
