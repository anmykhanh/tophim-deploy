export default function ActorLoading() {
  return (
    <div className="w-full bg-[#0a0a0f] text-white min-h-screen pt-[90px] lg:pt-[110px]">
      <div className="max-w-[1400px] mx-auto px-4 py-8">
        
        {/* Skeleton Back Link */}
        <div className="h-5 w-40 bg-zinc-800 rounded animate-pulse mb-6"></div>

        {/* Skeleton Profile Header */}
        <div className="flex flex-col md:flex-row gap-8 items-start mb-12 bg-[#12131e]/50 border border-white/5 rounded-2xl p-6 md:p-8 backdrop-blur-md">
          {/* Avatar Skeleton */}
          <div className="w-48 h-48 md:w-56 md:h-56 rounded-2xl bg-zinc-800 animate-pulse shrink-0 border border-white/10 shadow-2xl"></div>

          {/* Details Skeleton */}
          <div className="flex-1 min-w-0 w-full space-y-4">
            <div className="h-10 w-2/3 sm:w-1/2 bg-zinc-800 rounded animate-pulse"></div>
            <div className="h-6 w-24 bg-zinc-800 rounded animate-pulse"></div>

            {/* Meta Grid Skeleton */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-[#161722]/60 border border-white/5 rounded-xl p-3 space-y-2">
                  <div className="h-3 w-12 bg-zinc-800 rounded animate-pulse"></div>
                  <div className="h-5 w-20 bg-zinc-800 rounded animate-pulse"></div>
                </div>
              ))}
            </div>

            {/* Bio Skeleton */}
            <div className="space-y-2 pt-2">
              <div className="h-4 w-20 bg-zinc-800 rounded animate-pulse"></div>
              <div className="h-4 w-full bg-zinc-800 rounded animate-pulse"></div>
              <div className="h-4 w-5/6 bg-zinc-800 rounded animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Movies Grid Header Skeleton */}
        <div className="h-8 w-48 bg-zinc-800 rounded animate-pulse mb-6"></div>

        {/* Movies Grid Skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="aspect-[2/3] w-full bg-zinc-800 rounded-xl animate-pulse"></div>
              <div className="h-4 w-5/6 bg-zinc-800 rounded animate-pulse mx-auto"></div>
              <div className="h-3 w-2/3 bg-zinc-800 rounded animate-pulse mx-auto"></div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
