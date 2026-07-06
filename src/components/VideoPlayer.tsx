'use client';

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import Link from 'next/link';

interface EditionItem {
  editionKey: string;
  editionName: string;
  episodeId: number;
}

export interface SubtitleTrack {
  label: string;
  language: string;
  url: string;
}

interface Cue {
  start: number;
  end: number;
  text: string;
}

const parseTime = (timeStr: string): number => {
  const normalized = timeStr.trim().replace(',', '.');
  const parts = normalized.split(':');
  let hrs = 0, mins = 0, secs = 0;
  if (parts.length === 3) {
    hrs = parseFloat(parts[0]);
    mins = parseFloat(parts[1]);
    secs = parseFloat(parts[2]);
  } else if (parts.length === 2) {
    mins = parseFloat(parts[0]);
    secs = parseFloat(parts[1]);
  }
  return hrs * 3600 + mins * 60 + secs;
};

const parseVTT = (text: string): Cue[] => {
  const lines = text.split(/\r?\n/);
  const parsedCues: Cue[] = [];
  let currentCue: Partial<Cue> = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.includes('-->')) {
      const times = line.split('-->');
      currentCue.start = parseTime(times[0]);
      currentCue.end = parseTime(times[1]);
      currentCue.text = '';
    } else if (line && currentCue.start !== undefined) {
      if (line.match(/^\d+$/)) continue;
      if (currentCue.text) {
        currentCue.text += '\n' + line;
      } else {
        currentCue.text = line;
      }
    } else if (!line && currentCue.start !== undefined) {
      parsedCues.push(currentCue as Cue);
      currentCue = {};
    }
  }
  if (currentCue.start !== undefined) {
    parsedCues.push(currentCue as Cue);
  }
  return parsedCues;
};

interface VideoPlayerProps {
  url: string;
  movieTitle?: string;
  episodeName?: string;
  episodes?: any[];
  posterUrl?: string;
  movieId?: number;
  movieSlug?: string;
  episodeId?: number;
  autoSkipIntro?: boolean;
  onEnded?: () => void;
  onNext?: () => void;
  cinemaMode?: boolean;
  // Edition switcher
  editions?: EditionItem[];
  currentEditionKey?: string;
  onEditionChange?: (editionKey: string, episodeId: number) => void;
  // Ad props
  adsVideoEnabled?: boolean;
  adsVideoUrl?: string;
  adsVideoLink?: string;
  adsVideoSkipTime?: number;
  // Ad 2 props
  adsVideo2Enabled?: boolean;
  adsVideo2Url?: string;
  adsVideo2Link?: string;
  adsVideo2SkipTime?: number;
  // Watch Party props
  isWatchParty?: boolean;
  isHost?: boolean;
  watchPartyTime?: number;
  watchPartyStatus?: 'playing' | 'paused';
  onWatchPartyTimeUpdate?: (time: number) => void;
  onWatchPartyStatusChange?: (status: 'playing' | 'paused') => void;
  onTimeUpdate?: (time: number) => void;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  initialProgress?: number;
  onToggleShortcuts?: () => void;
  subtitles?: SubtitleTrack[];
}

export default function VideoPlayer({
  url,
  movieTitle,
  episodeName,
  episodes = [],
  posterUrl,
  movieId,
  movieSlug,
  episodeId,
  autoSkipIntro = false,
  onEnded,
  onNext,
  cinemaMode = false,
  editions = [],
  currentEditionKey = '',
  onEditionChange,
  adsVideoEnabled = false,
  adsVideoUrl,
  adsVideoLink,
  adsVideoSkipTime = 5,
  adsVideo2Enabled = false,
  adsVideo2Url,
  adsVideo2Link,
  adsVideo2SkipTime = 5,
  isWatchParty = false,
  isHost = false,
  watchPartyTime,
  watchPartyStatus,
  onWatchPartyTimeUpdate,
  onWatchPartyStatusChange,
  onTimeUpdate,
  videoRef: externalVideoRef,
  initialProgress = 0,
  onToggleShortcuts,
  subtitles = [],
}: VideoPlayerProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const videoRef = externalVideoRef || localVideoRef;
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const progressRestoredRef = useRef(false);
  const finalTimeRef = useRef(0);
  const lastSavedTimeRef = useRef(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCastAvailable, setIsCastAvailable] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showEpisodes, setShowEpisodes] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [hasSkippedIntro, setHasSkippedIntro] = useState(false);
  const [introTimes, setIntroTimes] = useState<{ start: number; end: number } | null>(null);
  const [outroTimes, setOutroTimes] = useState<{ start: number; end: number } | null>(null);

  const onTimeUpdateRef = useRef(onTimeUpdate);
  const onEndedRef = useRef(onEnded);
  const autoSkipIntroRef = useRef(autoSkipIntro);
  const isScrubbingRef = useRef(isScrubbing);

  onTimeUpdateRef.current = onTimeUpdate;
  onEndedRef.current = onEnded;
  autoSkipIntroRef.current = autoSkipIntro;
  isScrubbingRef.current = isScrubbing;

  // Ad state - phase machine: 'ad1' | 'ad2' | 'main'
  const initialPhase = (): 'ad1' | 'ad2' | 'main' => {
    if (adsVideoEnabled && adsVideoUrl) return 'ad1';
    if (adsVideo2Enabled && adsVideo2Url) return 'ad2';
    return 'main';
  };
  const [adPhase, setAdPhase] = useState<'ad1' | 'ad2' | 'main'>(initialPhase);
  const [adTimeRemaining, setAdTimeRemaining] = useState(
    adsVideoEnabled && adsVideoUrl ? adsVideoSkipTime : adsVideo2SkipTime
  );
  const [adCanSkip, setAdCanSkip] = useState(false);
  const adTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isShowingAd = adPhase !== 'main';

  const [showSettings, setShowSettings] = useState(false);
  const [showEditionPicker, setShowEditionPicker] = useState(false);
  const [settingsPage, setSettingsPage] = useState<'menu' | 'quality' | 'speed' | 'aspect' | 'subtitle' | 'substyle'>('menu');

  useEffect(() => {
    if (!movieId || !episodeName || duration <= 0) return;
    fetch(`/api/skip-intro?movieId=${movieId}&episodeName=${encodeURIComponent(episodeName)}&episodeLength=${duration}`)
      .then(res => res.json())
      .then(data => {
        if (data.found) {
          if (data.op) setIntroTimes(data.op);
          if (data.ed) setOutroTimes(data.ed);
        } else {
          setIntroTimes(null);
          setOutroTimes(null);
        }
      })
      .catch(err => {
        console.error('Failed to fetch skip intro times', err);
        setIntroTimes(null);
        setOutroTimes(null);
      });
  }, [movieId, episodeName, duration]);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [aspectRatio, setAspectRatio] = useState<'contain' | 'cover' | 'fill'>('contain');
  const [qualityLevels, setQualityLevels] = useState<{ id: number; name: string }[]>([]);

  // --- Subtitle States ---
  const [showSubPopup, setShowSubPopup] = useState(false);
  const [showSubSettings, setShowSubSettings] = useState(false);
  const [subtitleMode, setSubtitleMode] = useState<'on' | 'dual' | 'off'>(subtitles.length > 0 ? 'on' : 'off');
  const [selectedSubIndex, setSelectedSubIndex] = useState<number>(subtitles.length > 0 ? 0 : -1);
  const [selectedSubIndex2, setSelectedSubIndex2] = useState<number>(subtitles.length > 1 ? 1 : -1);
  const [activeTab, setActiveTab] = useState<'primary' | 'secondary'>('primary');

  const changeSubtitleMode = (mode: 'on' | 'dual' | 'off') => {
    setSubtitleMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('hubphim_sub_mode', mode);
    }
  };

  const changeSelectedSubIndex = (idx: number) => {
    setSelectedSubIndex(idx);
    if (typeof window !== 'undefined' && idx !== -1 && subtitles[idx]) {
      localStorage.setItem('hubphim_sub_lang1', subtitles[idx].language);
    }
  };

  const changeSelectedSubIndex2 = (idx: number) => {
    setSelectedSubIndex2(idx);
    if (typeof window !== 'undefined' && idx !== -1 && subtitles[idx]) {
      localStorage.setItem('hubphim_sub_lang2', subtitles[idx].language);
    }
  };
  
  const [cues, setCues] = useState<Cue[]>([]);
  const [cues2, setCues2] = useState<Cue[]>([]);
  const [activeCueText, setActiveCueText] = useState('');
  const [activeCueText2, setActiveCueText2] = useState('');

  const [subFontSize, setSubFontSize] = useState<number>(20);
  const [subFontSize2, setSubFontSize2] = useState<number>(16);
  const [subColor, setSubColor] = useState<string>('#ffffff');
  const [subColor2, setSubColor2] = useState<string>('#ffff00');
  const [subFont, setSubFont] = useState<string>('Inter');
  const [subBgStyle, setSubBgStyle] = useState<'none' | 'outline' | 'tint' | 'solid'>('tint');
  const [subPosition, setSubPosition] = useState<'bottom' | 'top'>('bottom');
  const [subBgOpacity, setSubBgOpacity] = useState<number>(0.6);

  const changeSubFontSize = (size: number) => {
    setSubFontSize(size);
    if (typeof window !== 'undefined') {
      localStorage.setItem('hubphim_sub_size', String(size));
    }
  };

  const changeSubFontSize2 = (size: number) => {
    setSubFontSize2(size);
    if (typeof window !== 'undefined') {
      localStorage.setItem('hubphim_sub_size2', String(size));
    }
  };

  const changeSubColor = (color: string) => {
    setSubColor(color);
    if (typeof window !== 'undefined') {
      localStorage.setItem('hubphim_sub_color', color);
    }
  };

  const changeSubColor2 = (color: string) => {
    setSubColor2(color);
    if (typeof window !== 'undefined') {
      localStorage.setItem('hubphim_sub_color2', color);
    }
  };

  const changeSubFont = (font: string) => {
    setSubFont(font);
    if (typeof window !== 'undefined') {
      localStorage.setItem('hubphim_sub_font', font);
    }
  };

  const changeSubBgStyle = (style: string) => {
    setSubBgStyle(style as any);
    if (typeof window !== 'undefined') {
      localStorage.setItem('hubphim_sub_bg', style);
    }
  };

  const changeSubPosition = (pos: 'bottom' | 'top') => {
    setSubPosition(pos);
    if (typeof window !== 'undefined') {
      localStorage.setItem('hubphim_sub_pos', pos);
    }
  };
  const [currentQuality, setCurrentQuality] = useState<number>(-1); // -1 = Auto

  // Helper states for overlays
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [nextEpisodeCountdown, setNextEpisodeCountdown] = useState<number | null>(null);
  const [speedIndicator, setSpeedIndicator] = useState<string | null>(null);
  const speedIndicatorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [volumeIndicator, setVolumeIndicator] = useState<string | null>(null);
  const volumeIndicatorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isVolumeAdjusting, setIsVolumeAdjusting] = useState(false);
  const volumeAdjustTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [hasStarted, setHasStarted] = useState(initialProgress > 0);
  const [centerIcon, setCenterIcon] = useState<'play' | 'pause'>('play');
  const [centerVisible, setCenterVisible] = useState(false);
  const centerActionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerCenterAction = (type: 'play' | 'pause') => {
    setCenterIcon(type);
    setCenterVisible(false);
    setTimeout(() => {
      setCenterVisible(true);
      if (centerActionTimeoutRef.current) clearTimeout(centerActionTimeoutRef.current);
      centerActionTimeoutRef.current = setTimeout(() => {
        setCenterVisible(false);
      }, 500);
    }, 10);
  };

  const triggerVolumeAdjusting = () => {
    setIsVolumeAdjusting(true);
    if (volumeAdjustTimeoutRef.current) clearTimeout(volumeAdjustTimeoutRef.current);
    volumeAdjustTimeoutRef.current = setTimeout(() => {
      setIsVolumeAdjusting(false);
    }, 2000);
  };

  const triggerSpeedIndicator = (speedVal: number) => {
    if (speedIndicatorTimeoutRef.current) clearTimeout(speedIndicatorTimeoutRef.current);
    let speedText = `${speedVal}x`;
    if (speedVal === 1.0) speedText = 'Bình thường';
    setSpeedIndicator(speedText);
    speedIndicatorTimeoutRef.current = setTimeout(() => {
      setSpeedIndicator(null);
    }, 1200);
  };

  const triggerVolumeIndicator = (volVal: number, muted: boolean) => {
    if (volumeIndicatorTimeoutRef.current) clearTimeout(volumeIndicatorTimeoutRef.current);
    const text = muted ? 'Đã tắt tiếng' : `Âm lượng: ${Math.round(volVal * 100)}%`;
    setVolumeIndicator(text);
    volumeIndicatorTimeoutRef.current = setTimeout(() => {
      setVolumeIndicator(null);
    }, 1200);
  };

  // Hold-to-speed-up 2x and Double-tap seek gestures
  const holdTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isHolding2xRef = useRef(false);
  const originalSpeedRef = useRef(1.0);
  const lastTouchTimeRef = useRef(0);

  const handleHoldStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (isShowingAd || !videoRef.current) return;
    if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);

    holdTimeoutRef.current = setTimeout(() => {
      if (!videoRef.current) return;
      isHolding2xRef.current = true;
      originalSpeedRef.current = videoRef.current.playbackRate;
      videoRef.current.playbackRate = 2.0;
      setSpeedIndicator('2x (Nhấn giữ)');
    }, 450);
  };

  const handleHoldEnd = (e: React.MouseEvent | React.TouchEvent) => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }

    if (isHolding2xRef.current) {
      isHolding2xRef.current = false;
      if (videoRef.current) {
        videoRef.current.playbackRate = playbackSpeed;
      }
      setSpeedIndicator(null);
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLVideoElement>) => {
    if (isShowingAd) return;
    const now = Date.now();
    const timeDiff = now - lastTouchTimeRef.current;

    if (isHolding2xRef.current) {
      handleHoldEnd(e);
      lastTouchTimeRef.current = now;
      return;
    }

    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }

    if (timeDiff < 300) {
      e.preventDefault();
      const rect = e.currentTarget.getBoundingClientRect();
      const touchX = e.changedTouches[0].clientX - rect.left;
      const width = rect.width;

      if (touchX < width / 2) {
        skipBackward();
      } else {
        skipForward();
      }
    } else {
      setTimeout(() => {
        if (Date.now() - lastTouchTimeRef.current >= 300) {
          setShowControls(prev => !prev);
          resetControlsTimeout();
        }
      }, 300);
    }
    lastTouchTimeRef.current = now;
  };



  const [showLeftSeek, setShowLeftSeek] = useState(false);
  const [showRightSeek, setShowRightSeek] = useState(false);
  const [lastSeekAmount, setLastSeekAmount] = useState(10);
  const leftSeekTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const rightSeekTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerLeftSeek = (amount: number) => {
    setLastSeekAmount(amount);
    setShowLeftSeek(true);
    if (leftSeekTimeoutRef.current) clearTimeout(leftSeekTimeoutRef.current);
    leftSeekTimeoutRef.current = setTimeout(() => {
      setShowLeftSeek(false);
    }, 650);
  };

  const triggerRightSeek = (amount: number) => {
    setLastSeekAmount(amount);
    setShowRightSeek(true);
    if (rightSeekTimeoutRef.current) clearTimeout(rightSeekTimeoutRef.current);
    rightSeekTimeoutRef.current = setTimeout(() => {
      setShowRightSeek(false);
    }, 650);
  };



  useEffect(() => {
    if (cinemaMode) {
      setAspectRatio('cover');
    } else {
      setAspectRatio('contain');
    }
  }, [cinemaMode]);

  // --- Subtitle Loading and Syncing ---
  useEffect(() => {
    if (selectedSubIndex === -1 || !subtitles[selectedSubIndex]) {
      setCues([]);
      setActiveCueText('');
      return;
    }

    const sub = subtitles[selectedSubIndex];
    fetch(sub.url)
      .then((res) => res.text())
      .then((text) => {
        setCues(parseVTT(text.normalize('NFC')));
      })
      .catch((err) => {
        console.error('Lỗi khi nạp file phụ đề 1:', err);
      });
  }, [selectedSubIndex, subtitles]);

  useEffect(() => {
    if (selectedSubIndex2 === -1 || !subtitles[selectedSubIndex2]) {
      setCues2([]);
      setActiveCueText2('');
      return;
    }

    const sub = subtitles[selectedSubIndex2];
    fetch(sub.url)
      .then((res) => res.text())
      .then((text) => {
        setCues2(parseVTT(text.normalize('NFC')));
      })
      .catch((err) => {
        console.error('Lỗi khi nạp file phụ đề 2:', err);
      });
  }, [selectedSubIndex2, subtitles]);

  useEffect(() => {
    if (cues.length === 0) {
      setActiveCueText('');
    } else {
      const matched = cues.find((c) => progress >= c.start && progress <= c.end);
      if (matched) {
        setActiveCueText(matched.text);
      } else {
        setActiveCueText('');
      }
    }

    if (cues2.length === 0) {
      setActiveCueText2('');
    } else {
      const matched2 = cues2.find((c) => progress >= c.start && progress <= c.end);
      if (matched2) {
        setActiveCueText2(matched2.text);
      } else {
        setActiveCueText2('');
      }
    }
  }, [progress, cues, cues2]);

  // --- Subtitle Settings Persistence ---
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedMode = localStorage.getItem('hubphim_sub_mode');
        if (storedMode) setSubtitleMode(storedMode as any);

        const storedSize = localStorage.getItem('hubphim_sub_size');
        if (storedSize) setSubFontSize(Number(storedSize));

        const storedSize2 = localStorage.getItem('hubphim_sub_size2');
        if (storedSize2) setSubFontSize2(Number(storedSize2));

        const storedColor = localStorage.getItem('hubphim_sub_color');
        if (storedColor) setSubColor(storedColor);

        const storedColor2 = localStorage.getItem('hubphim_sub_color2');
        if (storedColor2) setSubColor2(storedColor2);

        const storedFont = localStorage.getItem('hubphim_sub_font');
        if (storedFont) setSubFont(storedFont);

        const storedBg = localStorage.getItem('hubphim_sub_bg');
        if (storedBg) setSubBgStyle(storedBg as any);

        const storedPos = localStorage.getItem('hubphim_sub_pos');
        if (storedPos) setSubPosition(storedPos as any);
      } catch (err) {
        console.error('Error loading sub settings:', err);
      }
    }
  }, []);



  useEffect(() => {
    if (subtitles.length > 0) {
      // 1. Respect user's choice in localStorage if any
      const storedMode = typeof window !== 'undefined' ? localStorage.getItem('hubphim_sub_mode') : null;
      if (storedMode === 'off' || storedMode === 'dual' || storedMode === 'on') {
        setSubtitleMode(storedMode as any);
      } else {
        setSubtitleMode('on');
      }

      // 2. Restore primary subtitle track by language code
      const storedLang1 = typeof window !== 'undefined' ? localStorage.getItem('hubphim_sub_lang1') : null;
      let matchedIdx1 = -1;
      if (storedLang1) {
        matchedIdx1 = subtitles.findIndex(s => s.language === storedLang1);
      }
      if (matchedIdx1 !== -1) {
        setSelectedSubIndex(matchedIdx1);
      } else {
        setSelectedSubIndex(0);
      }

      // 3. Restore secondary subtitle track by language code
      const storedLang2 = typeof window !== 'undefined' ? localStorage.getItem('hubphim_sub_lang2') : null;
      let matchedIdx2 = -1;
      if (storedLang2) {
        matchedIdx2 = subtitles.findIndex(s => s.language === storedLang2);
      }
      if (matchedIdx2 !== -1) {
        setSelectedSubIndex2(matchedIdx2);
      } else if (subtitles.length > 1) {
        const fallbackIdx1 = matchedIdx1 !== -1 ? matchedIdx1 : 0;
        setSelectedSubIndex2(fallbackIdx1 === 0 ? 1 : 0);
      } else {
        setSelectedSubIndex2(-1);
      }
    } else {
      setSubtitleMode('off');
      setSelectedSubIndex(-1);
      setSelectedSubIndex2(-1);
    }
  }, [subtitles]);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const canSeek = !isWatchParty;
  const canTogglePlay = !isWatchParty;

  // Extract direct m3u8 URL if wrapped in an embed URL
  let cleanUrl = url;
  try {
    if (url.includes('player.phimapi.com/player/?url=')) {
      const parsedUrl = new URL(url);
      const extracted = parsedUrl.searchParams.get('url');
      if (extracted && extracted.includes('.m3u8')) {
        cleanUrl = extracted;
      }
    }
  } catch (e) {
    // Ignore URL parsing errors
  }

  const isHls = cleanUrl.toLowerCase().includes('.m3u8');

  // Helper to load HLS or direct source into video element
  const loadVideoSource = (video: HTMLVideoElement, src: string, onReady?: () => void) => {
    const isM3u8 = src.toLowerCase().includes('.m3u8');
    const isNetoda = src.includes('netoda.tech');

    if (isM3u8) {
      if (Hls.isSupported()) {
        if (hlsRef.current) hlsRef.current.destroy();
        const startPos = (adPhase === 'main' && initialProgress > 5) ? initialProgress : -1;
        const hls = new Hls({ maxMaxBufferLength: 30, enableWorker: true, lowLatencyMode: true, startPosition: startPos });
        hlsRef.current = hls;

        // Cứu cánh nếu Hls không load được phân mảnh từ startPosition
        let hasSeeked = false;
        hls.on(Hls.Events.FRAG_LOADED, () => {
          if (!hasSeeked && startPos > 5 && video) {
            if (Math.abs(video.currentTime - startPos) > 3) {
              video.currentTime = startPos;
            }
            hasSeeked = true;
            progressRestoredRef.current = true;
          }
        });

        hls.on(Hls.Events.MEDIA_ATTACHED, () => {
          hls.loadSource(src);
        });
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(e => console.log('Auto-play prevented:', e));
          if (onReady) onReady();
        });
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
            else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
            else hls.destroy();
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = src;
        video.addEventListener('loadedmetadata', () => {
          video.play().catch(e => console.log('Auto-play prevented:', e));
          if (onReady) onReady();
        }, { once: true });
      }
    } else {
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
      video.src = src;
      video.addEventListener('loadedmetadata', () => {
        video.play().catch(e => console.log('Auto-play prevented:', e));
        if (onReady) onReady();
      }, { once: true });
    }
  };

  const finishCurrentAd = () => {
    if (adTimerRef.current) clearInterval(adTimerRef.current);
    // Decide next phase
    if (adPhase === 'ad1') {
      if (adsVideo2Enabled && adsVideo2Url) {
        setAdPhase('ad2');
      } else {
        setAdPhase('main');
      }
    } else {
      setAdPhase('main');
    }
  };

  // Alias for backwards compat in event handlers
  const finishAd = finishCurrentAd;

  useEffect(() => {
    setHasSkippedIntro(false);
  }, [cleanUrl]);

  // Load video source: ad first (if enabled), then main
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!isHls) return; // iframe handled separately

    if (adPhase === 'ad1' && adsVideoEnabled && adsVideoUrl) {
      // Load TVC 1
      if (hlsRef.current) hlsRef.current.destroy();
      loadVideoSource(video, adsVideoUrl);
      // Start countdown
      if (adTimerRef.current) clearInterval(adTimerRef.current);
      setAdTimeRemaining(adsVideoSkipTime);
      setAdCanSkip(adsVideoSkipTime === 0);
      if (adsVideoSkipTime > 0) {
        let remaining = adsVideoSkipTime;
        adTimerRef.current = setInterval(() => {
          remaining -= 1;
          setAdTimeRemaining(remaining);
          if (remaining <= 0) { clearInterval(adTimerRef.current!); setAdCanSkip(true); }
        }, 1000);
      }
    } else if (adPhase === 'ad2' && adsVideo2Enabled && adsVideo2Url) {
      // Load TVC 2
      if (hlsRef.current) hlsRef.current.destroy();
      loadVideoSource(video, adsVideo2Url);
      if (adTimerRef.current) clearInterval(adTimerRef.current);
      setAdTimeRemaining(adsVideo2SkipTime);
      setAdCanSkip(adsVideo2SkipTime === 0);
      if (adsVideo2SkipTime > 0) {
        let remaining = adsVideo2SkipTime;
        adTimerRef.current = setInterval(() => {
          remaining -= 1;
          setAdTimeRemaining(remaining);
          if (remaining <= 0) { clearInterval(adTimerRef.current!); setAdCanSkip(true); }
        }, 1000);
      }
    } else {
      // Load main movie
      if (hlsRef.current) hlsRef.current.destroy();
      loadVideoSource(video, cleanUrl, () => {
        const levels = hlsRef.current?.levels.map((level, index) => ({
          id: index,
          name: level.height ? `${level.height}p` : `Level ${index + 1}`
        })) || [];
        setQualityLevels(levels);
        setCurrentQuality(hlsRef.current?.currentLevel ?? -1);
      });
      if (hlsRef.current) {
        const hls = hlsRef.current;
        hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => setCurrentQuality(data.level));
      }

      // Instantly log watch history entry to DB for HLS main movie load
      if (movieId) {
        fetch('/api/user/watch-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            movieId,
            episodeId,
            progress: 0,
            duration: 0
          })
        }).catch(e => console.error('Initial HLS watch history error', e));
      }
    }

    return () => {
      if (adTimerRef.current) clearInterval(adTimerRef.current);
      if (hlsRef.current) hlsRef.current.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adPhase, cleanUrl, movieId, episodeId]);

  // Initialize and reset progressRestoredRef depending on whether there is progress to restore
  useEffect(() => {
    let finalTime = 0;
    if (initialProgress && initialProgress > 5) {
      finalTime = initialProgress;
    } else if (typeof window !== 'undefined' && movieId) {
      const savedData = localStorage.getItem(`hubphim_watched_${movieId}_${episodeId || ''}`);
      if (savedData) {
        try {
          if (savedData.trim().startsWith('{')) {
            const { time } = JSON.parse(savedData);
            finalTime = parseFloat(time);
          } else {
            finalTime = parseFloat(savedData);
          }
        } catch { }
      }
    }

    console.log('[VideoPlayer] useEffect init - cleanUrl:', cleanUrl, 'initialProgress:', initialProgress, 'finalTime:', finalTime);
    finalTimeRef.current = finalTime;
    if (finalTime <= 5) {
      progressRestoredRef.current = true;
    } else {
      progressRestoredRef.current = false;
    }
    setHasSkippedIntro(false);
  }, [cleanUrl, movieId, episodeId, initialProgress]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const saveWatchHistoryToDB = async (currentTime: number, videoDuration: number, watchedSeconds: number = 0) => {
      try {
        await fetch('/api/user/watch-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            movieId,
            episodeId,
            progress: currentTime,
            duration: videoDuration,
            watchedSeconds
          })
        });
      } catch (e) {
        console.error('Failed to save watch history database', e);
      }
    };

    const handleTimeUpdate = () => {
      if (!isScrubbingRef.current) {
        setProgress(video.currentTime);

        // Guard checking if progress has been restored to avoid saving/reporting 0s
        if (!progressRestoredRef.current && finalTimeRef.current > 5) {
          if (video.currentTime > 5 && Math.abs(video.currentTime - finalTimeRef.current) < 20) {
            console.log('[VideoPlayer] progress restored via timeupdate. currentTime:', video.currentTime);
            progressRestoredRef.current = true;
          }
        }

        if (progressRestoredRef.current) {
          if (onTimeUpdateRef.current) {
            onTimeUpdateRef.current(video.currentTime);
          }
          const skipStart = introTimes ? introTimes.start : 1;
          const skipEnd = introTimes ? introTimes.end : 60;
          if (autoSkipIntroRef.current && !hasSkippedIntro && video.currentTime > skipStart && video.currentTime < skipEnd) {
            video.currentTime = skipEnd;
            setHasSkippedIntro(true);
          }
          // Save watching progress if in main movie phase and not at the end
          if (adPhase === 'main' && movieId) {
            localStorage.setItem(
              `hubphim_watched_${movieId}_${episodeId || ''}`,
              JSON.stringify({
                time: video.currentTime,
                updatedAt: Date.now()
              })
            );

            // Throttled database saving every 10 seconds or immediately on first tick
            if (lastSavedTimeRef.current === 0 || Math.abs(video.currentTime - lastSavedTimeRef.current) > 10) {
              const diff = video.currentTime - lastSavedTimeRef.current;
              let watchedSeconds = 0;
              if (lastSavedTimeRef.current > 0 && diff > 0 && diff <= 12) {
                watchedSeconds = Math.round(diff);
              }

              lastSavedTimeRef.current = video.currentTime;
              saveWatchHistoryToDB(video.currentTime, video.duration || 0, watchedSeconds);
            }
          }
        }
      }
    };
    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      // Restore watching progress for main movie phase using finalTimeRef
      if (adPhase === 'main' && movieId) {
        const finalTime = finalTimeRef.current;
        console.log('[VideoPlayer] handleLoadedMetadata - finalTime:', finalTime);

        if (finalTime > 5) {
          const enforceSeek = () => {
            if (!video) return;
            try {
              console.log('[VideoPlayer] enforceSeek executing. finalTime:', finalTime, 'currentTime:', video.currentTime);
              video.currentTime = finalTime;
            } catch (err) {
              console.error('Failed to seek:', err);
            }
          };

          if (video.readyState >= 1) { // HAVE_METADATA
            enforceSeek();
          }
          video.addEventListener('loadeddata', enforceSeek, { once: true });
          video.addEventListener('canplay', enforceSeek, { once: true });
          video.addEventListener('playing', enforceSeek, { once: true });

          const handleSeeked = () => {
            console.log('[VideoPlayer] seeked event fired. currentTime:', video.currentTime);
            progressRestoredRef.current = true;
            video.removeEventListener('seeked', handleSeeked);
          };
          video.addEventListener('seeked', handleSeeked);
        } else {
          progressRestoredRef.current = true;
        }

        saveWatchHistoryToDB(video.currentTime || 0, video.duration || 0);
      } else {
        progressRestoredRef.current = true;
      }
    };
    const handlePlay = () => {
      setIsPlaying(true);
      setHasStarted(true);
      if (adPhase === 'main' && movieId) {
        saveWatchHistoryToDB(video.currentTime || 0, video.duration || 0);
      }
    };
    const handlePause = () => {
      setIsPlaying(false);
      if (adPhase === 'main' && movieId && video.duration) {
        saveWatchHistoryToDB(video.currentTime, video.duration);
      }
    };
    const handleEnded = () => {
      setIsPlaying(false);
      if (isShowingAd) {
        // Ad ended → transition to main movie
        finishAd();
      } else {
        // Clear progress when movie ended
        if (movieId) {
          localStorage.removeItem(`hubphim_watched_${movieId}_${episodeId || ''}`);
        }
        if (onEndedRef.current) onEndedRef.current();
      }
    };
    const handleVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('volumechange', handleVolumeChange);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('volumechange', handleVolumeChange);
    };
  }, [cleanUrl, movieId, episodeId, adPhase]);

  // Guest watch party synchronization effect
  useEffect(() => {
    if (!isWatchParty || isHost || !videoRef.current) return;
    const video = videoRef.current;

    // Sync play/pause status
    if (watchPartyStatus === 'playing' && video.paused) {
      video.play().catch(() => { });
    } else if (watchPartyStatus === 'paused' && !video.paused) {
      video.pause();
    }

    // Sync time if out of sync by more than 3 seconds
    if (watchPartyTime !== undefined) {
      const timeDiff = Math.abs(video.currentTime - watchPartyTime);
      if (timeDiff > 3) {
        video.currentTime = watchPartyTime;
      }
    }
  }, [isWatchParty, isHost, watchPartyTime, watchPartyStatus]);

  // Host watch party events reporter
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isWatchParty || !isHost) return;

    const handlePlayHost = () => {
      if (onWatchPartyStatusChange) onWatchPartyStatusChange('playing');
    };
    const handlePauseHost = () => {
      if (onWatchPartyStatusChange) onWatchPartyStatusChange('paused');
    };
    const handleSeekedHost = () => {
      if (onWatchPartyTimeUpdate) onWatchPartyTimeUpdate(video.currentTime);
    };

    video.addEventListener('play', handlePlayHost);
    video.addEventListener('pause', handlePauseHost);
    video.addEventListener('seeked', handleSeekedHost);

    return () => {
      video.removeEventListener('play', handlePlayHost);
      video.removeEventListener('pause', handlePauseHost);
      video.removeEventListener('seeked', handleSeekedHost);
    };
  }, [isWatchParty, isHost, onWatchPartyStatusChange, onWatchPartyTimeUpdate]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(
        !!(document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).mozFullScreenElement ||
          (document as any).msFullscreenElement)
      );
    };

    const handleWebKitFullscreenChange = () => {
      setIsFullscreen(true);
    };
    const handleWebKitFullscreenEnd = () => {
      setIsFullscreen(false);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    const video = videoRef.current;
    if (video) {
      video.addEventListener('webkitbeginfullscreen', handleWebKitFullscreenChange);
      video.addEventListener('webkitendfullscreen', handleWebKitFullscreenEnd);
    }

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      if (video) {
        video.removeEventListener('webkitbeginfullscreen', handleWebKitFullscreenChange);
        video.removeEventListener('webkitendfullscreen', handleWebKitFullscreenEnd);
      }
    };
  }, [videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.remote) {
      video.remote.watchAvailability((available: boolean) => {
        setIsCastAvailable(available);
      }).catch(() => {
        setIsCastAvailable(true);
      });
    } else if ((video as any).webkitShowPlaybackTargetPicker) {
      setIsCastAvailable(true);
    }
  }, [videoRef]);

  const resetControlsTimeout = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying && !showEpisodes && !showSettings) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 5000);
    }
  };

  const handleMouseMove = () => {
    resetControlsTimeout();
  };

  const handleMouseLeave = () => {
    if (isPlaying && !showEpisodes && !showSettings) {
      setShowControls(false);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current || !canTogglePlay) return;
    if (isPlaying) {
      videoRef.current.pause();
      triggerCenterAction('play');
    } else {
      videoRef.current.play();
      triggerCenterAction('pause');
    }
    resetControlsTimeout();
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setProgress(value);
    if (videoRef.current) {
      videoRef.current.currentTime = value;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setVolume(value);
    if (videoRef.current) {
      videoRef.current.volume = value;
      videoRef.current.muted = value === 0;
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    if (nextMuted) {
      setVolume(0);
    } else {
      setVolume(1);
      videoRef.current.volume = 1;
    }
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || !video) return;

    const isFull = !!(document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement);

    if (!isFull) {
      if (container.requestFullscreen) {
        container.requestFullscreen().catch(err => {
          console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
      } else if ((container as any).webkitRequestFullscreen) {
        (container as any).webkitRequestFullscreen();
      } else if ((container as any).mozRequestFullScreen) {
        (container as any).mozRequestFullScreen();
      } else if ((container as any).msRequestFullscreen) {
        (container as any).msRequestFullscreen();
      } else if ((video as any).webkitEnterFullscreen) {
        (video as any).webkitEnterFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        (document as any).mozCancelFullScreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }
    }
  };

  const handleCast = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if ((video as any).webkitShowPlaybackTargetPicker) {
        (video as any).webkitShowPlaybackTargetPicker();
      } else if (video.remote) {
        await video.remote.prompt();
      } else {
        alert('Thiết bị hoặc trình duyệt của bạn không hỗ trợ truyền hình ảnh lên TV.');
      }
    } catch (err) {
      console.error('Remote playback error:', err);
    }
  };

  const togglePiP = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (videoRef.current.requestPictureInPicture) {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (error) {
      console.error('PiP Error:', error);
    }
  };

  const changePlaybackSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    triggerSpeedIndicator(speed);
  };

  const changeQuality = (levelIndex: number) => {
    setCurrentQuality(levelIndex);
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIndex;
    }
  };

  const skipForward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime += 10;
      triggerRightSeek(10);
    }
  };

  const skipBackward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime -= 10;
      triggerLeftSeek(10);
    }
  };

  const skipIntro = () => {
    if (videoRef.current) {
      const skipEnd = introTimes ? introTimes.end : 60;
      videoRef.current.currentTime = skipEnd;
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '00:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Keyboard Shortcuts like YouTube
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Skip if user is typing in inputs or textareas
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl instanceof HTMLElement && activeEl.isContentEditable))
      ) {
        return;
      }

      const video = videoRef.current;
      if (!video || isShowingAd) return;

      const key = e.key.toLowerCase();

      // Space or 'k' -> Play/Pause
      if (e.key === ' ' || key === 'k') {
        e.preventDefault();
        togglePlay();
      }
      // 'j' -> Tua lùi 10s
      else if (key === 'j') {
        e.preventDefault();
        skipBackward();
      }
      // 'l' -> Tua tới 10s
      else if (key === 'l') {
        e.preventDefault();
        skipForward();
      }
      // Left Arrow -> Tua lùi 10s
      else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (canSeek) {
          video.currentTime = Math.max(0, video.currentTime - 10);
          triggerLeftSeek(10);
          setShowControls(true);
          resetControlsTimeout();
        }
      }
      // Right Arrow -> Tua tới 10s
      else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (canSeek) {
          video.currentTime = Math.min(video.duration || 0, video.currentTime + 10);
          triggerRightSeek(10);
          setShowControls(true);
          resetControlsTimeout();
        }
      }
      // Up Arrow -> Tăng âm lượng 10%
      else if (e.key === 'ArrowUp') {
        e.preventDefault();
        console.log('[VideoPlayer] keydown: ArrowUp');
        const nextVol = Math.min(1, video.volume + 0.1);
        setVolume(nextVol);
        video.volume = nextVol;
        video.muted = false;
        triggerVolumeIndicator(nextVol, false);
        triggerVolumeAdjusting();
        setShowControls(true);
        resetControlsTimeout();
      }
      // Down Arrow -> Giảm âm lượng 10%
      else if (e.key === 'ArrowDown') {
        e.preventDefault();
        console.log('[VideoPlayer] keydown: ArrowDown');
        const nextVol = Math.max(0, video.volume - 0.1);
        setVolume(nextVol);
        video.volume = nextVol;
        const shouldMute = nextVol === 0;
        video.muted = shouldMute;
        triggerVolumeIndicator(nextVol, shouldMute);
        triggerVolumeAdjusting();
        setShowControls(true);
        resetControlsTimeout();
      }
      // 'f' -> Toàn màn hình
      else if (key === 'f') {
        e.preventDefault();
        toggleFullscreen();
      }
      // 'm' -> Tắt/Bật tiếng
      else if (key === 'm') {
        e.preventDefault();
        const nextMuted = !video.muted;
        video.muted = nextMuted;
        setIsMuted(nextMuted);
        triggerVolumeIndicator(video.volume, nextMuted);
        triggerVolumeAdjusting();
        setShowControls(true);
        resetControlsTimeout();
      }
      // '0' to '9' -> Tua theo % thời lượng
      else if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        if (canSeek && video.duration) {
          const percent = parseInt(e.key) / 10;
          video.currentTime = video.duration * percent;
          resetControlsTimeout();
        }
      }
      // '>' / '.' (Shift + '.') -> Tăng tốc độ phát
      else if (e.key === '>' || (e.shiftKey && e.key === '.')) {
        e.preventDefault();
        const speeds = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
        const currentIndex = speeds.indexOf(playbackSpeed);
        if (currentIndex !== -1 && currentIndex < speeds.length - 1) {
          changePlaybackSpeed(speeds[currentIndex + 1]);
        }
      }
      // '<' / ',' (Shift + ',') -> Giảm tốc độ phát
      else if (e.key === '<' || (e.shiftKey && e.key === ',')) {
        e.preventDefault();
        const speeds = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
        const currentIndex = speeds.indexOf(playbackSpeed);
        if (currentIndex !== -1 && currentIndex > 0) {
          changePlaybackSpeed(speeds[currentIndex - 1]);
        }
      }
      // '?' -> Hiển thị bảng phím tắt
      else if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        if (onToggleShortcuts) onToggleShortcuts();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPlaying, playbackSpeed, volume, isMuted, isFullscreen, duration, canSeek, isShowingAd, onToggleShortcuts]);


  // Record history for embed iframe players immediately on mount
  useEffect(() => {
    if (!isHls && movieId) {
      const saveEmbedWatchHistory = async () => {
        try {
          await fetch('/api/user/watch-history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              movieId,
              episodeId,
              progress: 0,
              duration: 0
            })
          });
        } catch (e) {
          console.error('Failed to save watch history database for embed', e);
        }
      };
      saveEmbedWatchHistory();
    }
  }, [isHls, movieId, episodeId]);

  if (!isHls) {
    return (
      <iframe
        src={cleanUrl}
        className="absolute inset-0 w-full h-full border-none"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="Movie Player"
      />
    );
  }

  // Helpers for ad overlay
  const currentAdLink = adPhase === 'ad1' ? adsVideoLink : adsVideo2Link;
  const totalAds = (adsVideoEnabled && adsVideoUrl ? 1 : 0) + (adsVideo2Enabled && adsVideo2Url ? 1 : 0);
  const currentAdNum = adPhase === 'ad1' ? 1 : 2;

  const handleAdClick = () => {
    if (currentAdLink) window.open(currentAdLink, '_blank', 'noopener,noreferrer');
  };

  const handleSkipAd = () => {
    if (adCanSkip) finishAd();
  };

  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;
  const isIntro = introTimes
    ? (progress < introTimes.end)
    : (progress < 60);

  const aspectStyles = {
    contain: 'object-contain',
    cover: 'object-cover',
    fill: 'object-fill'
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 flex items-center justify-center w-full h-full bg-black overflow-hidden font-sans select-none focus:outline-none"
      tabIndex={0}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={() => {
        if (showSettings) setShowSettings(false);
        // Chỉ show controls, không toggle play khi click vào vùng ngoài (desktop)
        if (!showControls) {
          setShowControls(true);
        }
        resetControlsTimeout();
        if (showEditionPicker) setShowEditionPicker(false);
      }}
    >
      <video
        ref={videoRef}
        className={`w-full h-full ${isShowingAd ? 'cursor-pointer' : `cursor-pointer ${aspectStyles[aspectRatio]}`}`}
        playsInline
        preload="auto"
        onClick={isShowingAd ? handleAdClick : togglePlay}
        onTouchEnd={(e) => {
          // Trên mobile: tap vào video -> chỉ toggle hiển thị/ẩn thanh điều khiển
          if (!isShowingAd) {
            e.preventDefault();
            if (showControls) {
              setShowControls(false);
              if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
            } else {
              resetControlsTimeout();
            }
          }
        }}
        poster={isShowingAd ? undefined : posterUrl}
      />

      {/* Styled Subtitle Custom Overlay */}
      {subtitleMode !== 'off' && (activeCueText || (subtitleMode === 'dual' && activeCueText2)) && (
        <div
          className="absolute left-1/2 transform -translate-x-1/2 text-center z-30 pointer-events-none w-[90%] flex flex-col items-center gap-1.5"
          style={{
            bottom: subPosition === 'bottom' ? (showControls ? '85px' : '32px') : 'auto',
            top: subPosition === 'top' ? '32px' : 'auto',
            transition: 'all 0.2s ease-out'
          }}
        >
          {/* Subtitle 1 (Primary) */}
          {activeCueText && (
            <span
              className="px-3.5 py-1.5 rounded transition-all duration-200"
              style={{
                background: subBgStyle === 'tint' ? `rgba(0,0,0,${subBgOpacity})` : subBgStyle === 'solid' ? 'rgba(0,0,0,0.95)' : subBgStyle === 'outline' ? 'rgba(0,0,0,0.4)' : 'transparent',
                color: subColor,
                fontSize: `${subFontSize}px`,
                lineHeight: '1.4',
                whiteSpace: 'pre-line',
                fontWeight: (subFont === 'Montserrat' || subFont === 'Lexend' || subFont === 'Playfair Display' || subFont === 'Oswald') ? '700' : '500',
                fontFamily: subFont === 'Montserrat' ? 'Montserrat, sans-serif' : subFont === 'Lexend' ? 'Lexend, sans-serif' : subFont === 'Playfair Display' ? '"Playfair Display", Georgia, serif' : subFont === 'Oswald' ? 'Oswald, sans-serif' : subFont === 'Inter' ? 'Inter, sans-serif' : subFont === 'Arial' ? 'Arial, sans-serif' : subFont === 'Courier New' ? 'Courier New, monospace' : subFont === 'Georgia' ? 'Merriweather, Georgia, serif' : 'sans-serif',
                textShadow: subBgStyle === 'outline' ? '0 0 4px #000, 0 0 4px #000, 0 0 4px #000, 0 0 4px #000' : '1.5px 1.5px 2.5px #000'
              }}
            >
              {activeCueText}
            </span>
          )}

          {/* Subtitle 2 (Secondary - Dual Mode) */}
          {subtitleMode === 'dual' && activeCueText2 && (
            <span
              className="px-3 py-1 rounded transition-all duration-200"
              style={{
                background: subBgStyle === 'tint' ? `rgba(0,0,0,${subBgOpacity})` : subBgStyle === 'solid' ? 'rgba(0,0,0,0.95)' : subBgStyle === 'outline' ? 'rgba(0,0,0,0.4)' : 'transparent',
                color: subColor2,
                fontSize: `${subFontSize2}px`,
                lineHeight: '1.4',
                whiteSpace: 'pre-line',
                fontWeight: (subFont === 'Montserrat' || subFont === 'Lexend' || subFont === 'Playfair Display' || subFont === 'Oswald') ? '700' : '500',
                fontFamily: subFont === 'Montserrat' ? 'Montserrat, sans-serif' : subFont === 'Lexend' ? 'Lexend, sans-serif' : subFont === 'Playfair Display' ? '"Playfair Display", Georgia, serif' : subFont === 'Oswald' ? 'Oswald, sans-serif' : subFont === 'Inter' ? 'Inter, sans-serif' : subFont === 'Arial' ? 'Arial, sans-serif' : subFont === 'Courier New' ? 'Courier New, monospace' : subFont === 'Georgia' ? 'Merriweather, Georgia, serif' : 'sans-serif',
                textShadow: subBgStyle === 'outline' ? '0 0 4px #000, 0 0 4px #000, 0 0 4px #000, 0 0 4px #000' : '1.5px 1.5px 2.5px #000'
              }}
            >
              {activeCueText2}
            </span>
          )}
        </div>
      )}



      {/* === AD OVERLAY === */}
      {isShowingAd && (
        <div className="absolute inset-0 z-40 pointer-events-none">
          {/* Clickable ad area (opens ad link) */}
          <div
            className="absolute inset-0 pointer-events-auto cursor-pointer"
            onClick={handleAdClick}
          />

          {/* Top-left: AD label with counter */}
          <div className="absolute top-3 left-3 sm:top-4 sm:left-4 pointer-events-none">
            <span className="inline-flex items-center gap-1.5 bg-black/70 backdrop-blur-sm text-white/80 text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-full tracking-wider border border-white/10">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" /></svg>
              QUẢNG CÁO {totalAds > 1 ? `${currentAdNum}/${totalAds}` : ''}
            </span>
          </div>

          {/* Bottom-right: skip button or countdown */}
          <div className="absolute bottom-4 right-3 sm:bottom-6 sm:right-5 pointer-events-auto flex items-center gap-2">
            {adCanSkip ? (
              <button
                onClick={(e) => { e.stopPropagation(); handleSkipAd(); }}
                className="flex items-center gap-2 bg-white/90 hover:bg-white active:scale-95 text-black text-[12px] sm:text-[14px] font-bold px-4 py-2 sm:py-2.5 rounded-full shadow-xl transition-all duration-150"
              >
                Bỏ qua quảng cáo
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M21 4v16" /><path d="M6.029 4.285A2 2 0 0 0 3 6v12a2 2 0 0 0 3.029 1.715l9.997-5.998a2 2 0 0 0 .003-3.432z" /></svg>
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-black/75 backdrop-blur-sm text-white text-[12px] sm:text-[13px] font-semibold px-4 py-2 sm:py-2.5 rounded-full border border-white/10 shadow-xl">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-white/60"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                Bỏ qua sau {adTimeRemaining}s
              </div>
            )}
          </div>
        </div>
      )}

      {/* Center Play/Pause Indicator (only when NOT showing ad) */}
      {!isShowingAd && (
        <div
          className={`absolute inset-0 flex items-center justify-center z-30 transition-all duration-500 pointer-events-none 
            ${centerVisible 
              ? 'opacity-100 scale-100' 
              : showControls 
                ? 'opacity-100 scale-100 sm:opacity-0 sm:scale-125' 
                : 'opacity-0 scale-125'}
          `}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              // Create ripple effect element
              const btn = e.currentTarget;
              const ripple = document.createElement('span');
              const rect = btn.getBoundingClientRect();
              const size = Math.max(rect.width, rect.height);
              ripple.style.width = ripple.style.height = `${size}px`;
              ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
              ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
              ripple.className = 'absolute bg-white/30 rounded-full animate-ping pointer-events-none';
              btn.appendChild(ripple);
              setTimeout(() => ripple.remove(), 500);

              togglePlay();
            }}
            className="relative overflow-hidden w-[60px] h-[60px] sm:w-[72px] sm:h-[72px] rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center shadow-xl transition-transform hover:scale-105 pointer-events-auto border border-white/10"
          >
            {isPlaying ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white" stroke="currentColor" strokeWidth="0" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 sm:w-9 sm:h-9 text-white"><rect x="6" y="4" width="4" height="16" rx="1"></rect><rect x="14" y="4" width="4" height="16" rx="1"></rect></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white" stroke="currentColor" strokeWidth="0" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 sm:w-9 sm:h-9 text-white ml-1"><path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"></path></svg>
            )}
          </button>
        </div>
      )}

      {/* Left/Right Seek Indicators (YouTube Style) */}
      {showLeftSeek && (
        <div className="absolute left-0 top-0 bottom-0 w-1/3 flex items-center justify-center pointer-events-none z-45 overflow-hidden animate-seek-left">
          <style>{`
            @keyframes rippleSeekLeft {
              0% { opacity: 0; background: radial-gradient(circle at 30% 50%, rgba(255,255,255,0.12) 0%, transparent 80%); }
              40% { opacity: 1; background: radial-gradient(circle at 30% 50%, rgba(255,255,255,0.16) 40%, transparent 85%); }
              100% { opacity: 0; background: radial-gradient(circle at 30% 50%, rgba(255,255,255,0.02) 80%, transparent 90%); }
            }
            @keyframes arrowBounceLeft {
              0%, 100% { transform: translateX(0); opacity: 0.4; }
              50% { transform: translateX(-8px); opacity: 1; }
            }
            .animate-seek-left {
              animation: rippleSeekLeft 0.65s cubic-bezier(0.25, 1, 0.5, 1) forwards;
              border-radius: 0 100% 100% 0 / 0 50% 50% 0;
            }
            .animate-arrow-left {
              animation: arrowBounceLeft 0.55s infinite ease-in-out;
            }
          `}</style>
          <div className="flex flex-col items-center gap-1.5 text-white/90 drop-shadow-md mr-12">
            <div className="flex items-center gap-0.5 animate-arrow-left">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 rotate-180"><path d="M8 5v14l11-7z" /></svg>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 rotate-180 -ml-3.5"><path d="M8 5v14l11-7z" /></svg>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 rotate-180 -ml-3.5"><path d="M8 5v14l11-7z" /></svg>
            </div>
            <span className="text-[11px] sm:text-xs font-black tracking-wider uppercase">{lastSeekAmount} giây</span>
          </div>
        </div>
      )}

      {showRightSeek && (
        <div className="absolute right-0 top-0 bottom-0 w-1/3 flex items-center justify-center pointer-events-none z-45 overflow-hidden animate-seek-right">
          <style>{`
            @keyframes rippleSeekRight {
              0% { opacity: 0; background: radial-gradient(circle at 70% 50%, rgba(255,255,255,0.12) 0%, transparent 80%); }
              40% { opacity: 1; background: radial-gradient(circle at 70% 50%, rgba(255,255,255,0.16) 40%, transparent 85%); }
              100% { opacity: 0; background: radial-gradient(circle at 70% 50%, rgba(255,255,255,0.02) 80%, transparent 90%); }
            }
            @keyframes arrowBounceRight {
              0%, 100% { transform: translateX(0); opacity: 0.4; }
              50% { transform: translateX(8px); opacity: 1; }
            }
            .animate-seek-right {
              animation: rippleSeekRight 0.65s cubic-bezier(0.25, 1, 0.5, 1) forwards;
              border-radius: 100% 0 0 100% / 50% 0 0 50%;
            }
            .animate-arrow-right {
              animation: arrowBounceRight 0.55s infinite ease-in-out;
            }
          `}</style>
          <div className="flex flex-col items-center gap-1.5 text-white/90 drop-shadow-md ml-12">
            <div className="flex items-center gap-0.5 animate-arrow-right">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M8 5v14l11-7z" /></svg>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 -ml-3.5"><path d="M8 5v14l11-7z" /></svg>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 -ml-3.5"><path d="M8 5v14l11-7z" /></svg>
            </div>
            <span className="text-[11px] sm:text-xs font-black tracking-wider uppercase">{lastSeekAmount} giây</span>
          </div>
        </div>
      )}





      {/* Skip Intro Button (only when NOT showing ad) */}
      {!isShowingAd && isIntro && (
        <div className="absolute bottom-16 sm:bottom-28 right-2 sm:right-6 z-[35] pointer-events-auto transition-opacity duration-300 opacity-100">
          <button onClick={(e) => { e.stopPropagation(); skipIntro(); }} className="flex items-center gap-2 pl-4 pr-3 py-2 sm:py-3 rounded-full sm:rounded-[4px] bg-white/90 hover:bg-white text-[#1a1a1a] text-[12px] sm:text-[15px] font-semibold tracking-wide transition-all duration-150 shadow-lg">
            <span>Bỏ qua giới thiệu</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M21 4v16"></path><path d="M6.029 4.285A2 2 0 0 0 3 6v12a2 2 0 0 0 3.029 1.715l9.997-5.998a2 2 0 0 0 .003-3.432z"></path></svg>
          </button>
        </div>
      )}

      {/* Top Bar (hidden during ad) */}
      <div className={`absolute top-0 left-0 right-0 p-3 sm:p-6 bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-500 pointer-events-none z-10 flex items-start justify-between ${!isShowingAd && showControls ? 'opacity-100' : 'opacity-0'}`}>
        <h2 className="text-white font-medium text-sm sm:text-lg lg:text-xl drop-shadow-md truncate tracking-wide flex-1 mr-4">
          {movieTitle} {episodeName ? `- ${episodeName.toLowerCase().startsWith('tập') ? '' : 'Tập '}${episodeName}` : ''}
        </h2>
        <button onClick={(e) => { e.stopPropagation(); setShowEpisodes(true); setShowControls(false); }} className="pointer-events-auto hidden sm:flex flex-row items-center gap-1.5 text-white/90 hover:text-[#eab308] p-1 text-xs sm:text-[15px] font-medium transition-colors">
          <svg viewBox="0 0 32 32" className="w-4 h-4 sm:w-5 sm:h-5 text-current"><g><path fill="currentColor" d="m27 10h-22a3 3 0 0 0 -3 3v14a3 3 0 0 0 3 3h22a3 3 0 0 0 3-3v-14a3 3 0 0 0 -3-3zm1 17a1 1 0 0 1 -1 1h-22a1 1 0 0 1 -1-1v-14a1 1 0 0 1 1-1h22a1 1 0 0 1 1 1zm-7.55-7.89-8-4a1 1 0 0 0 -1.45.89v8a1 1 0 0 0 .47.85 1 1 0 0 0 .53.15 1 1 0 0 0 .45-.11l8-4a1 1 0 0 0 0-1.78zm-7.45 3.27v-4.76l4.76 2.38zm-6-19.38a1 1 0 0 1 1-1h16a1 1 0 0 1 0 2h-16a1 1 0 0 1 -1-1zm-3 4a1 1 0 0 1 1-1h22a1 1 0 0 1 0 2h-22a1 1 0 0 1 -1-1z"></path></g></svg>
          <span className="hidden sm:inline">Danh sách tập</span>
        </button>
      </div>

      {/* Slide-out Episode List */}
      <div className={`absolute inset-0 right-0 z-50 flex justify-end transition-all duration-300 ease-in-out bg-transparent ${showEpisodes ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        <div className={`w-full sm:w-[350px] max-w-full h-full bg-[#1a1b20] border-l border-white/5 shadow-2xl flex flex-col transition-transform duration-300 ease-out transform ${showEpisodes ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex items-center justify-between p-3 sm:px-4 sm:py-3.5 border-b border-white/5">
            <h3 className="text-white font-bold text-[15px] leading-tight line-clamp-1 pr-4">{movieTitle}</h3>
            <button onClick={() => setShowEpisodes(false)} className="w-7 h-7 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-0 flex flex-col content-start">
            {episodes.map((ep: any, index: number) => {
              const epData = ep.data;
              const isCurrent = epData.name === episodeName;
              return (
                <Link key={epData.id} href={`/xem/${movieSlug || movieId}?ep=${epData.id}`} onClick={() => setShowEpisodes(false)} className={`flex items-center gap-3.5 p-3 sm:px-4 sm:py-3 border-b border-white/5 transition-colors outline-none text-left cursor-pointer ${isCurrent ? 'bg-white/10' : 'bg-transparent hover:bg-white/5'}`}>
                  <div className={`relative w-[90px] sm:w-[100px] aspect-[16/9] rounded shrink-0 overflow-hidden bg-black/50 ${isCurrent ? 'ring-2 ring-[#eab308] ring-offset-[2px] ring-offset-[#1f2025]' : ''}`}>
                    <img alt={epData.name} className="w-full h-full object-cover" src={posterUrl} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${isCurrent ? 'text-[#eab308]' : 'text-white/90'}`}>
                      {epData.name.toLowerCase().startsWith('tập') ? '' : 'Tập '}{epData.name} {ep.edition ? `(${ep.edition})` : ''}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Control Bar (hidden + disabled during ad) */}
      <div className={`absolute bottom-0 left-0 right-0 pt-10 sm:pt-20 pb-2 sm:pb-4 px-3 sm:px-6 bg-gradient-to-t from-black/90 via-black/40 to-transparent transition-all duration-300 ease-out transform z-20 ${!isShowingAd && showControls ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-4 opacity-0 pointer-events-none'}`}>
        <div className="max-w-screen-2xl mx-auto flex flex-col gap-1 sm:gap-4">

          {/* Timeline */}
          <div className="flex items-center gap-2 sm:gap-3 w-full">
            <span className="text-white font-medium text-[11px] sm:text-[13px] tabular-nums">{formatTime(progress)}</span>
            <div className={`flex-1 group/scrub relative flex flex-col justify-center h-7 ${canSeek ? 'cursor-pointer' : 'cursor-not-allowed'}`} onMouseDown={(e) => canSeek && setIsScrubbing(true)} onMouseUp={(e) => canSeek && setIsScrubbing(false)} onMouseLeave={(e) => canSeek && setIsScrubbing(false)}>
              <div className="relative w-full h-[6px] rounded-sm bg-white/15 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] transition-all duration-200 group-hover/scrub:h-2">
                <div className="absolute top-0 left-0 h-full rounded-sm bg-white/10" style={{ width: '100%' }}></div>
                <div className="absolute top-0 left-0 h-full min-w-[2px] rounded-sm bg-[#FFD166] transition-none after:absolute after:right-0 after:top-1/2 after:h-2 after:w-4 after:-translate-y-1/2 after:translate-x-1/2 after:rounded-[3px] after:bg-white after:transition-all after:content-[''] group-hover/scrub:after:h-2.5 group-hover/scrub:after:w-5" style={{ width: `${progressPercent}%` }}></div>
              </div>
              <input min="0" max={duration || 100} step="0.1" disabled={!canSeek} className={`absolute inset-0 w-full h-full opacity-0 ${canSeek ? 'cursor-pointer' : 'cursor-not-allowed'}`} type="range" value={progress} onChange={handleProgressChange} />
            </div>
            <span className="text-white font-medium text-[11px] sm:text-[13px] tabular-nums">{formatTime(duration)}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-7">
              <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} disabled={!canTogglePlay} className={`text-white hover:text-white/80 transition-all focus:outline-none flex h-10 w-10 sm:h-auto sm:w-auto items-center justify-center ${canTogglePlay ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
                {isPlaying ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white" stroke="currentColor" strokeWidth="0" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 sm:w-9 sm:h-9"><rect width="4" height="16" x="6" y="4"></rect><rect width="4" height="16" x="14" y="4"></rect></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white" stroke="currentColor" strokeWidth="0" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 sm:w-9 sm:h-9"><path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"></path></svg>
                )}
              </button>

              {canSeek && (
                <div className="flex items-center gap-1 sm:gap-6">
                  <button onClick={(e) => { e.stopPropagation(); skipBackward(); }} className="text-white hover:text-white/80 transition-all focus:outline-none h-10 w-10 sm:h-auto sm:w-auto flex items-center justify-center" aria-label="Tua lui 10 giay">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 sm:w-7 sm:h-7"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); skipForward(); }} className="text-white hover:text-white/80 transition-all focus:outline-none h-10 w-10 sm:h-auto sm:w-auto flex items-center justify-center" aria-label="Tua toi 10 giay">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 sm:w-7 sm:h-7"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path></svg>
                  </button>
                </div>
              )}

              <div className="hidden sm:flex items-center gap-2 group/volume">
                <button onClick={(e) => { e.stopPropagation(); toggleMute(); }} className="text-white hover:text-white/80 transition-all focus:outline-none flex items-center justify-center">
                  {isMuted || volume === 0 ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" x2="17" y1="9" y2="15"></line><line x1="17" x2="23" y1="9" y2="15"></line></svg>
                  ) : volume < 0.5 ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7"><path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"></path><path d="M16 9a5 5 0 0 1 0 6"></path><path d="M19.364 18.364a9 9 0 0 0 0-12.728"></path></svg>
                  )}
                </button>
                <div className={`overflow-hidden transition-all duration-300 ease-out flex items-center h-5 ${isVolumeAdjusting ? 'w-24' : 'w-0 group-hover/volume:w-24'}`}>
                  <div className="relative w-20 h-1 bg-white/30 rounded-full flex items-center">
                    <div className="absolute h-full bg-white rounded-full pointer-events-none" style={{ width: `${volume * 100}%` }}></div>
                    <div className="absolute w-3 h-3 bg-white rounded-full pointer-events-none" style={{ left: `calc(${volume * 100}% - 6px)` }}></div>
                    <input min="0" max="1" step="0.05" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" type="range" value={volume} onChange={handleVolumeChange} />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-6 relative">
              <div className="flex items-center border-r border-white/20 pr-1.5 sm:pr-6 mr-0.5 sm:mr-2">
                <button onClick={(e) => { e.stopPropagation(); if (onNext) onNext(); }} className="text-white hover:text-[#FFD166] transition-all focus:outline-none flex h-9 w-9 sm:h-auto sm:w-auto items-center justify-center" title="Tập kế tiếp (N)">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 sm:w-7 sm:h-7"><path d="M21 4v16"></path><path d="M6.029 4.285A2 2 0 0 0 3 6v12a2 2 0 0 0 3.029 1.715l9.997-5.998a2 2 0 0 0 .003-3.432z"></path></svg>
                </button>
              </div>

              {/* Edition switcher mic button — hiện khi có ≥2 bản chiếu cùng server */}
              {editions.length >= 2 && onEditionChange && (
                <div className="relative flex items-center justify-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowEditionPicker(prev => !prev);
                      setShowSettings(false);
                    }}
                    className="text-white hover:text-white/80 transition-all focus:outline-none flex h-9 w-9 sm:h-auto sm:w-auto items-center justify-center relative"
                    title="Nguồn âm thanh"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 sm:w-7 sm:h-7" aria-hidden="true">
                      <path d="M12 19v3"></path>
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                      <rect x="9" y="2" width="6" height="13" rx="3"></rect>
                    </svg>
                    {(() => {
                      const name = editions.find(ed => ed.editionKey === currentEditionKey)?.editionName || '';
                      const short = name.replace(/vietsub/i, 'VS').replace(/thuyết minh/i, 'TM').replace(/lồng tiếng/i, 'LT').substring(0, 4);
                      return (
                        <div className="absolute -top-1.5 -right-3 bg-white text-black text-[9px] font-bold px-1 rounded-sm shadow-sm pointer-events-none leading-tight">
                          {short}
                        </div>
                      );
                    })()}
                  </button>

                  {/* Edition picker dropdown */}
                  {showEditionPicker && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute bottom-full right-0 mb-3 sm:mb-5 w-[calc(100vw-1.5rem)] max-w-44 sm:w-52 sm:max-w-none max-h-[42vh] bg-[#1c1c1e] text-white rounded-lg sm:rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200"
                    >
                      <div className="px-3.5 py-2 sm:px-5 sm:py-3 font-semibold text-[13px] sm:text-[15px] border-b border-white/10 shrink-0">Nguồn âm thanh</div>
                      <div className="overflow-y-auto">
                        {editions.map(ed => {
                          const isActive = ed.editionKey === currentEditionKey;
                          return (
                            <button
                              key={ed.editionKey}
                              onClick={() => {
                                setShowEditionPicker(false);
                                if (!isActive) onEditionChange(ed.editionKey, ed.episodeId);
                              }}
                              className="w-full px-3.5 py-2 sm:px-5 sm:py-3 hover:bg-white/10 flex items-center gap-2.5 sm:gap-3 transition-colors text-[12px] sm:text-sm text-left"
                            >
                              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? 'bg-white' : 'bg-transparent border border-white/40'}`}></div>
                              <span className={`min-w-0 truncate ${isActive ? 'font-medium text-white' : 'text-white/80'}`}>
                                {ed.editionName}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <button onClick={(e) => { e.stopPropagation(); togglePiP(); }} className="hidden sm:flex text-white hover:text-white/80 transition-all focus:outline-none items-center justify-center" title="Picture in Picture">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7"><path d="M21 9V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10c0 1.1.9 2 2 2h4"></path><rect width="10" height="7" x="12" y="13" rx="2"></rect></svg>
              </button>

              {/* Subtitles shortcut button */}
              {subtitles.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSettings(!showSettings || settingsPage !== 'subtitle');
                    setSettingsPage('subtitle');
                    setShowEditionPicker(false);
                  }}
                  className={`transition-colors hover:text-[#FFD166] focus:outline-none flex h-9 w-9 sm:h-auto sm:w-auto items-center justify-center cursor-pointer ${showSettings && settingsPage === 'subtitle' ? 'text-[#FFD166]' : 'text-white'}`}
                  title="Cài đặt phụ đề"
                >
                  <svg className="w-5 h-5 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" xmlns="http://www.w3.org/2000/svg">
                    <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M7 10h2v2H7v-2zm0 4h2v2H7v-2zm4-4h6v2h-6v-2zm0 4h6v2h-6v-2z" fill="currentColor" />
                  </svg>
                </button>
              )}

              {/* Settings Toggle and Popup */}
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowSettings(!showSettings); setSettingsPage('menu'); }}
                  className="text-white hover:text-white/80 transition-all focus:outline-none flex h-9 w-9 sm:h-auto sm:w-auto items-center justify-center relative"
                  title="Cài đặt"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`w-5 h-5 sm:w-7 sm:h-7 transition-transform duration-300 ${showSettings ? 'rotate-45' : ''}`}><path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"></path><circle cx="12" cy="12" r="3"></circle></svg>
                </button>

                {showSettings && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute bottom-full right-0 mb-3 sm:mb-5 w-[calc(100vw-1.5rem)] max-w-64 sm:w-64 sm:max-w-none max-h-[52vh] bg-[#1c1c1e] text-white rounded-lg sm:rounded-xl shadow-2xl z-50 flex flex-col overflow-y-auto animate-in fade-in slide-in-from-bottom-2 duration-200"
                  >
                    <div className="py-1 sm:py-2">
                      {settingsPage === 'menu' && (
                        <>
                          <div className="px-3.5 py-2 sm:px-5 sm:py-3 font-semibold text-[13px] sm:text-[15px] border-b border-white/5">Cài đặt</div>
                          <div className="flex flex-col">
                            <button
                              onClick={() => setSettingsPage('quality')}
                              className="px-3.5 py-2 sm:px-5 sm:py-3 hover:bg-white/10 flex items-center justify-between gap-3 transition-colors text-left"
                            >
                              <span className="text-[12px] sm:text-sm font-medium text-white/90">Chất lượng</span>
                              <div className="flex min-w-0 items-center text-white/60 text-[12px] sm:text-sm gap-1">
                                <span className="truncate">{currentQuality === -1 ? 'Tự động' : qualityLevels.find(q => q.id === currentQuality)?.name || 'Tự động'}</span>
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right w-4 h-4"><path d="m9 18 6-6-6-6"></path></svg>
                              </div>
                            </button>
                            <button
                              onClick={() => setSettingsPage('speed')}
                              className="px-3.5 py-2 sm:px-5 sm:py-3 hover:bg-white/10 flex items-center justify-between gap-3 transition-colors text-left"
                            >
                              <span className="text-[12px] sm:text-sm font-medium text-white/90">Tốc độ phát</span>
                              <div className="flex min-w-0 items-center text-white/60 text-[12px] sm:text-sm gap-1">
                                <span className="truncate">{playbackSpeed === 1.0 ? 'Thường' : `${playbackSpeed}x`}</span>
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right w-4 h-4"><path d="m9 18 6-6-6-6"></path></svg>
                              </div>
                            </button>
                            <button
                              onClick={() => setSettingsPage('aspect')}
                              className="px-3.5 py-2 sm:px-5 sm:py-3 hover:bg-white/10 flex items-center justify-between gap-3 transition-colors text-left"
                            >
                              <span className="text-[12px] sm:text-sm font-medium text-white/90">Tỷ lệ khung hình</span>
                              <div className="flex min-w-0 items-center text-white/60 text-[12px] sm:text-sm gap-1">
                                <span className="truncate">{aspectRatio === 'contain' ? 'Mặc định (Fit)' : aspectRatio === 'cover' ? 'Tràn viền (Zoom)' : 'Giãn (Stretch)'}</span>
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right w-4 h-4"><path d="m9 18 6-6-6-6"></path></svg>
                              </div>
                            </button>
                            {subtitles.length > 0 && (
                              <button
                                onClick={() => setSettingsPage('subtitle')}
                                className="px-3.5 py-2 sm:px-5 sm:py-3 hover:bg-white/10 flex items-center justify-between gap-3 transition-colors text-left"
                              >
                                <span className="text-[12px] sm:text-sm font-medium text-white/90">Phụ đề</span>
                                <div className="flex min-w-0 items-center text-white/60 text-[12px] sm:text-sm gap-1">
                                  <span className="truncate">{subtitleMode === 'off' ? 'Tắt' : subtitleMode === 'dual' ? 'Song ngữ' : subtitles[selectedSubIndex]?.label || 'Bật'}</span>
                                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right w-4 h-4"><path d="m9 18 6-6-6-6"></path></svg>
                                </div>
                              </button>
                            )}
                          </div>
                        </>
                      )}

                      {settingsPage === 'quality' && (
                        <>
                          <div className="flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 border-b border-white/5">
                            <button onClick={() => setSettingsPage('menu')} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="m15 18-6-6 6-6"></path></svg>
                            </button>
                            <span className="font-semibold text-[13px] sm:text-[15px]">Chất lượng</span>
                          </div>
                          <div className="flex flex-col py-1">
                            <button
                              onClick={() => { changeQuality(-1); setShowSettings(false); }}
                              className="px-3.5 py-2.5 sm:px-5 sm:py-3 hover:bg-white/10 flex items-center justify-between gap-3 transition-colors text-left"
                            >
                              <span className={`text-[12px] sm:text-sm font-medium ${currentQuality === -1 ? 'text-[#FFD166]' : 'text-white/90'}`}>Tự động</span>
                              {currentQuality === -1 && <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-[#FFD166]"><path d="M20 6 9 17l-5-5"></path></svg>}
                            </button>
                            {qualityLevels.map((lvl) => (
                              <button
                                key={lvl.id}
                                onClick={() => { changeQuality(lvl.id); setShowSettings(false); }}
                                className="px-3.5 py-2.5 sm:px-5 sm:py-3 hover:bg-white/10 flex items-center justify-between gap-3 transition-colors text-left"
                              >
                                <span className={`text-[12px] sm:text-sm font-medium ${currentQuality === lvl.id ? 'text-[#FFD166]' : 'text-white/90'}`}>{lvl.name}</span>
                                {currentQuality === lvl.id && <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-[#FFD166]"><path d="M20 6 9 17l-5-5"></path></svg>}
                              </button>
                            ))}
                          </div>
                        </>
                      )}

                      {settingsPage === 'speed' && (
                        <>
                          <div className="flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 border-b border-white/5">
                            <button onClick={() => setSettingsPage('menu')} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="m15 18-6-6 6-6"></path></svg>
                            </button>
                            <span className="font-semibold text-[13px] sm:text-[15px]">Tốc độ phát</span>
                          </div>
                          <div className="p-4 sm:p-5 flex flex-col items-center">
                            <div className="text-3xl font-bold text-white mb-6">
                              {playbackSpeed.toFixed(2)}x
                            </div>
                            
                            <div className="flex items-center w-full gap-3 mb-8">
                              <button 
                                onClick={() => changePlaybackSpeed(Math.max(0.25, playbackSpeed - 0.25))}
                                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center shrink-0 transition-colors"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M5 12h14"></path></svg>
                              </button>
                              
                              <div className="flex-1 relative flex items-center">
                                <input 
                                  type="range" 
                                  min="0.25" 
                                  max="2.0" 
                                  step="0.25" 
                                  value={playbackSpeed}
                                  onChange={(e) => changePlaybackSpeed(parseFloat(e.target.value))}
                                  className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
                                  style={{
                                    background: `linear-gradient(to right, white ${((playbackSpeed - 0.25) / (2.0 - 0.25)) * 100}%, rgba(255,255,255,0.2) ${((playbackSpeed - 0.25) / (2.0 - 0.25)) * 100}%)`
                                  }}
                                />
                              </div>

                              <button 
                                onClick={() => changePlaybackSpeed(Math.min(2.0, playbackSpeed + 0.25))}
                                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center shrink-0 transition-colors"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>
                              </button>
                            </div>

                            <div className="flex gap-2 w-full justify-center">
                              {[1.0, 1.25, 1.5, 2.0].map((speed) => (
                                <button
                                  key={speed}
                                  onClick={() => changePlaybackSpeed(speed)}
                                  className={`flex-1 py-2 sm:py-2.5 rounded-full text-sm font-medium transition-colors ${
                                    playbackSpeed === speed 
                                      ? 'bg-white/20 text-white' 
                                      : 'bg-white/5 text-white/70 hover:bg-white/15'
                                  }`}
                                >
                                  {speed.toFixed(1)}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}

                      {settingsPage === 'aspect' && (
                        <>
                          <div className="flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 border-b border-white/5">
                            <button onClick={() => setSettingsPage('menu')} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="m15 18-6-6 6-6"></path></svg>
                            </button>
                            <span className="font-semibold text-[13px] sm:text-[15px]">Tỷ lệ khung hình</span>
                          </div>
                          <div className="flex flex-col py-1">
                            {([
                              { val: 'contain', label: 'Mặc định (Fit)' },
                              { val: 'cover', label: 'Tràn viền (Zoom)' },
                              { val: 'fill', label: 'Giãn hình (Stretch)' }
                            ] as const).map((opt) => (
                              <button
                                key={opt.val}
                                onClick={() => { setAspectRatio(opt.val); setShowSettings(false); }}
                                className="px-3.5 py-2.5 sm:px-5 sm:py-3 hover:bg-white/10 flex items-center justify-between gap-3 transition-colors text-left"
                              >
                                <span className={`text-[12px] sm:text-sm font-medium ${aspectRatio === opt.val ? 'text-[#FFD166]' : 'text-white/90'}`}>{opt.label}</span>
                                {aspectRatio === opt.val && <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-[#FFD166]"><path d="M20 6 9 17l-5-5"></path></svg>}
                              </button>
                            ))}
                          </div>
                        </>
                      )}

                      {settingsPage === 'subtitle' && (
                        <>
                          <div className="flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 border-b border-white/5">
                            <button onClick={() => setSettingsPage('menu')} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="m15 18-6-6 6-6"></path></svg>
                            </button>
                            <span className="font-semibold text-[13px] sm:text-[15px]">Phụ đề</span>
                            <button onClick={() => setSettingsPage('substyle')} className="ml-auto p-1 hover:bg-white/10 rounded-full transition-colors" title="Kiểu chữ">
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-[#FFD166]"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>
                            </button>
                          </div>
                          <div className="flex flex-col py-1 max-h-[300px] overflow-y-auto">
                            {/* Mode toggle */}
                            <div className="flex p-2 bg-white/5 border-b border-white/5 gap-1 shrink-0">
                              <button
                                onClick={() => { changeSubtitleMode('on'); if (selectedSubIndex === -1 && subtitles.length > 0) changeSelectedSubIndex(0); }}
                                className={`flex-1 py-1 rounded text-xs font-bold transition-all ${subtitleMode === 'on' ? 'bg-white text-black' : 'text-white/70 hover:text-white'}`}
                              >
                                Bật
                              </button>
                              <button
                                onClick={() => { changeSubtitleMode('dual'); if (selectedSubIndex === -1 && subtitles.length > 0) changeSelectedSubIndex(0); if (selectedSubIndex2 === -1 && subtitles.length > 1) changeSelectedSubIndex2(1); }}
                                className={`flex-1 py-1 rounded text-xs font-bold transition-all ${subtitleMode === 'dual' ? 'bg-white text-black' : 'text-white/70 hover:text-white'}`}
                              >
                                Song ngữ
                              </button>
                              <button
                                onClick={() => changeSubtitleMode('off')}
                                className={`flex-1 py-1 rounded text-xs font-bold transition-all ${subtitleMode === 'off' ? 'bg-white text-black' : 'text-white/70 hover:text-white'}`}
                              >
                                Tắt
                              </button>
                            </div>

                            {/* Subtitle selection lists */}
                            {subtitleMode !== 'off' && (
                              <div className="p-2 space-y-3">
                                <div>
                                  <div className="text-[10px] font-bold text-white/40 mb-1">Phụ đề 1 (Chính)</div>
                                  <div className="flex flex-col bg-black/25 rounded-md border border-white/5 overflow-hidden">
                                    {subtitles.map((sub, idx) => (
                                      <button
                                        key={idx}
                                        onClick={() => { changeSelectedSubIndex(idx); if (selectedSubIndex2 === idx) changeSelectedSubIndex2(selectedSubIndex); }}
                                        className={`w-full px-3 py-2 text-left text-xs font-semibold flex items-center justify-between ${selectedSubIndex === idx ? 'text-[#FFD166] bg-white/5' : 'text-white/80 hover:bg-white/5'}`}
                                      >
                                        <span>{sub.label}</span>
                                        {selectedSubIndex === idx && <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M20 6 9 17l-5-5"></path></svg>}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {subtitleMode === 'dual' && (
                                  <div>
                                    <div className="text-[10px] font-bold text-white/40 mb-1">Phụ đề 2 (Song ngữ)</div>
                                    <div className="flex flex-col bg-black/25 rounded-md border border-white/5 overflow-hidden">
                                      {subtitles.map((sub, idx) => {
                                        const isSame = selectedSubIndex === idx;
                                        return (
                                          <button
                                            key={idx}
                                            disabled={isSame}
                                            onClick={() => changeSelectedSubIndex2(idx)}
                                            className={`w-full px-3 py-2 text-left text-xs font-semibold flex items-center justify-between ${isSame ? 'text-white/20 cursor-not-allowed' : selectedSubIndex2 === idx ? 'text-[#FFD166] bg-white/5' : 'text-white/80 hover:bg-white/5'}`}
                                          >
                                            <span>{sub.label}</span>
                                            {selectedSubIndex2 === idx && !isSame && <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M20 6 9 17l-5-5"></path></svg>}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </>
                      )}

                      {settingsPage === 'substyle' && (
                        <>
                          <div className="flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 border-b border-white/5">
                            <button onClick={() => setSettingsPage('subtitle')} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="m15 18-6-6 6-6"></path></svg>
                            </button>
                            <span className="font-semibold text-[13px] sm:text-[15px]">Kiểu chữ phụ đề</span>
                          </div>
                          
                          <div className="p-3 space-y-4 max-h-[300px] overflow-y-auto text-left text-xs">
                            {/* Tab selection for dual mode */}
                            {subtitleMode === 'dual' && (
                              <div className="flex rounded bg-white/5 p-0.5">
                                <button
                                  onClick={() => setActiveTab('primary')}
                                  className={`flex-1 py-1 rounded text-xs font-semibold ${activeTab === 'primary' ? 'bg-white text-black' : 'text-white/60 hover:text-white'}`}
                                >
                                  Chính
                                </button>
                                <button
                                  onClick={() => setActiveTab('secondary')}
                                  className={`flex-1 py-1 rounded text-xs font-semibold ${activeTab === 'secondary' ? 'bg-white text-black' : 'text-white/60 hover:text-white'}`}
                                >
                                  Song ngữ
                                </button>
                              </div>
                            )}

                            {/* Color settings */}
                            <div>
                              <span className="block text-white/50 mb-1">Màu chữ</span>
                              <div className="flex gap-2">
                                {[
                                  { code: '#ffffff', title: 'Trắng' },
                                  { code: '#FFE86B', title: 'Vàng' },
                                  { code: '#4ade80', title: 'Xanh lá' },
                                  { code: '#22d3ee', title: 'Xanh dương' }
                                ].map((c) => {
                                  const isCurrent = activeTab === 'primary' ? subColor === c.code : subColor2 === c.code;
                                  return (
                                    <button
                                      key={c.code}
                                      onClick={() => activeTab === 'primary' ? changeSubColor(c.code) : changeSubColor2(c.code)}
                                      className={`relative h-6 w-6 rounded-full border border-white/10 ${isCurrent ? 'ring-2 ring-[#FFD166] ring-offset-2 ring-offset-[#1c1c1e]' : ''}`}
                                      title={c.title}
                                      style={{ backgroundColor: c.code }}
                                    />
                                  );
                                })}
                              </div>
                            </div>

                            {/* Font family settings */}
                            <div>
                              <span className="block text-white/50 mb-1">Phông chữ</span>
                              <select 
                                value={subFont}
                                onChange={(e) => changeSubFont(e.target.value)}
                                className="w-full h-8 rounded border border-white/10 bg-[#252529] px-2 text-xs font-semibold text-white outline-none focus:border-white/30 cursor-pointer"
                              >
                                <option value="sans-serif">Mặc định</option>
                                <option value="Montserrat">Montserrat (Đậm Hiện đại)</option>
                                <option value="Lexend">Lexend (Dễ đọc cực nét)</option>
                                <option value="Playfair Display">Playfair Display (Serif Đậm có chân)</option>
                                <option value="Oswald">Oswald (Rộng Hẹp Đậm)</option>
                                <option value="Inter">Roboto / Inter</option>
                                <option value="Arial">Arial</option>
                                <option value="Courier New">Courier New (Monospace)</option>
                                <option value="Georgia">Georgia (Chữ có chân)</option>
                              </select>
                            </div>

                            {/* Font size settings */}
                            <div>
                              <span className="flex items-center justify-between text-white/50 mb-1">
                                <span>Cỡ chữ</span>
                                <span className="text-white/80 font-mono">{activeTab === 'primary' ? subFontSize : subFontSize2}px</span>
                              </span>
                              <input
                                type="range"
                                min="16" max="36" step="1"
                                value={activeTab === 'primary' ? subFontSize : subFontSize2}
                                onChange={(e) => activeTab === 'primary' ? changeSubFontSize(Number(e.target.value)) : changeSubFontSize2(Number(e.target.value))}
                                className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#FFD166]"
                              />
                            </div>

                            {/* Background styling settings */}
                            <div>
                              <span className="block text-white/50 mb-1.5">Nền chữ</span>
                              <div className="flex gap-1.5">
                                {[
                                  { key: 'none', label: 'Không' },
                                  { key: 'outline', label: 'Mờ' },
                                  { key: 'tint', label: 'Xám' },
                                  { key: 'solid', label: 'Đen' }
                                ].map((bg) => (
                                  <button
                                    key={bg.key}
                                    onClick={() => changeSubBgStyle(bg.key)}
                                    className={`flex-1 py-1 rounded border transition-all text-[10px] font-bold ${subBgStyle === bg.key ? 'bg-white text-black border-white' : 'bg-transparent text-white/70 border-white/10 hover:border-white/30'}`}
                                  >
                                    {bg.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Position settings */}
                            <div>
                              <span className="flex items-center justify-between text-white/50 mb-1">
                                <span>Vị trí</span>
                                <span className="text-white/80">{subPosition === 'bottom' ? 'Dưới' : 'Trên'}</span>
                              </span>
                              <button
                                    onClick={() => changeSubPosition(subPosition === 'bottom' ? 'top' : 'bottom')}
                                    className="w-full py-1 rounded border border-white/10 bg-white/5 text-white text-xs font-semibold hover:bg-white/10 transition-colors"
                                  >
                                Đổi vị trí phụ đề
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {isCastAvailable && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleCast(); }}
                  className="text-white hover:text-[#FFD166] transition-all focus:outline-none flex h-9 w-9 sm:h-auto sm:w-auto items-center justify-center"
                  title="Truyền lên TV"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 sm:w-7 sm:h-7">
                    <path d="M2 16.1A5 5 0 0 1 5.9 20M2 12.05A9 9 0 0 1 9.95 20M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6" />
                    <line x1="2" y1="20" x2="2.01" y2="20" strokeWidth="3" />
                  </svg>
                </button>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onToggleShortcuts) onToggleShortcuts();
                }}
                className="text-white/80 hover:text-white transition-all focus:outline-none flex h-9 w-9 sm:h-auto sm:w-auto items-center justify-center relative group cursor-pointer"
                title="Phím tắt điều khiển (?)"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 sm:w-[22px] sm:h-[22px]">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              </button>

              <button onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }} className="text-white hover:text-white/80 transition-all focus:outline-none flex h-9 w-9 sm:h-auto sm:w-auto items-center justify-center cursor-pointer">
                {isFullscreen ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 sm:w-7 sm:h-7"><path d="M8 3v3a2 2 0 0 1-2 2H3"></path><path d="M21 8h-3a2 2 0 0 1-2-2V3"></path><path d="M3 16h3a2 2 0 0 1 2 2v3"></path><path d="M16 21v-3a2 2 0 0 1 2-2h3"></path></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 sm:w-7 sm:h-7"><path d="M8 3H5a2 2 0 0 0-2 2v3"></path><path d="M21 8V5a2 2 0 0 0-2-2h-3"></path><path d="M3 16v3a2 2 0 0 0 2 2h3"></path><path d="M16 21h3a2 2 0 0 0 2-2v-3"></path></svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Playback Speed Indicator Overlay */}
      {speedIndicator && (
        <div className="absolute top-16 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs sm:text-sm font-semibold px-3.5 py-1.5 rounded-full z-40 pointer-events-none transition-opacity duration-300">
          Tốc độ: {speedIndicator}
        </div>
      )}

      {/* Volume Indicator Overlay */}
      {volumeIndicator && (
        <div className="absolute top-16 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs sm:text-sm font-semibold px-3.5 py-1.5 rounded-full z-40 pointer-events-none transition-opacity duration-300">
          {volumeIndicator}
        </div>
      )}

      {/* Netflix-style next episode countdown toast */}
      {nextEpisodeCountdown !== null && nextEpisodeCountdown <= 8 && (
        <div className="absolute bottom-16 sm:bottom-28 right-2 sm:right-6 z-[35] pointer-events-auto bg-[#1a1b20]/95 border border-white/10 p-3 sm:p-4 rounded-lg shadow-2xl flex flex-col gap-2 max-w-[260px] text-left">
          <div className="flex items-center justify-between gap-4">
            <span className="text-white text-xs sm:text-sm font-semibold truncate">Tập tiếp theo sẽ phát sau</span>
            <span className="flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-[#eab308] text-[#1a1a1a] text-xs sm:text-sm font-black animate-pulse">
              {nextEpisodeCountdown}
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onNext) onNext();
            }}
            className="w-full bg-white hover:bg-white/90 text-[#1a1a1a] text-xs sm:text-sm font-bold py-1.5 sm:py-2 rounded transition-colors text-center cursor-pointer"
          >
            Phát ngay
          </button>
        </div>
      )}
    </div>
  );
}
