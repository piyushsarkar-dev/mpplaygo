"use client";

/* eslint-disable @next/next/no-img-element */
import { AddToPlaylist } from "@/components/playlist/add-to-playlist";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { useMusicProvider } from "@/hooks/use-context";
import { getSongsById } from "@/lib/fetch";
import {
  Album,
  Clock,
  Disc3,
  Download,
  Heart,
  Music2,
  Play,
  PlusCircle,
  Repeat,
  Share2,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { IoPause } from "react-icons/io5";
import { toast } from "sonner";

export default function SongHero({ id }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const {
    music,
    playing,
    setPlaying,
    songData,
    audioURL,
    audioRef,
    playNext,
    playPrevious,
    hasNext,
    hasPrevious,
    setCurrent,
  } = useMusicProvider();

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

  // Sync currentTime / duration from the shared audio element
  useEffect(() => {
    const audio = audioRef?.current;
    if (!audio) return;
    const onTime = () => {
      setCurrentTime(audio.currentTime);
      setDuration(audio.duration || 0);
    };
    audio.addEventListener("timeupdate", onTime);
    // Also pick up loaded duration
    const onLoaded = () => setDuration(audio.duration || 0);
    audio.addEventListener("loadeddata", onLoaded);
    // init
    setCurrentTime(audio.currentTime || 0);
    setDuration(audio.duration || 0);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadeddata", onLoaded);
    };
  }, [audioRef, music]);

  const imageUrl =
    data?.image?.[2]?.url ||
    data?.image?.[1]?.url ||
    data?.image?.[0]?.url ||
    "";
  const safeImage = imageUrl.replace?.(/^http:\/\//, "https://") || imageUrl;
  const artistName = data?.artists?.primary?.[0]?.name || "Unknown Artist";
  const albumName = data?.album?.name || "";
  const songDuration = data?.duration;
  const year = data?.releaseDate?.split("-")?.[0];
  const language = data?.language;

  const fmt = (sec) => {
    if (!sec || isNaN(sec)) return "00:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const togglePlayPause = async () => {
    const audio = audioRef?.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      localStorage.setItem("p", "false");
      setPlaying(false);
    } else {
      try {
        sessionStorage.setItem("mpplaygo_user_initiated_play", "true");
      } catch {}
      localStorage.setItem("p", "true");
      try {
        await audio.play();
        setPlaying(true);
      } catch {
        setPlaying(false);
      }
    }
  };

  const handleSeek = (val) => {
    const audio = audioRef?.current;
    if (!audio) return;
    audio.currentTime = val[0];
    setCurrentTime(val[0]);
    setCurrent(val[0]);
  };

  const handleNext = () => {
    const nextId = playNext();
    if (nextId) {
      try { sessionStorage.setItem("mpplaygo_user_initiated_play", "true"); } catch {}
    }
  };

  const handlePrevious = () => {
    const prevId = playPrevious();
    if (prevId) {
      try { sessionStorage.setItem("mpplaygo_user_initiated_play", "true"); } catch {}
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: data?.name, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied!");
      }
    } catch {}
  };

  // --------------- LOADING SKELETON ---------------
  if (loading) {
    return (
      <div className="relative w-full rounded-2xl md:rounded-3xl overflow-hidden mb-4 md:mb-8 bg-white/[0.03]">
        <div className="flex flex-col items-center gap-5 p-5 md:p-10 md:flex-row md:items-end md:gap-10">
          <Skeleton className="w-[200px] h-[200px] md:w-[260px] md:h-[260px] rounded-2xl shrink-0" />
          <div className="flex flex-col items-center md:items-start gap-3 flex-1 w-full">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-56 md:h-10 md:w-80" />
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-10 w-full max-w-xs mt-4" />
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // --------------- MAIN RENDER ---------------
  return (
    <div className="relative w-full overflow-hidden rounded-2xl md:rounded-3xl mb-4 md:mb-8">
      {/* Blurred BG */}
      <div className="absolute inset-0 z-0">
        <img
          src={safeImage}
          alt=""
          className="w-full h-full object-cover scale-125 blur-[80px] opacity-50"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/60 to-black/90" />
      </div>

      {/* ===== MOBILE LAYOUT ===== */}
      <div className="relative z-10 flex flex-col items-center p-4 pt-6 pb-5 md:hidden">
        {/* Art */}
        <div className="w-[220px] h-[220px] sm:w-[260px] sm:h-[260px] rounded-2xl overflow-hidden shadow-2xl shadow-black/60 ring-1 ring-white/10 mb-5">
          <img
            src={safeImage}
            alt={data?.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src =
                "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&auto=format&fit=crop&q=60";
            }}
          />
        </div>

        {/* Song Info */}
        <div className="w-full text-center mb-4">
          <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight truncate px-2">
            {data?.name}
          </h1>
          <p className="text-sm text-white/60 mt-1 truncate">{artistName}</p>
        </div>

        {/* Seek Bar */}
        <div className="w-full px-2 mb-3">
          <Slider
            value={[currentTime]}
            max={duration || 1}
            step={0.1}
            onValueChange={handleSeek}
            thumbClassName="h-3 w-3 bg-[#1DB954] border-none shadow-lg"
            trackClassName="h-[3px] bg-white/20"
            rangeClassName="bg-[#1DB954]"
            className="w-full"
          />
          <div className="flex justify-between text-[10px] text-white/40 mt-1 font-mono">
            <span>{fmt(currentTime)}</span>
            <span>{fmt(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-5 mb-4">
          <button
            onClick={handlePrevious}
            disabled={!hasPrevious}
            className="p-2 text-white/60 hover:text-white disabled:opacity-30 transition active:scale-90">
            <SkipBack className="w-6 h-6 fill-current" />
          </button>

          <button
            onClick={togglePlayPause}
            className="w-14 h-14 rounded-full bg-[#1DB954] text-black flex items-center justify-center shadow-xl shadow-[#1DB954]/30 hover:scale-105 active:scale-95 transition-transform">
            {playing ?
              <IoPause className="w-6 h-6" />
            : <Play className="w-6 h-6 ml-0.5 fill-black" />}
          </button>

          <button
            onClick={handleNext}
            disabled={!hasNext}
            className="p-2 text-white/60 hover:text-white disabled:opacity-30 transition active:scale-90">
            <SkipForward className="w-6 h-6 fill-current" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-3">
          <AddToPlaylist
            song={{
              id: data.id,
              title: data.name,
              artist: artistName,
              image: data.image,
            }}>
            <button className="w-10 h-10 rounded-full bg-white/[0.08] border border-white/[0.06] flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.15] transition">
              <Heart className="w-[18px] h-[18px]" />
            </button>
          </AddToPlaylist>

          <AddToPlaylist
            song={{
              id: data.id,
              title: data.name,
              artist: artistName,
              image: data.image,
            }}>
            <button className="w-10 h-10 rounded-full bg-white/[0.08] border border-white/[0.06] flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.15] transition">
              <PlusCircle className="w-[18px] h-[18px]" />
            </button>
          </AddToPlaylist>

          {audioURL && (
            <a
              href={audioURL}
              download={`${data?.name || "song"}.m4a`}
              target="_blank"
              rel="noreferrer">
              <button className="w-10 h-10 rounded-full bg-white/[0.08] border border-white/[0.06] flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.15] transition">
                <Download className="w-[18px] h-[18px]" />
              </button>
            </a>
          )}

          <button
            onClick={handleShare}
            className="w-10 h-10 rounded-full bg-white/[0.08] border border-white/[0.06] flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.15] transition">
            <Share2 className="w-[18px] h-[18px]" />
          </button>
        </div>

        {/* Meta pills */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 mt-4">
          {albumName && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/[0.06] text-white/50 text-[10px] font-medium border border-white/[0.04]">
              <Album className="w-2.5 h-2.5" />
              {albumName.length > 25 ? albumName.slice(0, 25) + "..." : albumName}
            </span>
          )}
          {year && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-white/[0.06] text-white/50 text-[10px] font-medium border border-white/[0.04]">
              {year}
            </span>
          )}
          {language && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/[0.06] text-white/50 text-[10px] font-medium border border-white/[0.04] capitalize">
              <Music2 className="w-2.5 h-2.5" />
              {language}
            </span>
          )}
        </div>
      </div>

      {/* ===== DESKTOP LAYOUT ===== */}
      <div className="relative z-10 hidden md:flex items-end gap-10 p-8 lg:p-10">
        {/* Art */}
        <div className="shrink-0 group">
          <div className="relative w-[240px] h-[240px] lg:w-[280px] lg:h-[280px] rounded-2xl overflow-hidden shadow-2xl shadow-black/50 ring-1 ring-white/10 transition-transform duration-500 group-hover:scale-[1.02]">
            <img
              src={safeImage}
              alt={data?.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src =
                  "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&auto=format&fit=crop&q=60";
              }}
            />
          </div>
        </div>

        {/* Info + Controls */}
        <div className="flex-1 min-w-0 pb-1">
          {/* Label */}
          <div className="flex items-center gap-2 mb-2">
            <Disc3
              className="w-3.5 h-3.5 text-[#1DB954] animate-spin"
              style={{ animationDuration: "3s" }}
            />
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#1DB954]">
              Now Playing
            </span>
          </div>

          {/* Name */}
          <h1 className="text-3xl lg:text-5xl font-bold text-white leading-tight tracking-tight mb-1 truncate">
            {data?.name}
          </h1>

          {/* Artist */}
          <p className="text-lg text-white/60 font-medium mb-3">{artistName}</p>

          {/* Meta pills */}
          <div className="flex flex-wrap items-center gap-2 mb-5">
            {albumName && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.08] backdrop-blur-sm text-white/60 text-xs font-medium border border-white/[0.06]">
                <Album className="w-3 h-3" />
                {albumName.length > 30 ? albumName.slice(0, 30) + "..." : albumName}
              </span>
            )}
            {songDuration && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.08] backdrop-blur-sm text-white/60 text-xs font-medium border border-white/[0.06]">
                <Clock className="w-3 h-3" />
                {fmt(songDuration)}
              </span>
            )}
            {year && (
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/[0.08] backdrop-blur-sm text-white/60 text-xs font-medium border border-white/[0.06]">
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

          {/* Seek Bar */}
          <div className="max-w-xl mb-4">
            <Slider
              value={[currentTime]}
              max={duration || 1}
              step={0.1}
              onValueChange={handleSeek}
              thumbClassName="h-3.5 w-3.5 bg-[#1DB954] border-none shadow-lg opacity-0 group-hover:opacity-100 transition"
              trackClassName="h-1 bg-white/15 group"
              rangeClassName="bg-[#1DB954]"
              className="w-full group"
            />
            <div className="flex justify-between text-[11px] text-white/40 mt-1 font-mono">
              <span>{fmt(currentTime)}</span>
              <span>{fmt(duration)}</span>
            </div>
          </div>

          {/* Controls Row */}
          <div className="flex items-center gap-4">
            <button
              onClick={handlePrevious}
              disabled={!hasPrevious}
              className="p-2 text-white/60 hover:text-white disabled:opacity-30 transition-all hover:scale-110 active:scale-90">
              <SkipBack className="w-6 h-6 fill-current" />
            </button>

            <button
              onClick={togglePlayPause}
              className="w-12 h-12 rounded-full bg-[#1DB954] text-black flex items-center justify-center shadow-xl shadow-[#1DB954]/30 hover:scale-110 active:scale-95 transition-transform">
              {playing ?
                <IoPause className="w-5 h-5" />
              : <Play className="w-5 h-5 ml-0.5 fill-black" />}
            </button>

            <button
              onClick={handleNext}
              disabled={!hasNext}
              className="p-2 text-white/60 hover:text-white disabled:opacity-30 transition-all hover:scale-110 active:scale-90">
              <SkipForward className="w-6 h-6 fill-current" />
            </button>

            {/* Divider */}
            <div className="w-px h-8 bg-white/10 mx-1" />

            <AddToPlaylist
              song={{
                id: data.id,
                title: data.name,
                artist: artistName,
                image: data.image,
              }}>
              <button
                className="w-9 h-9 rounded-full bg-white/[0.06] border border-white/[0.06] flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.12] transition"
                title="Add to playlist">
                <Heart className="w-4 h-4" />
              </button>
            </AddToPlaylist>

            <AddToPlaylist
              song={{
                id: data.id,
                title: data.name,
                artist: artistName,
                image: data.image,
              }}>
              <button
                className="w-9 h-9 rounded-full bg-white/[0.06] border border-white/[0.06] flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.12] transition"
                title="Add to playlist">
                <PlusCircle className="w-4 h-4" />
              </button>
            </AddToPlaylist>

            {audioURL && (
              <a
                href={audioURL}
                download={`${data?.name || "song"}.m4a`}
                target="_blank"
                rel="noreferrer">
                <button
                  className="w-9 h-9 rounded-full bg-white/[0.06] border border-white/[0.06] flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.12] transition"
                  title="Download">
                  <Download className="w-4 h-4" />
                </button>
              </a>
            )}

            <button
              onClick={handleShare}
              className="w-9 h-9 rounded-full bg-white/[0.06] border border-white/[0.06] flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.12] transition"
              title="Share">
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
