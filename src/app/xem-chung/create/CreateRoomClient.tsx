'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getProxyImageUrl } from '@/lib/image';

interface CreateRoomClientProps {
  movie: any;
  servers: Record<string, any[]>;
}

export default function CreateRoomClient({ movie, servers }: CreateRoomClientProps) {
  const router = useRouter();
  
  const serverNames = Object.keys(servers);
  const initialServer = serverNames[0] || '';
  const initialEpisodes = servers[initialServer] || [];
  const initialEpisode = initialEpisodes[0] || null;

  const [selectedServer, setSelectedServer] = useState<string>(initialServer);
  const [selectedEpisode, setSelectedEpisode] = useState<any>(initialEpisode);
  const [roomTitle, setRoomTitle] = useState<string>(
    `Xem chung: ${movie.title} - Tập ${initialEpisode ? initialEpisode.name : ''}`
  );
  const [capacity, setCapacity] = useState<number>(10);
  const [isPublic, setIsPublic] = useState<boolean>(true);
  const [scheduledAt, setScheduledAt] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleServerChange = (srv: string) => {
    setSelectedServer(srv);
    const eps = servers[srv] || [];
    const firstEp = eps[0] || null;
    setSelectedEpisode(firstEp);
    if (firstEp) {
      setRoomTitle(`Xem chung: ${movie.title} - Tập ${firstEp.name}`);
    }
  };

  const handleEpisodeChange = (ep: any) => {
    setSelectedEpisode(ep);
    setRoomTitle(`Xem chung: ${movie.title} - Tập ${ep.name}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEpisode) {
      setErrorMsg('Vui lòng chọn tập phim trước.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/watch-room/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movie_id: movie.id,
          episode_id: selectedEpisode.id,
          server_name: selectedServer,
          title: roomTitle,
          capacity: capacity,
          is_public: isPublic,
          scheduled_at: scheduledAt || null
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        router.push(`/xem-chung/room/${data.room_code}`);
      } else {
        setErrorMsg(data.message || 'Lỗi khởi tạo phòng.');
      }
    } catch (err: any) {
      setErrorMsg('Lỗi kết nối server, vui lòng thử lại.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const poster = getProxyImageUrl(movie.poster_url || movie.thumb_url || '', 200);

  return (
    <div id="wrapper" className="live-category min-h-screen pt-20 text-left select-none text-white pb-16">
      <div className="live-background">
        <div className="light-blur"></div>
        <img alt="live-cover" src="/images/live-cover2.webp" />
      </div>
      
      <div className="fluid-gap">
        <div className="cards-row wide">
          {/* Header Banner */}
          <div className="relative py-10 px-6 overflow-hidden min-h-[160px] flex items-center bg-gradient-to-r from-amber-950/20 via-zinc-900/40 to-transparent border border-zinc-900 rounded-3xl mb-8">
            <div 
              className="absolute inset-0 opacity-10 bg-gradient-to-b from-transparent to-[#09090b]" 
              style={{ backgroundColor: 'rgb(255, 216, 117)' }}
            />
            <div className="relative z-20 w-full space-y-1 text-left">
              <Link className="inline-flex items-center text-zinc-400 hover:text-white mb-1 transition-colors text-xs font-semibold decoration-none" href="/xem-chung/select-movie">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 mr-1">
                  <path d="m15 18-6-6 6-6" />
                </svg>
                Quay lại Chọn Phim
              </Link>
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">Khởi Tạo Phòng Chiếu</h1>
              <p className="text-zinc-400 text-xs font-medium">Thiết lập tập phim, cấu hình tiêu đề và thời gian chiếu cho phòng xem chung của bạn.</p>
            </div>
          </div>

          {/* Configuration Body */}
          <div className="relative z-20 pt-4">
            {errorMsg && (
              <div className="max-w-5xl mx-auto mb-6 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-xs font-semibold flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-red-500">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <span>{errorMsg}</span>
              </div>
            )}
          
          <form onSubmit={handleSubmit} className="space-y-8 max-w-5xl">
            {/* Selected Movie Summary Card */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-5 flex flex-col sm:flex-row gap-5 items-center">
              <img src={poster} alt={movie.title} className="w-20 h-28 object-cover rounded-xl border border-zinc-800" />
              <div className="flex-1 text-center sm:text-left space-y-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[8px] font-black bg-[#ffd875]/10 text-[#ffd875] border border-[#ffd875]/20 uppercase tracking-widest">
                  # Phim Được Chọn
                </span>
                <h2 className="text-xl font-extrabold text-white tracking-tight">{movie.title}</h2>
                <p className="text-xs text-zinc-500 font-semibold">{movie.original_title}</p>
                <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap text-[10px] text-zinc-400 font-bold">
                  <span className="bg-zinc-800/60 px-2 py-0.5 rounded border border-zinc-700">{movie.quality || 'HD'} Server</span>
                  <span className="bg-zinc-800/60 px-2 py-0.5 rounded border border-zinc-700">Năm {movie.year}</span>
                </div>
              </div>
            </div>

            {/* Configuration Grid Split */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Column Left: Source and Episodes (Span 7) */}
              <div className="lg:col-span-7 bg-zinc-900/30 border border-zinc-900 rounded-3xl p-6 space-y-6">
                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-3.5 bg-[#ffd875] rounded-full" /> 1. Chọn nguồn phát & tập phim
                </h3>

                {/* Server Selection */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-zinc-500">CHỌN SERVER NGUỒN PHÁT:</label>
                  <div className="flex gap-2.5 flex-wrap">
                    {serverNames.map((srv) => (
                      <button 
                        key={srv} 
                        type="button" 
                        onClick={() => handleServerChange(srv)} 
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border outline-none cursor-pointer ${
                          srv === selectedServer 
                            ? 'bg-[#ffd875] text-zinc-950 border-[#ffd875]' 
                            : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                        }`}
                      >
                        {srv.includes(' - ') ? srv.split(' - ').pop() : srv}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Episode Selection */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-zinc-500">CHỌN TẬP PHIM:</label>
                  <div className="flex gap-2 flex-wrap">
                    {(servers[selectedServer] || []).map((ep) => (
                      <button 
                        key={ep.id} 
                        type="button" 
                        onClick={() => handleEpisodeChange(ep)} 
                        className={`px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all border outline-none cursor-pointer ${
                          selectedEpisode && ep.id === selectedEpisode.id 
                            ? 'bg-[#ffd875] text-zinc-950 border-[#ffd875]' 
                            : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                        }`}
                      >
                        Tập {ep.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Column Right: Room details and controls (Span 5) */}
              <div className="lg:col-span-5 bg-zinc-900/30 border border-zinc-900 rounded-3xl p-6 space-y-6 flex flex-col justify-between">
                <div className="space-y-6">
                  <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-3.5 bg-[#ffd875] rounded-full" /> 2. Cấu hình phòng
                  </h3>

                  {/* Room Title */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider">TIÊU ĐỀ PHÒNG</label>
                    <input 
                      type="text" 
                      required 
                      value={roomTitle} 
                      onChange={(e) => setRoomTitle(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs md:text-sm text-white focus:outline-none focus:border-[#ffd875] font-medium" 
                    />
                  </div>

                  {/* Capacity & Privacy */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider">👥 SỨC CHỨA</label>
                      <select 
                        value={capacity} 
                        onChange={(e) => setCapacity(parseInt(e.target.value, 10))}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#ffd875] font-bold"
                      >
                        <option value={5}>5 người tham gia</option>
                        <option value={10}>10 người tham gia</option>
                        <option value={20}>20 người tham gia</option>
                        <option value={50}>50 người tham gia</option>
                        <option value={100}>100 người tham gia</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider">CHẾ ĐỘ PHÒNG</label>
                      <div className="flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 h-[38px]">
                        <span className="text-xs text-zinc-400 font-bold flex items-center gap-1.5">
                          <span className="w-2 h-2 bg-[#ffd875] rounded-full" /> Công khai
                        </span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={isPublic} 
                            onChange={(e) => setIsPublic(e.target.checked)}
                            className="sr-only peer" 
                          />
                          <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#ffd875]" />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Play Mode options */}
                  <div className="pt-2 flex items-center gap-6">
                    <label className="flex items-center gap-2 text-xs font-bold text-white cursor-pointer">
                      <input 
                        type="radio" 
                        checked={!scheduledAt} 
                        onChange={() => setScheduledAt('')}
                        className="accent-[#ffd875]" 
                      />
                      <span className={`w-2 h-2 rounded-full inline-block ${!scheduledAt ? 'bg-[#ffd875]' : 'bg-zinc-600'}`} /> PHÁT NGAY LẬP TỨC
                    </label>
                    <label className="flex items-center gap-2 text-xs font-bold text-white cursor-pointer">
                      <input 
                        type="radio" 
                        checked={!!scheduledAt} 
                        onChange={() => {
                          const now = new Date();
                          now.setMinutes(now.getMinutes() + 5); // default to 5 mins later
                          setScheduledAt(now.toISOString().slice(0, 16));
                        }}
                        className="accent-[#ffd875]" 
                      />
                      <span className={`w-2 h-2 rounded-full inline-block ${scheduledAt ? 'bg-[#ffd875]' : 'bg-zinc-600'}`} /> HẸN GIỜ CHIẾU
                    </label>
                  </div>

                  {/* Scheduled At Input */}
                  {scheduledAt && (
                    <div className="space-y-2 mt-4">
                      <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider">⏱️ CHỌN GIỜ CHIẾU</label>
                      <input 
                        type="datetime-local" 
                        value={scheduledAt} 
                        onChange={(e) => setScheduledAt(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs md:text-sm text-white focus:outline-none focus:border-[#ffd875] font-medium" 
                      />
                      <p className="text-[10px] text-zinc-500 font-medium">Người tham gia sẽ chờ ở sảnh đếm ngược cho đến giờ này.</p>
                    </div>
                  )}

                  {/* Info Tip Banner */}
                  <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-3.5 text-[10px] text-zinc-500 font-medium leading-relaxed flex gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-zinc-400 shrink-0">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    <span>Phòng xem chung sẽ có hiệu lực tối đa trong vòng 24 giờ kể từ khi được tạo. Để tránh spam, mỗi thành viên chỉ có thể sở hữu tối đa 1 phòng xem chung hoạt động tại bất kỳ thời điểm nào.</span>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full mt-6 py-3.5 bg-[#ffd875] hover:bg-[#ffe194] text-zinc-950 font-bold rounded-2xl text-xs md:text-sm text-center shadow-lg transition-all duration-300 hover:-translate-y-0.5 cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'ĐANG KHỞI TẠO...' : '▶ KHỞI TẠO & VÀO PHÒNG CHIẾU'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
      </div>
    </div>
  );
}
