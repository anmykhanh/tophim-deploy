'use client';

import { useState, useEffect } from 'react';

interface AdPopupProps {
  image: string;
  link?: string;
  delaySeconds?: number;
}

export default function AdPopup({ image, link, delaySeconds = 3 }: AdPopupProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!image) return;
    const closed = sessionStorage.getItem('ad_popup_closed');
    if (closed) return;

    const timer = setTimeout(() => {
      setVisible(true);
    }, delaySeconds * 1000);

    return () => clearTimeout(timer);
  }, [image, delaySeconds]);

  const handleClose = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    sessionStorage.setItem('ad_popup_closed', '1');
    setVisible(false);
  };

  if (!visible || !image) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
    >
      <div className="relative max-w-md w-full mx-auto animate-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={handleClose}
          aria-label="Đóng quảng cáo"
          className="absolute -top-3 -right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white text-black font-bold shadow-xl hover:bg-gray-100 active:scale-95 transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
          </svg>
        </button>

        {/* "QC" label */}
        <span className="absolute top-2 left-2 z-10 text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/60 text-white/80 tracking-widest select-none pointer-events-none">
          QC
        </span>

        {link ? (
          <a href={link} target="_blank" rel="noopener noreferrer" className="block rounded-2xl overflow-hidden shadow-2xl">
            <img
              src={image}
              alt="Quảng cáo"
              className="w-full h-auto object-cover"
              loading="eager"
            />
          </a>
        ) : (
          <div className="rounded-2xl overflow-hidden shadow-2xl">
            <img
              src={image}
              alt="Quảng cáo"
              className="w-full h-auto object-cover"
              loading="eager"
            />
          </div>
        )}
      </div>
    </div>
  );
}
