'use client';

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

interface WatchPartyPlayerProps {
  url: string;
  currentTime: number;
  status: 'playing' | 'paused';
  movieTitle?: string;
  episodeName?: string;
  posterUrl?: string;
  isHost?: boolean;
  onEnded?: () => void;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
}

export default function WatchPartyPlayer({
  url,
  currentTime,
  status,
  movieTitle,
  episodeName,
  posterUrl,
  isHost = false,
  onEnded,
  videoRef: externalVideoRef,
}: WatchPartyPlayerProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const videoRef = externalVideoRef || localVideoRef;
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [localProgress, setLocalProgress] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Extract direct m3u8 URL if wrapped in phimapi player URL
  let cleanUrl = url;
  try {
    if (url.includes('player.phimapi.com/player/?url=')) {
      const parsedUrl = new URL(url);
      const extracted = parsedUrl.searchParams.get('url');
      if (extracted && extracted.includes('.m3u8')) {
        cleanUrl = extracted;
      }
    }
  } catch (e) { }

  const isHls = cleanUrl.toLowerCase().includes('.m3u8');

  // Load Video source
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isHls) {
      if (Hls.isSupported()) {
        if (hlsRef.current) hlsRef.current.destroy();
        const hls = new Hls({ maxMaxBufferLength: 30, enableWorker: true, lowLatencyMode: true });
        hlsRef.current = hls;
        hls.loadSource(cleanUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => { });
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = cleanUrl;
        video.play().catch(() => { });
      }
    } else {
      video.src = cleanUrl;
      video.play().catch(() => { });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [cleanUrl, isHls]);

  const [showUnmuteOverlay, setShowUnmuteOverlay] = useState(false);

  // Synchronize playback position
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Sync playing status
    if (status === 'playing' && video.paused) {
      video.play().catch((err) => {
        if (err.name === 'NotAllowedError') {
          // Autoplay blocked. Try muted playback.
          video.muted = true;
          setIsMuted(true);
          setVolume(0);
          setShowUnmuteOverlay(true);
          video.play().catch(() => { });
        }
      });
    } else if (status === 'paused' && !video.paused) {
      video.pause();
    }

    // Sync time
    const timeDiff = Math.abs(video.currentTime - currentTime);
    if (timeDiff > 2.5) {
      video.currentTime = currentTime;
    }
  }, [currentTime, status]);

  // Local metadata & ended handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setLocalProgress(video.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    const handleEndedEvent = () => {
      if (onEnded) onEnded();
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEndedEvent);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEndedEvent);
    };
  }, [onEnded]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreen = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreen);
    return () => document.removeEventListener('fullscreenchange', handleFullscreen);
  }, []);

  const resetControlsTimeout = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => { });
    } else {
      document.exitFullscreen().catch(() => { });
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    videoRef.current.muted = newMuted;
    if (newMuted) {
      setVolume(0);
    } else {
      setVolume(1);
      videoRef.current.volume = 1;
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '00:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (localProgress / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 flex items-center justify-center w-full h-full bg-black overflow-hidden font-sans select-none focus:outline-none"
      onMouseMove={resetControlsTimeout}
      onMouseLeave={() => setShowControls(false)}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain pointer-events-none"
        playsInline
        poster={posterUrl}
      />

      {/* Unmute Overlay */}
      {showUnmuteOverlay && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (videoRef.current) {
              videoRef.current.muted = false;
              videoRef.current.volume = 1;
              setIsMuted(false);
              setVolume(1);
            }
            setShowUnmuteOverlay(false);
          }}
          className="absolute top-6 right-6 z-30 px-4 py-2 bg-black/70 hover:bg-black/90 text-white font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer border border-zinc-800 backdrop-blur shadow-lg animate-pulse"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 5L6 9H2v6h4l5 4V5z"></path><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>
          Bật âm thanh
        </button>
      )}

      {/* Top Header Controls */}
      <div className={`absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-500 pointer-events-none z-10 flex items-center justify-between ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex items-center gap-2.5 truncate max-w-full">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black bg-red-600 text-white uppercase tracking-widest animate-pulse shrink-0">
            LIVE BROADCAST
          </span>
          <h2 className="text-white font-bold text-sm sm:text-base drop-shadow-md truncate">
            {movieTitle} {episodeName ? `- Tập ${episodeName}` : ''}
          </h2>
        </div>
      </div>

      {/* Bottom Live Player Controls */}
      <div className={`absolute bottom-0 left-0 right-0 pt-16 pb-4 px-4 bg-gradient-to-t from-black/95 to-transparent transition-all duration-300 transform z-20 ${showControls ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-4 opacity-0 pointer-events-none'}`}>
        <div className="max-w-screen-2xl mx-auto flex flex-col gap-3">

          {/* Progress bar (Non-clickable timeline) */}
          <div className="flex items-center gap-2.5 w-full">
            <span className="text-white font-bold text-xs tabular-nums">{formatTime(localProgress)}</span>
            <div className="flex-1 relative flex flex-col justify-center h-4 cursor-default">
              <div className="relative w-full h-1.5 rounded-sm bg-white/10">
                <div
                  className="absolute top-0 left-0 h-full rounded-sm bg-[#ffd875] transition-none"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
            <span className="text-white font-bold text-xs tabular-nums">{formatTime(duration)}</span>
          </div>

          <div className="flex items-center justify-between">
            {/* Left Controls (Status & Vol) */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ffd875]/80 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ffd875]"></span>
                  </span>
                  <span className="text-xs font-bold text-[#ffd875] uppercase tracking-widest">
                    Phát trực tiếp
                  </span>
                </div>
              </div>

              {/* Volume */}
              <div className="flex items-center gap-2 group/volume">
                <button onClick={toggleMute} className="text-zinc-400 hover:text-white transition-all cursor-pointer bg-transparent border-none">
                  {isMuted || volume === 0 ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" x2="17" y1="9" y2="15"></line><line x1="17" x2="23" y1="9" y2="15"></line></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 5L6 9H2v6h4l5 4V5z"></path><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                  )}
                </button>
                <div className="flex items-center w-20">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="w-full accent-[#ffd875] cursor-pointer h-1 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-4">
              <button
                onClick={toggleFullscreen}
                className="text-zinc-400 hover:text-white transition-all cursor-pointer bg-transparent border-none"
                title="Toàn màn hình"
              >
                {isFullscreen ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7" /></svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" /></svg>
                )}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
