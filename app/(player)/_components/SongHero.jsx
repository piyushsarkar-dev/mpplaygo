"use client";

/* eslint-disable @next/next/no-img-element */
import { Skeleton } from "@/components/ui/skeleton";
import { useMusicProvider } from "@/hooks/use-context";
import { getSongsById } from "@/lib/fetch";
import { Album, Clock, Disc3, Music2 } from "lucide-react";
import { useEffect, useState } from "react";

export default function SongHero({ id }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { music } = useMusicProvider();

  // Use the id prop — it's the song on this page
  const songId = id;

  useEffect(() => {
    if (!songId) return;
    setLoading(true);
    getSongsById(songId)
      .then((res) => res.json())
      .then((res) => {
        if (res?.data?.[0]) setData(res.data[0]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [songId]);

  const imageUrl =
    data?.image?.[2]?.url ||
    data?.image?.[1]?.url ||
    data?.image?.[0]?.url ||
    "";
  const safeImage = imageUrl.replace?.(/^http:\/\//, "https://") || imageUrl;
  const artistName = data?.artists?.primary?.[0]?.name || "Unknown Artist";
  const albumName = data?.album?.name || "";
  const duration = data?.duration;
  const year = data?.releaseDate?.split("-")?.[0];
  const language = data?.language;

  const formatDuration = (sec) => {
    if (!sec) return "";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="relative w-full">
        {/* Skeleton hero */}
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 md:gap-10 pt-6 pb-8 md:pt-10 md:pb-12 px-4 md:px-0">
          <Skeleton className="w-[200px] h-[200px] md:w-[280px] md:h-[280px] rounded-2xl shrink-0" />
          <div className="flex flex-col items-center md:items-start gap-3 flex-1 w-full">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-64 md:h-10 md:w-96" />
            <Skeleton className="h-5 w-40" />
            <div className="flex gap-3 mt-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="relative w-full overflow-hidden rounded-2xl md:rounded-3xl mb-4 md:mb-8">
      {/* Blurred background image */}
      <div className="absolute inset-0 z-0">
        <img
          src={safeImage}
          alt=""
          className="w-full h-full object-cover scale-110 blur-[60px] opacity-40"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/70 to-black/90" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col md:flex-row items-center gap-5 md:gap-10 p-5 md:p-10">
        {/* Album Art */}
        <div className="shrink-0 group">
          <div className="relative w-[180px] h-[180px] sm:w-[220px] sm:h-[220px] md:w-[280px] md:h-[280px] rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl shadow-black/50 ring-1 ring-white/10 transition-transform duration-500 group-hover:scale-[1.03]">
            <img
              src={safeImage}
              alt={data?.name || "Song"}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src =
                  "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&auto=format&fit=crop&q=60";
              }}
            />
            {/* Vinyl overlay effect on hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
        </div>

        {/* Song Info */}
        <div className="flex flex-col items-center md:items-start gap-2 md:gap-3 flex-1 min-w-0 text-center md:text-left">
          {/* Label */}
          <div className="flex items-center gap-2">
            <Disc3
              className="w-3.5 h-3.5 text-[#1DB954] animate-spin"
              style={{ animationDuration: "3s" }}
            />
            <span className="text-[11px] md:text-xs font-semibold uppercase tracking-[0.15em] text-[#1DB954]">
              Now Playing
            </span>
          </div>

          {/* Song Name */}
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight tracking-tight max-w-full">
            {data?.name}
          </h1>

          {/* Artist */}
          <p className="text-base sm:text-lg md:text-xl text-white/70 font-medium">
            {artistName}
          </p>

          {/* Meta info pills */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 md:gap-3 mt-2">
            {albumName && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.08] backdrop-blur-sm text-white/60 text-xs font-medium border border-white/[0.06]">
                <Album className="w-3 h-3" />
                {albumName.length > 30 ?
                  albumName.slice(0, 30) + "..."
                : albumName}
              </span>
            )}
            {duration && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.08] backdrop-blur-sm text-white/60 text-xs font-medium border border-white/[0.06]">
                <Clock className="w-3 h-3" />
                {formatDuration(duration)}
              </span>
            )}
            {year && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.08] backdrop-blur-sm text-white/60 text-xs font-medium border border-white/[0.06]">
                {year}
              </span>
            )}
            {language && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.08] backdrop-blur-sm text-white/60 text-xs font-medium border border-white/[0.06] capitalize">
                <Music2 className="w-3 h-3" />
                {language}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
