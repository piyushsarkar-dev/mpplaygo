"use client";

import { useRoom } from "@/components/providers/room-provider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ListMusic, Music, Play, Repeat, Repeat1, Trash2 } from "lucide-react";

/**
 * "Up Next" queue display for room.
 * Shows auto-loaded suggestions and manually queued songs.
 * Admin/controllers can remove items or play them immediately.
 */
export function RoomQueue() {
  const {
    isAdmin,
    hasControl,
    roomQueue,
    roomSongId,
    loadingQueue,
    removeFromRoomQueue,
    broadcastChangeSong,
    roomLoopMode,
    isInRoom,
  } = useRoom();

  const canControl = isAdmin || hasControl;

  if (!isInRoom || !roomSongId) return null;

  return (
    <div className="w-full bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
        <ListMusic className="w-4 h-4 text-primary/70" />
        <h3 className="text-sm font-semibold text-white/80">Up Next</h3>
        {roomLoopMode !== "none" && (
          <span className="flex items-center gap-1 text-[10px] text-primary/80 bg-primary/10 px-2 py-0.5 rounded-full border border-primary/15">
            {roomLoopMode === "loop-single" ?
              <Repeat1 className="w-2.5 h-2.5" />
            : <Repeat className="w-2.5 h-2.5" />}
            {roomLoopMode === "loop-single" ? "Loop 1" : "Loop"}
          </span>
        )}
        {roomQueue.length > 0 && (
          <span className="ml-auto text-[11px] text-white/30 bg-white/[0.06] px-2 py-0.5 rounded-full">
            {roomQueue.length} song{roomQueue.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {loadingQueue && roomQueue.length === 0 && (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2 text-white/25 text-sm">
            <div className="w-4 h-4 border-2 border-white/15 border-t-primary rounded-full animate-spin" />
            Loading suggestions...
          </div>
        </div>
      )}

      {!loadingQueue && roomQueue.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-white/25">
          <Music className="w-6 h-6 mb-2 opacity-50" />
          <p className="text-xs">No songs in queue</p>
          {canControl && (
            <p className="text-[10px] mt-1 text-white/15">
              Search to add songs
            </p>
          )}
        </div>
      )}

      {roomQueue.length > 0 && (
        <ScrollArea className="max-h-[260px] md:max-h-[340px]">
          <div className="p-1.5">
            {roomQueue.map((song, idx) => (
              <div
                key={song.id}
                className="flex items-center gap-3 px-2.5 py-2 rounded-xl hover:bg-white/[0.04] transition-all duration-200 group">
                {/* Index */}
                <span className="text-[11px] text-white/15 w-5 text-center font-mono shrink-0 tabular-nums">
                  {idx + 1}
                </span>

                {/* Thumbnail */}
                <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 relative ring-1 ring-white/[0.06]">
                  {song.image?.[1]?.url || song.image?.[0]?.url ?
                    <img
                      src={song.image[1]?.url || song.image[0]?.url}
                      alt={song.name}
                      className="w-full h-full object-cover"
                    />
                  : <div className="w-full h-full bg-white/[0.06] flex items-center justify-center">
                      <Music className="w-3 h-3 text-white/30" />
                    </div>
                  }
                  {/* Play overlay on hover (controllers only) */}
                  {canControl && (
                    <button
                      onClick={() => broadcastChangeSong(song.id, song)}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center rounded-lg">
                      <Play className="w-3.5 h-3.5 text-white fill-white" />
                    </button>
                  )}
                </div>

                {/* Song info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/90 truncate leading-tight">
                    {song.name}
                  </p>
                  <p className="text-[11px] text-white/35 truncate mt-0.5">
                    {song.artists?.primary?.[0]?.name ||
                      song.primaryArtists ||
                      "Unknown"}
                  </p>
                </div>

                {/* Remove button (controllers only) */}
                {canControl && (
                  <button
                    onClick={() => removeFromRoomQueue(song.id)}
                    className="p-1.5 rounded-lg text-white/15 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all duration-200 shrink-0"
                    title="Remove from queue">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
