"use client";

import { useRoom } from "@/components/providers/room-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { getSongsById } from "@/lib/fetch";
import {
  Music,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * The room-synced player.
 * If the user isAdmin or hasControl, they can control playback.
 * Otherwise they only listen.
 */
export function RoomPlayer() {
  const {
    isAdmin,
    hasControl,
    roomSongId,
    roomSongData,
    roomIsPlaying,
    roomCurrentTime,
    setRoomCurrentTime,
    broadcastPlay,
    broadcastPause,
    broadcastSeek,
    broadcastChangeSong,
    broadcastSkipNext,
    broadcastSkipPrev,
    setAdminAudioTime,
    roomQueue,
    roomHistory,
    isInRoom,
  } = useRoom();

  const audioRef = useRef(null);
  const [songData, setSongData] = useState(null);
  const [audioURL, setAudioURL] = useState("");
  const [localPlaying, setLocalPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [muted, setMuted] = useState(false);
  const lastVolumeRef = useRef(50);
  const seekBlockRef = useRef(false);
  const isSyncRef = useRef(false);

  const canControl = isAdmin || hasControl;

  // Fetch song data when roomSongId changes
  useEffect(() => {
    if (!roomSongId) {
      setSongData(null);
      setAudioURL("");
      return;
    }

    const fetchSong = async () => {
      try {
        if (roomSongData && roomSongData.id === roomSongId) {
          setSongData(roomSongData);
          const url =
            roomSongData.downloadUrl?.[2]?.url ||
            roomSongData.downloadUrl?.[1]?.url ||
            roomSongData.downloadUrl?.[0]?.url;
          if (url) setAudioURL(url);
          return;
        }

        const res = await getSongsById(roomSongId);
        if (!res) return;
        const data = await res.json();
        const song = data?.data?.[0];
        if (song) {
          setSongData(song);
          const url =
            song.downloadUrl?.[2]?.url ||
            song.downloadUrl?.[1]?.url ||
            song.downloadUrl?.[0]?.url;
          if (url) setAudioURL(url);
        }
      } catch (err) {
        console.error("RoomPlayer: failed to fetch song", err);
      }
    };
    fetchSong();
  }, [roomSongId, roomSongData]);

  // Sync play/pause from room state
  useEffect(() => {
    if (!audioRef.current || !audioURL) return;

    isSyncRef.current = true;
    if (roomIsPlaying) {
      audioRef.current.play().catch(() => {});
      setLocalPlaying(true);
    } else {
      audioRef.current.pause();
      setLocalPlaying(false);
    }
    isSyncRef.current = false;
  }, [roomIsPlaying, audioURL]);

  // Sync seek from room state
  useEffect(() => {
    if (!audioRef.current || seekBlockRef.current) return;
    if (!canControl) {
      const diff = Math.abs(audioRef.current.currentTime - roomCurrentTime);
      if (diff > 0.8) {
        audioRef.current.currentTime = roomCurrentTime;
      }
    } else {
      const diff = Math.abs(audioRef.current.currentTime - roomCurrentTime);
      if (diff > 3) {
        audioRef.current.currentTime = roomCurrentTime;
      }
    }
  }, [roomCurrentTime, canControl]);

  // Time update handler
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      setDuration(audio.duration);
      if (canControl) {
        setRoomCurrentTime(audio.currentTime);
        setAdminAudioTime(audio.currentTime);
      }
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    return () => audio.removeEventListener("timeupdate", onTimeUpdate);
  }, [canControl, setRoomCurrentTime, setAdminAudioTime]);

  // Handle song ended
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onEnded = () => {
      if (canControl) {
        if (roomQueue.length > 0) {
          const nextSong = roomQueue[0];
          broadcastChangeSong(nextSong.id, nextSong);
        } else {
          setLocalPlaying(false);
        }
      }
    };

    audio.addEventListener("ended", onEnded);
    return () => audio.removeEventListener("ended", onEnded);
  }, [canControl, roomQueue, broadcastChangeSong]);

  // Volume control
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = Math.min(1, Math.max(0, volume / 100));
    audioRef.current.muted = muted;
    if (volume > 0) lastVolumeRef.current = volume;
  }, [volume, muted]);

  const formatTime = (t) => {
    if (!t || isNaN(t)) return "00:00";
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const handlePlayPause = () => {
    if (!canControl) return;
    const time = audioRef.current?.currentTime || 0;
    if (localPlaying) {
      audioRef.current?.pause();
      setLocalPlaying(false);
      broadcastPause(time);
    } else {
      audioRef.current?.play().catch(() => {});
      setLocalPlaying(true);
      broadcastPlay(time);
    }
  };

  const handleSeek = (val) => {
    if (!canControl || !audioRef.current) return;
    const seekTime = val[0];
    seekBlockRef.current = true;
    audioRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
    broadcastSeek(seekTime);
    setTimeout(() => {
      seekBlockRef.current = false;
    }, 500);
  };

  const handleSkipNext = () => {
    if (!canControl) return;
    broadcastSkipNext();
  };

  const handleSkipPrev = () => {
    if (!canControl) return;
    if (audioRef.current && audioRef.current.currentTime > 3) {
      handleSeek([0]);
      return;
    }
    broadcastSkipPrev();
  };

  const effectiveMuted = muted || volume === 0;
  const toggleMute = () => {
    if (effectiveMuted) {
      setMuted(false);
      if (volume === 0) setVolume(lastVolumeRef.current || 50);
    } else {
      setMuted(true);
    }
  };

  if (!isInRoom) return null;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="w-full">
      <audio
        ref={audioRef}
        src={audioURL}
        autoPlay={false}
      />

      {/* No song selected */}
      {!roomSongId && (
        <div className="flex flex-col items-center justify-center py-12 md:py-16 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/[0.04] flex items-center justify-center mb-4">
            <Music className="w-7 h-7 md:w-8 md:h-8 text-white/20" />
          </div>
          <p className="text-sm md:text-base font-medium text-white/40">
            No song playing
          </p>
          {canControl && (
            <p className="text-xs md:text-sm mt-1.5 text-white/25">
              Search and select a song to start listening
            </p>
          )}
        </div>
      )}

      {/* Song playing */}
      {roomSongId && (
        <>
          {/* Mobile Room Player — Full-featured vertical layout */}
          <div className="md:hidden">
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden">
              {/* Album Art Section with gradient overlay */}
              <div className="relative px-6 pt-6 pb-4">
                <div className="flex justify-center">
                  <div
                    className={`w-52 h-52 sm:w-60 sm:h-60 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 transition-transform duration-500 ${localPlaying ? "scale-100" : "scale-95 opacity-90"}`}>
                    {songData?.image ?
                      <img
                        src={songData.image[2]?.url || songData.image[1]?.url}
                        alt={songData?.name}
                        className="w-full h-full object-cover"
                      />
                    : <Skeleton className="w-full h-full" />}
                  </div>
                </div>
              </div>

              {/* Song Info */}
              <div className="text-center px-6 pb-3">
                <h3 className="text-white font-bold text-lg truncate leading-tight">
                  {songData?.name || "Loading..."}
                </h3>
                <p className="text-white/50 text-sm truncate mt-0.5">
                  {songData?.artists?.primary?.[0]?.name || "Artist"}
                </p>
              </div>

              {/* Progress */}
              <div className="px-6 pb-2 space-y-1">
                <Slider
                  value={[currentTime]}
                  max={duration || 1}
                  onValueChange={canControl ? handleSeek : undefined}
                  disabled={!canControl}
                  thumbClassName={`h-3 w-3 bg-white border-none shadow-lg ${!canControl ? "opacity-0" : ""}`}
                  trackClassName="h-[5px] bg-white/10 rounded-full"
                  rangeClassName="bg-primary rounded-full"
                  className="w-full"
                />
                <div className="flex justify-between text-[10px] text-white/35 font-mono px-0.5">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-8 py-4">
                <button
                  className={`p-2 transition-all duration-200 ${canControl ? "text-white/60 hover:text-white active:scale-90" : "text-white/20 cursor-not-allowed"}`}
                  disabled={!canControl}
                  onClick={handleSkipPrev}>
                  <SkipBack className="w-6 h-6 fill-current" />
                </button>

                <button
                  className={`h-16 w-16 rounded-full flex items-center justify-center transition-all duration-200 ${
                    canControl ?
                      "bg-primary text-black hover:scale-105 active:scale-95 shadow-xl shadow-primary/25"
                    : "bg-white/10 text-white/30 cursor-not-allowed"
                  }`}
                  onClick={handlePlayPause}
                  disabled={!canControl}>
                  {localPlaying ?
                    <Pause
                      className="w-7 h-7"
                      fill="currentColor"
                    />
                  : <Play
                      className="w-7 h-7 ml-1"
                      fill="currentColor"
                    />
                  }
                </button>

                <button
                  className={`p-2 transition-all duration-200 ${canControl ? "text-white/60 hover:text-white active:scale-90" : "text-white/20 cursor-not-allowed"}`}
                  disabled={!canControl}
                  onClick={handleSkipNext}>
                  <SkipForward className="w-6 h-6 fill-current" />
                </button>
              </div>

              {/* Volume */}
              <div className="flex items-center justify-center gap-3 px-6 pb-4">
                <button
                  onClick={toggleMute}
                  className="p-1 text-white/50 hover:text-white transition-colors">
                  {effectiveMuted ?
                    <VolumeX className="w-4 h-4" />
                  : <Volume2 className="w-4 h-4" />}
                </button>
                <div className="w-full max-w-[180px]">
                  <Slider
                    value={[volume]}
                    max={100}
                    step={1}
                    onValueChange={(v) => {
                      setVolume(v[0]);
                      if (muted && v[0] > 0) setMuted(false);
                    }}
                    thumbClassName="h-2.5 w-2.5 bg-white border-none"
                    trackClassName="h-[3px] bg-white/10"
                    rangeClassName="bg-white/70"
                    className="flex-1"
                  />
                </div>
              </div>

              {!canControl && (
                <p className="text-[10px] text-white/25 text-center pb-4 px-4">
                  Listening mode — only admin/controllers can change playback
                </p>
              )}
            </div>
          </div>

          {/* Desktop Room Player */}
          <div className="hidden md:block">
            <div className="flex items-center gap-5 p-5 bg-white/[0.03] rounded-2xl border border-white/[0.06] transition-all hover:bg-white/[0.04]">
              {/* Album Art */}
              <div
                className={`w-[88px] h-[88px] rounded-xl overflow-hidden shadow-xl shrink-0 ring-1 ring-white/10 transition-all duration-500 ${localPlaying ? "ring-primary/30" : ""}`}>
                {songData?.image ?
                  <img
                    src={songData.image[2]?.url || songData.image[1]?.url}
                    alt={songData?.name}
                    className={`w-full h-full object-cover transition-transform duration-700 ${localPlaying ? "scale-105" : "scale-100"}`}
                  />
                : <Skeleton className="w-full h-full" />}
              </div>

              {/* Song Info + Controls */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-white font-bold text-[15px] truncate leading-tight">
                      {songData?.name || "Loading..."}
                    </h3>
                    <p className="text-white/50 text-sm truncate mt-0.5">
                      {songData?.artists?.primary?.[0]?.name || "Artist"}
                    </p>
                  </div>

                  {/* Play Controls */}
                  <div className="flex items-center gap-2.5 shrink-0 ml-4">
                    <button
                      className={`p-1 transition-all duration-200 ${canControl ? "text-white/60 hover:text-white" : "text-white/20 cursor-not-allowed"}`}
                      disabled={!canControl}
                      onClick={handleSkipPrev}>
                      <SkipBack className="w-[18px] h-[18px] fill-current" />
                    </button>
                    <button
                      className={`h-10 w-10 rounded-full flex items-center justify-center transition-all duration-200 ${
                        canControl ?
                          "bg-primary text-black hover:scale-110 active:scale-95 shadow-lg shadow-primary/20"
                        : "bg-white/10 text-white/30 cursor-not-allowed"
                      }`}
                      onClick={handlePlayPause}
                      disabled={!canControl}>
                      {localPlaying ?
                        <Pause
                          className="w-[18px] h-[18px]"
                          fill="currentColor"
                        />
                      : <Play
                          className="w-[18px] h-[18px] ml-0.5"
                          fill="currentColor"
                        />
                      }
                    </button>
                    <button
                      className={`p-1 transition-all duration-200 ${canControl ? "text-white/60 hover:text-white" : "text-white/20 cursor-not-allowed"}`}
                      disabled={!canControl}
                      onClick={handleSkipNext}>
                      <SkipForward className="w-[18px] h-[18px] fill-current" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-white/35 font-mono w-10 text-right tabular-nums">
                    {formatTime(currentTime)}
                  </span>
                  <div className="flex-1">
                    <Slider
                      value={[currentTime]}
                      max={duration || 1}
                      onValueChange={canControl ? handleSeek : undefined}
                      disabled={!canControl}
                      thumbClassName={`h-3 w-3 bg-white border-none shadow-lg ${!canControl ? "hidden" : ""}`}
                      trackClassName="h-[5px] bg-white/10 rounded-full"
                      rangeClassName="bg-primary rounded-full"
                      className="w-full"
                    />
                  </div>
                  <span className="text-[11px] text-white/35 font-mono w-10 tabular-nums">
                    {formatTime(duration)}
                  </span>
                </div>
              </div>

              {/* Volume */}
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-white/50 hover:text-white hover:bg-white/[0.06] rounded-lg"
                  onClick={toggleMute}>
                  {effectiveMuted ?
                    <VolumeX className="w-4 h-4" />
                  : <Volume2 className="w-4 h-4" />}
                </Button>
                <div className="w-20">
                  <Slider
                    value={[volume]}
                    max={100}
                    step={1}
                    onValueChange={(v) => {
                      setVolume(v[0]);
                      if (muted && v[0] > 0) setMuted(false);
                    }}
                    thumbClassName="h-2.5 w-2.5 bg-white border-none"
                    trackClassName="h-[3px] bg-white/10"
                    rangeClassName="bg-white/70"
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {!canControl && (
              <p className="text-[11px] text-white/25 mt-2 text-center">
                Listening mode — only admin or controllers can change playback
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
