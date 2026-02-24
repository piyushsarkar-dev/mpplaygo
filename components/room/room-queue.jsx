"use client";

import { useRoom } from "@/components/providers/room-provider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ListMusic, Music, Play, Trash2 } from "lucide-react";

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
    isInRoom,
  } = useRoom();

  const canControl = isAdmin || hasControl;

  if (!isInRoom || !roomSongId) return null;

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-3 px-1">
        <ListMusic className="w-4 h-4 text-white/50" />
        <h3 className="text-sm font-semibold text-white/70">Up Next</h3>
        {roomQueue.length > 0 && (
          <span className="text-xs text-white/30 ml-auto">
            {roomQueue.length} song{roomQueue.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {loadingQueue && roomQueue.length === 0 && (
        <div className="flex items-center justify-center py-6">
          <div className="flex items-center gap-2 text-white/30 text-sm">
            <div className="w-4 h-4 border-2 border-white/20 border-t-primary rounded-full animate-spin" />
            Loading suggestions...
          </div>
        </div>
      )}

      {!loadingQueue && roomQueue.length === 0 && (
        <div className="flex flex-col items-center justify-center py-6 text-white/30">
          <Music className="w-6 h-6 mb-2" />
          <p className="text-xs">No songs in queue</p>
        </div>
      )}

      {roomQueue.length > 0 && (
        <ScrollArea className="max-h-[280px] md:max-h-[320px]">
          <div className="space-y-0.5">
            {roomQueue.map((song, idx) => (
              <div
                key={song.id}
                className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors group">
                {/* Index */}
                <span className="text-xs text-white/20 w-5 text-center font-mono shrink-0">
                  {idx + 1}
                </span>

                {/* Thumbnail */}
                <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 relative">
                  {song.image?.[1]?.url || song.image?.[0]?.url ?
                    <img
                      src={song.image[1]?.url || song.image[0]?.url}
                      alt={song.name}
                      className="w-full h-full object-cover"
                    />
                  : <div className="w-full h-full bg-white/10 flex items-center justify-center">
                      <Music className="w-3 h-3 text-white/40" />
                    </div>
                  }
                  {/* Play overlay on hover (controllers only) */}
                  {canControl && (
                    <button
                      onClick={() => broadcastChangeSong(song.id, song)}
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play className="w-3.5 h-3.5 text-white fill-white" />
                    </button>
                  )}
                </div>

                {/* Song info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{song.name}</p>
                  <p className="text-xs text-white/40 truncate">
                    {song.artists?.primary?.[0]?.name ||
                      song.primaryArtists ||
                      "Unknown"}
                  </p>
                </div>

                {/* Remove button (controllers only) */}
                {canControl && (
                  <button
                    onClick={() => removeFromRoomQueue(song.id)}
                    className="p-1 rounded text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all shrink-0"
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
