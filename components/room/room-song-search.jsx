"use client";

import { useRoom } from "@/components/providers/room-provider";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getSongsByQuery } from "@/lib/fetch";
import { ListPlus, Music, Play, Search, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";

/**
 * Song search component for room — admin/controller can search & play songs.
 * Now supports "Play Now" and "Add to Queue".
 */
export function RoomSongSearch() {
  const {
    isAdmin,
    hasControl,
    broadcastChangeSong,
    addToRoomQueue,
    isInRoom,
    roomSongId,
  } = useRoom();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef(null);

  const canControl = isAdmin || hasControl;

  const handleSearch = useCallback(async (q) => {
    if (!q.trim()) {
      setResults([]);
      setShowResults(false);
      return;
    }
    setSearching(true);
    try {
      const res = await getSongsByQuery(q);
      if (res) {
        const data = await res.json();
        setResults(data?.data?.results || []);
        setShowResults(true);
      }
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setSearching(false);
    }
  }, []);

  const onInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => handleSearch(val), 400);
  };

  const handlePlayNow = (song) => {
    broadcastChangeSong(song.id, song);
    setShowResults(false);
    setQuery("");
    setResults([]);
  };

  const handleAddToQueue = (e, song) => {
    e.stopPropagation();
    addToRoomQueue(song);
  };

  if (!isInRoom || !canControl) return null;

  return (
    <div className="relative w-full">
      <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
        <Search className="w-4 h-4 text-white/40 shrink-0" />
        <Input
          placeholder="Search songs to play..."
          value={query}
          onChange={onInputChange}
          className="border-none bg-transparent text-white placeholder:text-white/30 h-8 px-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setResults([]);
              setShowResults(false);
            }}
            className="text-white/40 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {showResults && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50">
          <ScrollArea className="max-h-[300px]">
            <div className="p-1">
              {results.map((song) => (
                <div
                  key={song.id}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/10 transition-colors text-left group">
                  <button
                    onClick={() => handlePlayNow(song)}
                    className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 relative">
                      {song.image?.[1]?.url ?
                        <img
                          src={song.image[1].url}
                          alt={song.name}
                          className="w-full h-full object-cover"
                        />
                      : <div className="w-full h-full bg-white/10 flex items-center justify-center">
                          <Music className="w-4 h-4 text-white/40" />
                        </div>
                      }
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Play className="w-4 h-4 text-white fill-white" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate font-medium">
                        {song.name}
                      </p>
                      <p className="text-xs text-white/50 truncate">
                        {song.artists?.primary?.[0]?.name || "Unknown"}
                      </p>
                    </div>
                  </button>
                  {/* Add to Queue button */}
                  {roomSongId && (
                    <button
                      onClick={(e) => handleAddToQueue(e, song)}
                      className="p-1.5 rounded-lg text-white/40 hover:text-primary hover:bg-white/5 transition-colors shrink-0"
                      title="Add to Queue">
                      <ListPlus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {showResults && results.length === 0 && !searching && query && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] border border-white/10 rounded-xl p-6 text-center shadow-2xl z-50">
          <p className="text-white/40 text-sm">No songs found</p>
        </div>
      )}

      {searching && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] border border-white/10 rounded-xl p-6 text-center shadow-2xl z-50">
          <p className="text-white/40 text-sm">Searching...</p>
        </div>
      )}
    </div>
  );
}
