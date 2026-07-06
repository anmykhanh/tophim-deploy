'use client';

import { useState, useEffect } from 'react';

interface AdBannerProps {
  image: string;
  link?: string;
  position: string; // e.g. 'below_header', 'above_footer', 'watch'
  className?: string;
}

export default function AdBanner({ image, link, position, className = '' }: AdBannerProps) {
  const storageKey = `ad_banner_closed_${position}`;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Check if user already closed this banner in this session
    const closed = sessionStorage.getItem(storageKey);
    if (!closed) setVisible(true);
  }, [storageKey]);

  const handleClose = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    sessionStorage.setItem(storageKey, '1');
    setVisible(false);
  };

  if (!visible || !image) return null;

  const content = (
    <div className={`relative w-full overflow-hidden group/adbanner ${className}`}>
      {/* Ad image */}
      <img
        src={image}
        alt="Quảng cáo"
        className="w-full h-auto object-cover max-h-[120px] sm:max-h-[160px] object-center"
        loading="lazy"
      />

      {/* "QC" label */}
      <span className="absolute top-1.5 left-2 text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/60 text-white/70 tracking-widest select-none pointer-events-none">
        QC
      </span>

      {/* Close button */}
      <button
        onClick={handleClose}
        aria-label="Đóng quảng cáo"
        className="absolute top-1.5 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-black/70 hover:bg-black/90 text-white transition-all z-10 shadow-lg"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
        </svg>
      </button>
    </div>
  );

  if (link) {
    let finalLink = link;
    if (!finalLink.startsWith('http://') && !finalLink.startsWith('https://') && !finalLink.startsWith('/')) {
      finalLink = 'https://' + finalLink;
    }
    return (
      <a href={finalLink} target="_blank" rel="noopener noreferrer" className="block w-full">
        {content}
      </a>
    );
  }

  return <div className="w-full">{content}</div>;
}
