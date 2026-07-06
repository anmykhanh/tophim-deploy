'use client';

import { useState, useEffect } from 'react';

interface Props {
  actorId: number;
}

export default function FavoriteActorButton({ actorId }: Props) {
  const [isFavorited, setIsFavorited] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFavoriteStatus = async () => {
      try {
        const res = await fetch(`/api/user/favorite-actor?actor_id=${actorId}`);
        if (res.ok) {
          const data = await res.json();
          setIsFavorited(data.favorited);
        }
      } catch (err) {
        console.error('Failed to fetch favorite status:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFavoriteStatus();
  }, [actorId]);

  const handleToggleFavorite = async () => {
    try {
      const res = await fetch('/api/user/favorite-actor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actor_id: actorId }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsFavorited(data.favorited);
        // You could also show a toast notification here
      } else {
        alert(data.message || 'Có lỗi xảy ra');
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
      alert('Có lỗi xảy ra');
    }
  };

  if (loading) return null;

  return (
    <button
      onClick={handleToggleFavorite}
      className="mt-4 sm:mt-0 flex items-center justify-center gap-2 bg-zinc-800/80 hover:bg-zinc-700/80 text-white px-5 py-2.5 rounded-xl transition-all shadow-md active:scale-95 group/fav"
      title="Yêu thích diễn viên"
    >
      <svg
        className={`transition-all duration-500 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] w-5 h-5 group-hover/fav:scale-110 ${
          isFavorited ? 'text-red-500 fill-red-500' : 'text-white/90 fill-none'
        }`}
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path>
      </svg>
      {isFavorited ? 'Bỏ thích' : 'Yêu thích'}
    </button>
  );
}
