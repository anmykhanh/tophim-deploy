'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getProxyImageUrl } from '@/lib/image';

interface ActorCardProps {
  actor: {
    id: number;
    name: string;
    slug: string;
    avatar: string | null;
    character?: string;
    role?: string;
  };
  size: 'small' | 'large';
}

export default function ActorCard({ actor: initialActor, size }: ActorCardProps) {
  const [actor, setActor] = useState(initialActor);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If the actor does not have an avatar, trigger a background sync to fetch details from TMDB
    if (!actor.avatar) {
      setLoading(true);
      fetch(`/api/actor/sync?id=${actor.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.actor) {
            setActor(data.actor);
          }
        })
        .catch(err => console.error('Failed to sync actor details:', err))
        .finally(() => setLoading(false));
    }
  }, [actor.id, actor.avatar]);

  const characterName = initialActor.character || initialActor.role || 'Diễn viên';

  if (size === 'small') {
    // Watch page style
    return (
      <Link 
        href={`/dien-vien/${actor.slug}`} 
        className="flex flex-col justify-center items-center text-center group w-[60px] sm:w-[70px] select-none"
      >
        <div className="relative w-[60px] h-[60px] sm:w-[70px] sm:h-[70px] rounded-full overflow-hidden mb-2 bg-[#1b1d26] shadow-lg flex items-center justify-center shrink-0">
          <svg className="absolute w-8 h-8 text-white/10" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12q-1.65 0-2.825-1.175Q8 9.65 8 8q0-1.65 1.175-2.825Q10.35 4 12 4q1.65 0 2.825 1.175Q16 6.35 16 8q0 1.65-1.175 2.825Q13.65 12 12 12Zm-8 8v-2.8q0-.85.438-1.563.437-.712 1.162-1.087 1.55-.775 3.15-1.163Q10.35 13 12 13t3.25.387q1.6.388 3.15 1.163.725.375 1.162 1.087.438.713.438 1.563V20H4Z"></path></svg>
          {actor.avatar ? (
            <img 
              src={getProxyImageUrl(actor.avatar, 100)} 
              alt={actor.name} 
              className="w-full h-full object-cover relative z-10"
              loading="lazy" 
            />
          ) : loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20">
              <div className="w-4 h-4 border-2 border-[#eab308]/20 border-t-[#eab308] rounded-full animate-spin"></div>
            </div>
          ) : null}
        </div>
        <p className="text-[12px] sm:text-[13px] text-white/90 text-center font-semibold line-clamp-1 group-hover:text-yellow-400 transition-colors w-full">
          {actor.name}
        </p>
      </Link>
    );
  }

  // Movie detail page style (large)
  return (
    <Link 
      href={`/dien-vien/${actor.slug}`}
      className="flex flex-col justify-center items-center text-center group w-full select-none"
    >
      <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full overflow-hidden mb-3 bg-[#1b1d26] shadow-lg flex items-center justify-center shrink-0">
        <svg className="absolute w-10 h-10 text-white/10" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12q-1.65 0-2.825-1.175Q8 9.65 8 8q0-1.65 1.175-2.825Q10.35 4 12 4q1.65 0 2.825 1.175Q16 6.35 16 8q0 1.65-1.175 2.825Q13.65 12 12 12Zm-8 8v-2.8q0-.85.438-1.563.437-.712 1.162-1.087 1.55-.775 3.15-1.163Q10.35 13 12 13t3.25.387q1.6.388 3.15 1.163.725.375 1.162 1.087.438.713.438 1.563V20H4Z"></path></svg>
        {actor.avatar ? (
          <img 
            src={getProxyImageUrl(actor.avatar, 120)} 
            alt={actor.name} 
            className="w-full h-full object-cover relative z-10"
            loading="lazy" 
          />
        ) : loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20">
            <div className="w-6 h-6 border-2 border-[#F5C518]/20 border-t-[#F5C518] rounded-full animate-spin"></div>
          </div>
        ) : null}
      </div>
      <p className="text-[14px] sm:text-[15px] font-semibold text-white/90 line-clamp-1 group-hover:text-yellow-400 transition-colors w-full">
        {actor.name}
      </p>
      <p className="text-[12px] sm:text-[13px] text-zinc-500 mt-0.5 line-clamp-1 w-full">
        {characterName}
      </p>
    </Link>
  );
}
