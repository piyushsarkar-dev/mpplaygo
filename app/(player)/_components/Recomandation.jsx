"use client";

/* eslint-disable @next/next/no-img-element */
import { Skeleton } from "@/components/ui/skeleton";
import { useMusicProvider, useNextMusicProvider } from "@/hooks/use-context";
import { getSongsSuggestions } from "@/lib/fetch";
import { Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Recomandation({ id }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const next = useNextMusicProvider();
  const { setMusic } = useMusicProvider();
  const router = useRouter();
  const QUEUE_KEY = "mpplaygo_queue";

  const getData = async () => {
    await getSongsSuggestions(id)
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          setData(data.data);
          let d = data.data[Math.floor(Math.random() * data?.data?.length)];
          next.setNextData({
            id: d.id,
            name: d.name,
            artist: d.artists.primary[0]?.name || "unknown",
            album: d.album.name,
            image: d.image[1].url,
          });
        } else {
          setData(false);
        }
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(QUEUE_KEY);
      if (raw) {
        const queue = JSON.parse(raw);
        if (queue?.type === "artist" && Array.isArray(queue?.items)) {
          setLoading(false);
          setData(false);
          return;
        }
      }
    } catch {}
    getData();
  }, []);

  const handlePlay = (song) => {
    try {
      sessionStorage.setItem("mpplaygo_user_initiated_play", "true");
    } catch {}
    try {
      localStorage.setItem("p", "true");
    } catch {}
    setMusic(song.id);
    router.push(`/${song.id}`);
  };

  if (!loading && !data) return null;

  return (
    <section className="pb-32 md:pb-40">
      {/* Section Header */}
      <div className="mb-5 md:mb-6">
        <h2 className="text-lg md:text-xl font-bold text-white tracking-tight">
          You might also like
        </h2>
        <p className="text-xs md:text-sm text-white/40 mt-0.5">
          Based on what you&apos;re listening to
        </p>
      </div>

      {/* Song Grid */}
      {!loading && data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 md:gap-3">
          {data.map((song) => {
            const img =
              song.image?.[2]?.url ||
              song.image?.[1]?.url ||
              song.image?.[0]?.url ||
              "";
            const safeImg =
              typeof img === "string" ?
                img.replace(/^http:\/\//, "https://")
              : img;
            const artist = song.artists?.primary?.[0]?.name || "Unknown Artist";

            return (
              <button
                key={song.id}
                onClick={() => handlePlay(song)}
                className="group flex items-center gap-3 p-2.5 md:p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.04] hover:border-white/[0.08] transition-all duration-200 text-left w-full">
                {/* Thumbnail */}
                <div className="relative w-12 h-12 md:w-14 md:h-14 rounded-lg overflow-hidden shrink-0 shadow-lg ring-1 ring-white/5">
                  <img
                    src={safeImg}
                    alt={song.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    onError={(e) => {
                      e.currentTarget.src =
                        "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&auto=format&fit=crop&q=60";
                    }}
                  />
                  {/* Play overlay */}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <Play className="w-5 h-5 text-white fill-white" />
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 overflow-hidden">
                  <h3 className="text-sm md:text-[15px] font-semibold text-white truncate leading-tight group-hover:text-[#1DB954] transition-colors duration-200">
                    {song.name}
                  </h3>
                  <p className="text-[11px] md:text-xs text-white/40 truncate mt-0.5">
                    {artist}
                  </p>
                </div>

                {/* Play icon (visible on mobile, hover on desktop) */}
                <div className="shrink-0 w-8 h-8 rounded-full bg-[#1DB954]/10 group-hover:bg-[#1DB954] flex items-center justify-center transition-all duration-200 md:opacity-0 md:group-hover:opacity-100">
                  <Play className="w-3.5 h-3.5 text-[#1DB954] group-hover:text-black fill-current ml-0.5" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 md:gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-2.5 md:p-3 rounded-xl bg-white/[0.04] border border-white/[0.04]">
              <Skeleton className="w-12 h-12 md:w-14 md:h-14 rounded-lg shrink-0" />
              <div className="flex-1 min-w-0">
                <Skeleton className="h-4 w-3/4 mb-1.5" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No recommendations */}
      {!loading && !data && (
        <div className="flex items-center justify-center rounded-2xl bg-white/[0.03] border border-white/[0.06] text-center h-[120px]">
          <p className="text-sm text-white/40">No suggestions for this song.</p>
        </div>
      )}
    </section>
  );
}
