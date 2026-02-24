"use client";

import { useRoom } from "@/components/providers/room-provider";
import { useSupabase } from "@/components/providers/supabase-provider";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  Globe,
  ListMusic,
  Loader2,
  Lock,
  Music,
  Play,
  PlayCircle,
  Repeat,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

/**
 * Room Playlist Loader — allows admin/controller to load their playlists
 * into the room queue for auto-play with loop support.
 *
 * Features:
 * - Browse personal playlists
 * - "Play All" — loads entire playlist with loop-queue mode
 * - "Play Single" — plays one specific song from the playlist
 * - Queue all songs without replacing current playback
 * - Mobile responsive
 */
export function RoomPlaylistLoader() {
  const { supabase, user } = useSupabase();
  const {
    isAdmin,
    hasControl,
    broadcastChangeSong,
    broadcastPlayPlaylist,
    addToRoomQueue,
    isInRoom,
    roomSongId,
  } = useRoom();

  const [open, setOpen] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [playlistSongs, setPlaylistSongs] = useState([]);
  const [loadingSongs, setLoadingSongs] = useState(false);

  const canControl = isAdmin || hasControl;

  // Fetch user playlists
  const fetchPlaylists = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from("playlists")
      .select(
        `
        *,
        playlist_songs(song_id, thumbnail)
      `,
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (data) {
      const playlistsWithMeta = data.map((playlist) => ({
        ...playlist,
        thumbnails:
          playlist.playlist_songs
            ?.slice(0, 4)
            .map((s) => s.thumbnail)
            .filter(Boolean) || [],
        songCount: playlist.playlist_songs?.length || 0,
      }));
      setPlaylists(playlistsWithMeta);
    }
    setLoading(false);
  }, [supabase, user?.id]);

  // Fetch songs of a selected playlist
  const fetchPlaylistSongs = useCallback(
    async (playlistId) => {
      setLoadingSongs(true);
      const { data } = await supabase
        .from("playlist_songs")
        .select("*")
        .eq("playlist_id", playlistId)
        .order("added_at", { ascending: true });
      setPlaylistSongs(data || []);
      setLoadingSongs(false);
    },
    [supabase],
  );

  // Transform playlist_songs DB rows into queue-compatible objects
  const toQueueItem = (song) => ({
    id: song.song_id,
    name: song.song_title,
    image: [
      { url: song.thumbnail },
      { url: song.thumbnail },
      { url: song.thumbnail },
    ],
    artists: {
      primary: [{ name: song.artist || "Unknown" }],
    },
  });

  // Play All songs (auto-play with loop)
  const handlePlayAll = () => {
    if (playlistSongs.length === 0) return;
    const queueItems = playlistSongs.map(toQueueItem);
    broadcastPlayPlaylist(queueItems, 0, "loop-queue");
    toast.success(
      `Playing ${playlistSongs.length} songs from "${selectedPlaylist.name}"`,
    );
    setOpen(false);
    setSelectedPlaylist(null);
  };

  // Queue All songs (add to current queue without changing current song)
  const handleQueueAll = () => {
    if (playlistSongs.length === 0) return;
    const queueItems = playlistSongs.map(toQueueItem);
    queueItems.forEach((item) => addToRoomQueue(item));
    toast.success(
      `Added ${playlistSongs.length} songs to queue from "${selectedPlaylist.name}"`,
    );
    setOpen(false);
    setSelectedPlaylist(null);
  };

  // Play single song from playlist
  const handlePlaySingle = (song) => {
    const item = toQueueItem(song);
    broadcastChangeSong(item.id, item);
    toast.success(`Playing "${song.song_title}"`);
  };

  // Queue single song
  const handleQueueSingle = (e, song) => {
    e.stopPropagation();
    const item = toQueueItem(song);
    addToRoomQueue(item);
    toast.success(`Added "${song.song_title}" to queue`);
  };

  const handlePlaylistClick = (playlist) => {
    setSelectedPlaylist(playlist);
    fetchPlaylistSongs(playlist.id);
  };

  const handleBack = () => {
    setSelectedPlaylist(null);
    setPlaylistSongs([]);
  };

  useEffect(() => {
    if (open) {
      fetchPlaylists();
      setSelectedPlaylist(null);
      setPlaylistSongs([]);
    }
  }, [fetchPlaylists, open]);

  if (!isInRoom || !canControl) return null;

  // Collapsed state — just a button
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3.5 py-2.5 hover:bg-white/[0.06] hover:border-primary/20 transition-all duration-200 group">
        <ListMusic className="w-4 h-4 text-primary/60 group-hover:text-primary transition-colors" />
        <span className="text-sm text-white/50 group-hover:text-white/70 transition-colors">
          Load playlist to room...
        </span>
      </button>
    );
  }

  // Expanded panel
  return (
    <div className="w-full bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden animate-in fade-in-0 slide-in-from-top-2 duration-200">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
        {selectedPlaylist ?
          <button
            onClick={handleBack}
            className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.08] transition-all">
            <ArrowLeft className="w-4 h-4" />
          </button>
        : <ListMusic className="w-4 h-4 text-primary/70" />}
        <h3 className="text-sm font-semibold text-white/80 flex-1 truncate">
          {selectedPlaylist ? selectedPlaylist.name : "Your Playlists"}
        </h3>
        <button
          onClick={() => {
            setOpen(false);
            setSelectedPlaylist(null);
          }}
          className="p-1 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.08] transition-all">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Playlist list view */}
      {!selectedPlaylist && (
        <>
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-primary/50 animate-spin" />
            </div>
          )}

          {!loading && playlists.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-white/25">
              <Music className="w-6 h-6 mb-2 opacity-50" />
              <p className="text-xs">No playlists found</p>
              <p className="text-[10px] mt-1 text-white/15">
                Create playlists from the sidebar
              </p>
            </div>
          )}

          {playlists.length > 0 && (
            <ScrollArea className="max-h-[240px] md:max-h-[300px]">
              <div className="p-1.5">
                {playlists.map((playlist) => (
                  <button
                    key={playlist.id}
                    onClick={() => handlePlaylistClick(playlist)}
                    className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl hover:bg-white/[0.04] transition-all duration-200 group text-left">
                    {/* Thumbnail grid */}
                    <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0 ring-1 ring-white/[0.06]">
                      {playlist.thumbnails && playlist.thumbnails.length > 0 ?
                        <div className="grid grid-cols-2 gap-px h-full w-full bg-black">
                          {[0, 1, 2, 3].map((index) => (
                            <div
                              key={index}
                              className="relative bg-zinc-900">
                              {playlist.thumbnails[index] ?
                                <img
                                  src={playlist.thumbnails[index]}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              : <div className="w-full h-full flex items-center justify-center bg-white/[0.03]">
                                  <Music className="w-2 h-2 text-white/20" />
                                </div>
                              }
                            </div>
                          ))}
                        </div>
                      : <div className="w-full h-full bg-white/[0.06] flex items-center justify-center">
                          <ListMusic className="w-4 h-4 text-white/20" />
                        </div>
                      }
                    </div>

                    {/* Playlist info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/90 truncate leading-tight font-medium group-hover:text-white transition-colors">
                        {playlist.name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {playlist.is_public ?
                          <Globe className="w-2.5 h-2.5 text-white/25" />
                        : <Lock className="w-2.5 h-2.5 text-white/25" />}
                        <span className="text-[11px] text-white/35">
                          {playlist.songCount}{" "}
                          {playlist.songCount === 1 ? "song" : "songs"}
                        </span>
                      </div>
                    </div>

                    {/* Quick play icon */}
                    <PlayCircle className="w-5 h-5 text-white/15 group-hover:text-primary/60 transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </>
      )}

      {/* Selected playlist — songs view */}
      {selectedPlaylist && (
        <>
          {/* Action buttons */}
          <div className="px-3 py-2.5 border-b border-white/[0.06] flex gap-2">
            <Button
              size="sm"
              onClick={handlePlayAll}
              disabled={loadingSongs || playlistSongs.length === 0}
              className="flex-1 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/20 rounded-xl h-9 text-xs font-semibold gap-1.5">
              <Repeat className="w-3.5 h-3.5" />
              Play All & Loop
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleQueueAll}
              disabled={loadingSongs || playlistSongs.length === 0}
              className="flex-1 text-white/60 hover:text-white hover:bg-white/[0.08] rounded-xl h-9 text-xs font-semibold gap-1.5">
              <ListMusic className="w-3.5 h-3.5" />
              Queue All
            </Button>
          </div>

          {loadingSongs && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-primary/50 animate-spin" />
            </div>
          )}

          {!loadingSongs && playlistSongs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-white/25">
              <Music className="w-6 h-6 mb-2 opacity-50" />
              <p className="text-xs">This playlist is empty</p>
            </div>
          )}

          {playlistSongs.length > 0 && (
            <ScrollArea className="max-h-[220px] md:max-h-[280px]">
              <div className="p-1.5">
                {playlistSongs.map((song, idx) => (
                  <div
                    key={song.id}
                    className="flex items-center gap-3 px-2.5 py-2 rounded-xl hover:bg-white/[0.04] transition-all duration-200 group">
                    {/* Index */}
                    <span className="text-[11px] text-white/15 w-5 text-center font-mono shrink-0 tabular-nums">
                      {idx + 1}
                    </span>

                    {/* Thumbnail */}
                    <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 relative ring-1 ring-white/[0.06]">
                      {song.thumbnail ?
                        <img
                          src={song.thumbnail}
                          alt={song.song_title}
                          className="w-full h-full object-cover"
                        />
                      : <div className="w-full h-full bg-white/[0.06] flex items-center justify-center">
                          <Music className="w-3 h-3 text-white/30" />
                        </div>
                      }
                      {/* Play overlay on hover */}
                      <button
                        onClick={() => handlePlaySingle(song)}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center rounded-lg">
                        <Play className="w-3.5 h-3.5 text-white fill-white" />
                      </button>
                    </div>

                    {/* Song info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/90 truncate leading-tight">
                        {song.song_title}
                      </p>
                      <p className="text-[11px] text-white/35 truncate mt-0.5">
                        {song.artist || "Unknown"}
                      </p>
                    </div>

                    {/* Queue single button */}
                    {roomSongId && (
                      <button
                        onClick={(e) => handleQueueSingle(e, song)}
                        className="p-1.5 rounded-lg text-white/15 hover:text-primary hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-all duration-200 shrink-0"
                        title="Add to queue">
                        <ListMusic className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </>
      )}
    </div>
  );
}
