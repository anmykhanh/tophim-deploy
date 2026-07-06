import Link from 'next/link';
import { Play } from 'lucide-react';
import Image from 'next/image';
import { getBackdropUrl, getProxyImageUrl } from '@/lib/image';

interface MovieCardLandscapeProps {
  movie: any;
}

export default function MovieCardLandscape({ movie }: MovieCardLandscapeProps) {
  const backdropUrl = getBackdropUrl(movie);
  const imageUrl = getProxyImageUrl(backdropUrl, 640);
  const detailLink = `/phim/${movie.slug}`;

  return (
    <Link 
      href={detailLink} 
      className="group relative block rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800/80 transition-all duration-300 shadow-lg"
    >
      {/* Landscape Backdrop Container */}
      <div className="aspect-[16/10] w-full relative overflow-hidden">
        <Image
          src={imageUrl || '/placeholder.jpg'}
          alt={movie.title}
          fill
          unoptimized
          className="object-cover w-full h-full transition-transform duration-500"
        />
        {/* Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent opacity-90 group-hover:opacity-100 transition-opacity" />
        
        {/* Play Icon on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="bg-amber-400 text-[#0f1115] p-3 rounded-full shadow-lg shadow-amber-400/30 scale-75 group-hover:scale-100 transition-all duration-300">
            <Play className="h-5 w-5 fill-current" />
          </div>
        </div>

        <div className="absolute top-2 left-2 flex flex-col gap-1 z-20">
          {movie.quality && (
            <span className="text-[9px] font-black bg-amber-400 text-zinc-950 px-1.5 py-0.5 rounded uppercase tracking-wider shadow">
              {movie.quality}
            </span>
          )}
        </div>

        {/* Song Ngữ Badge */}
        {((movie.language || '').toLowerCase().includes('song ngữ') || (movie.language || '').toLowerCase().includes('songngữ')) && (
          <div className="absolute top-2 right-2 z-20 bg-gradient-to-r from-[#d9b8ff] to-[#9888ff] text-[#1c1c1c] text-[10px] font-bold px-1.5 py-0.5 rounded-sm shadow-md flex items-center gap-1 leading-none">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>
            Song Ngữ
          </div>
        )}

        {/* Episode Status Badge */}
        {movie.status && (
          <div className="absolute bottom-2 right-2 bg-black/75 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-400/20 shadow">
            {movie.status.replace(/completed/i, 'Hoàn tất').replace(/ongoing/i, 'Đang phát')}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 text-left">
        <h3 className="font-bold text-sm text-zinc-100 line-clamp-1 group-hover:text-amber-400 transition-colors" title={movie.title}>
          {movie.title}
        </h3>
        {movie.original_title && (
          <p className="text-[11px] text-zinc-500 line-clamp-1 mt-0.5">
            {movie.original_title}
          </p>
        )}
      </div>
    </Link>
  );
}
