import Link from 'next/link';
import { Play } from 'lucide-react';
import Image from 'next/image';
import { getPosterUrl, getProxyImageUrl } from '@/lib/image';

interface MovieCardNumberedProps {
  movie: any;
  rank: number;
}

export default function MovieCardNumbered({ movie, rank }: MovieCardNumberedProps) {
  const posterUrl = getPosterUrl(movie);
  const imageUrl = getProxyImageUrl(posterUrl, 384);
  const detailLink = `/phim/${movie.slug}`;

  return (
    <Link 
      href={detailLink} 
      className="group relative flex items-end shrink-0 select-none pb-2"
    >
      {/* Giant Rank Number */}
      <span className="text-[100px] sm:text-[140px] font-black leading-none select-none text-white/10 group-hover:text-amber-400/30 transition-colors duration-500 -mr-4 sm:-mr-8 z-10 italic">
        {rank}
      </span>

      {/* Poster Image Box */}
      <div className="z-20 w-[110px] sm:w-[160px] aspect-[2/3] relative rounded-xl overflow-hidden bg-zinc-900 border border-zinc-850 shadow-2xl transition-all duration-300">
        <Image
          src={imageUrl || '/placeholder.jpg'}
          alt={movie.title}
          fill
          unoptimized
          className="object-cover w-full h-full transition-transform duration-500"
        />
        {/* Play overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="bg-amber-400 text-[#0f1115] p-2.5 rounded-full shadow-lg scale-75 group-hover:scale-100 transition-all duration-300">
            <Play className="h-4 w-4 fill-current" />
          </div>
        </div>

        {/* Quality Badge */}
        {movie.quality && (
          <div className="absolute top-1.5 left-1.5 z-20">
            <span className="text-[8px] font-black bg-amber-400 text-zinc-950 px-1 py-0.5 rounded uppercase tracking-wider">
              {movie.quality}
            </span>
          </div>
        )}

        {/* Song Ngữ Badge */}
        {((movie.language || '').toLowerCase().includes('song ngữ') || (movie.language || '').toLowerCase().includes('songngữ')) && (
          <div className="absolute top-1.5 right-1.5 z-20 bg-gradient-to-r from-[#d9b8ff] to-[#9888ff] text-[#1c1c1c] text-[9px] font-bold px-1.5 py-0.5 rounded-sm shadow-md flex items-center gap-1 leading-none">
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>
            Song Ngữ
          </div>
        )}

        {/* Status Badge */}
        {movie.status && (
          <div className="absolute bottom-1.5 right-1.5 bg-black/85 text-amber-400 text-[8px] font-bold px-1.5 py-0.5 rounded border border-amber-400/10">
            {movie.status.replace(/completed/i, 'Hoàn tất').replace(/ongoing/i, 'Đang phát')}
          </div>
        )}
      </div>

      {/* Hover info text floating or omitted? 
          On chophim.fun, the title is displayed under the card or is just the poster.
          Let's check the screenshot: the title is indeed shown below the poster box.
      */}
      <div className="absolute bottom-[-16px] left-[50px] right-0 z-30 hidden group-hover:block transition-all duration-300">
        <p className="text-[10px] font-bold text-amber-400 truncate drop-shadow bg-zinc-950/80 px-2 py-0.5 rounded border border-zinc-800">
          {movie.title}
        </p>
      </div>
    </Link>
  );
}
