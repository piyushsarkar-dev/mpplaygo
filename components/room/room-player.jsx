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
        // Use cached data if available
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

  // Sync seek from room state (tight threshold for listeners, loose for controller)
  useEffect(() => {
    if (!audioRef.current || seekBlockRef.current) return;
    if (!canControl) {
      // Listeners: tight sync from admin's broadcast
      const diff = Math.abs(audioRef.current.currentTime - roomCurrentTime);
      if (diff > 0.8) {
        audioRef.current.currentTime = roomCurrentTime;
      }
    } else {
      // Controller: only sync on large jumps (e.g., new joiner sync)
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

  // Handle song ended — auto-play next from roomQueue
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onEnded = () => {
      if (canControl) {
        if (roomQueue.length > 0) {
          const nextSong = roomQueue[0];
          broadcastChangeSong(nextSong.id, nextSong);
        } else {
          // No queue items — stop
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
    if (localPlaying) {
      broadcastPause(audioRef.current?.currentTime || 0);
      audioRef.current?.pause();
      setLocalPlaying(false);
    } else {
      broadcastPlay(audioRef.current?.currentTime || 0);
      audioRef.current?.play().catch(() => {});
      setLocalPlaying(true);
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
    // If more than 3 seconds into the song, restart instead
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

  return (
    <div className="w-full">
      <audio
        ref={audioRef}
        src={audioURL}
        autoPlay={false}
      />

      {/* No song selected */}
      {!roomSongId && (
        <div className="flex flex-col items-center justify-center py-8 md:py-12 text-white/40">
          <Music className="w-10 h-10 md:w-12 md:h-12 mb-3" />
          <p className="text-sm md:text-base font-medium">No song playing</p>
          {canControl && (
            <p className="text-xs md:text-sm mt-1">
              Search and select a song to start
            </p>
          )}
        </div>
      )}

      {/* Song playing */}
      {roomSongId && (
        <>
          {/* Mobile Room Player */}
          <div className="md:hidden">
            <div className="flex flex-col items-center gap-4 px-4 py-4">
              {/* Album Art */}
              <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-2xl overflow-hidden shadow-2xl ring-2 ring-white/10">
                {songData?.image ?
                  <img
                    src={songData.image[2]?.url || songData.image[1]?.url}
                    alt={songData?.name}
                    className={`w-full h-full object-cover ${localPlaying ? "animate-pulse-slow" : ""}`}
                  />
                : <Skeleton className="w-full h-full" />}
              </div>

              {/* Song Info */}
              <div className="text-center w-full px-2">
                <h3 className="text-white font-bold text-lg truncate">
                  {songData?.name || "Loading..."}
                </h3>
                <p className="text-white/60 text-sm truncate">
                  {songData?.artists?.primary?.[0]?.name || "Artist"}
                </p>
              </div>

              {/* Progress */}
              <div className="w-full px-2 space-y-1">
                <Slider
                  value={[currentTime]}
                  max={duration || 1}
                  onValueChange={canControl ? handleSeek : undefined}
                  disabled={!canControl}
                  thumbClassName={`h-3 w-3 bg-white border-none ${!canControl ? "opacity-50" : ""}`}
                  trackClassName="h-1 bg-white/20"
                  rangeClassName="bg-primary"
                  className="w-full"
                />
                <div className="flex justify-between text-[10px] text-white/50 font-mono">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-6">
                <button
                  className={`p-2 transition-all ${canControl ? "text-white/70 hover:text-white active:scale-90" : "text-white/30 cursor-not-allowed"}`}
                  disabled={!canControl}
                  onClick={handleSkipPrev}>
                  <SkipBack className="w-6 h-6 fill-current" />
                </button>

                <button
                  className={`h-14 w-14 rounded-full flex items-center justify-center transition-all ${
                    canControl ?
                      "bg-white text-black hover:scale-110 active:scale-95 shadow-xl"
                    : "bg-white/20 text-white/50 cursor-not-allowed"
                  }`}
                  onClick={handlePlayPause}
                  disabled={!canControl}>
                  {localPlaying ?
                    <Pause className="w-6 h-6" />
                  : <Play className="w-6 h-6 ml-0.5" />}
                </button>

                <button
                  className={`p-2 transition-all ${canControl ? "text-white/70 hover:text-white active:scale-90" : "text-white/30 cursor-not-allowed"}`}
                  disabled={!canControl}
                  onClick={handleSkipNext}>
                  <SkipForward className="w-6 h-6 fill-current" />
                </button>
              </div>

              {/* Volume */}
              <div className="flex items-center gap-2 w-full max-w-[200px]">
                <button
                  onClick={toggleMute}
                  className="p-1 text-white/70 hover:text-white">
                  {effectiveMuted ?
                    <VolumeX className="w-4 h-4" />
                  : <Volume2 className="w-4 h-4" />}
                </button>
                <Slider
                  value={[volume]}
                  max={100}
                  step={1}
                  onValueChange={(v) => {
                    setVolume(v[0]);
                    if (muted && v[0] > 0) setMuted(false);
                  }}
                  thumbClassName="h-2.5 w-2.5 bg-white border-none"
                  trackClassName="h-1 bg-white/20"
                  rangeClassName="bg-white"
                  className="flex-1"
                />
              </div>

              {!canControl && (
                <p className="text-[10px] text-white/30">
                  Listening mode — only admin/controllers can change playback
                </p>
              )}
            </div>
          </div>

          {/* Desktop Room Player */}
          <div className="hidden md:block">
            <div className="flex items-center gap-6 p-6 bg-white/5 rounded-2xl border border-white/10">
              {/* Album Art */}
              <div className="w-20 h-20 rounded-xl overflow-hidden shadow-xl shrink-0 ring-2 ring-white/10">
                {songData?.image ?
                  <img
                    src={songData.image[2]?.url || songData.image[1]?.url}
                    alt={songData?.name}
                    className={`w-full h-full object-cover ${localPlaying ? "animate-spin-slow" : ""}`}
                    style={{ animationDuration: "10s" }}
                  />
                : <Skeleton className="w-full h-full" />}
              </div>

              {/* Song Info + Controls */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0">
                    <h3 className="text-white font-bold truncate">
                      {songData?.name || "Loading..."}
                    </h3>
                    <p className="text-white/60 text-sm truncate">
                      {songData?.artists?.primary?.[0]?.name || "Artist"}
                    </p>
                  </div>

                  {/* Play Controls */}
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <button
                      className={`transition-all ${canControl ? "text-white/70 hover:text-white" : "text-white/30 cursor-not-allowed"}`}
                      disabled={!canControl}
                      onClick={handleSkipPrev}>
                      <SkipBack className="w-5 h-5 fill-current" />
                    </button>
                    <button
                      className={`h-10 w-10 rounded-full flex items-center justify-center transition-all ${
                        canControl ?
                          "bg-white text-black hover:scale-110 active:scale-95"
                        : "bg-white/20 text-white/50 cursor-not-allowed"
                      }`}
                      onClick={handlePlayPause}
                      disabled={!canControl}>
                      {localPlaying ?
                        <Pause className="w-5 h-5" />
                      : <Play className="w-5 h-5 ml-0.5" />}
                    </button>
                    <button
                      className={`transition-all ${canControl ? "text-white/70 hover:text-white" : "text-white/30 cursor-not-allowed"}`}
                      disabled={!canControl}
                      onClick={handleSkipNext}>
                      <SkipForward className="w-5 h-5 fill-current" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-white/50 font-mono w-10 text-right">
                    {formatTime(currentTime)}
                  </span>
                  <div className="flex-1">
                    <Slider
                      value={[currentTime]}
                      max={duration || 1}
                      onValueChange={canControl ? handleSeek : undefined}
                      disabled={!canControl}
                      thumbClassName={`h-3 w-3 bg-white border-none ${!canControl ? "hidden" : ""}`}
                      trackClassName="h-1 bg-white/20"
                      rangeClassName="bg-primary"
                      className="w-full"
                    />
                  </div>
                  <span className="text-xs text-white/50 font-mono w-10">
                    {formatTime(duration)}
                  </span>
                </div>
              </div>

              {/* Volume */}
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-white/70 hover:text-white"
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
                    trackClassName="h-1 bg-white/20"
                    rangeClassName="bg-white"
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {!canControl && (
              <p className="text-xs text-white/30 mt-2 text-center">
                Listening mode — only admin or controllers can change playback
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
