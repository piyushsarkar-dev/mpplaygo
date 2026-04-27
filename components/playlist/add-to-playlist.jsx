"use client";
import { useSupabase } from "@/components/providers/supabase-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { getImageUrl } from "@/lib/media";
import { Check, Music2, Plus } from "lucide-react";
import {
  Children,
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useState,
} from "react";
import { toast } from "sonner";
import { CreatePlaylistModal } from "./create-playlist-modal";

export function AddToPlaylist({ children, song }) {
  const { supabase, user } = useSupabase();
  const [open, setOpen] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingPlaylistId, setSavingPlaylistId] = useState(null);
  const songId = song?.id;
  const songImageUrl = getImageUrl(song?.image);

  const fetchPlaylists = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from("playlists")
      .select("id,name,is_public,playlist_songs(song_id)")
      .eq("user_id", user.id)
      .order("name", { ascending: true });
    const nextPlaylists = (data || []).map((playlist) => ({
      ...playlist,
      songIds: (playlist.playlist_songs || [])
        .map((item) => item.song_id)
        .filter(Boolean),
    }));
    setPlaylists(nextPlaylists);
    setLoading(false);
  }, [supabase, user?.id]);

  useEffect(() => {
    if (open && user) {
      fetchPlaylists();
    }
  }, [fetchPlaylists, open, user]);

  const updatePlaylistSongIds = useCallback(
    (playlistId) => {
      if (!songId) return;
      setPlaylists((current) =>
        current.map((playlist) =>
          playlist.id === playlistId ?
            {
              ...playlist,
              songIds: Array.from(
                new Set([...(playlist.songIds || []), songId]),
              ),
            }
          : playlist,
        ),
      );
    },
    [songId],
  );

  const addToPlaylist = async (playlist) => {
    if (!playlist || !songId) return;

    if ((playlist.songIds || []).includes(songId)) {
      toast.message("Song is already in this playlist");
      updatePlaylistSongIds(playlist.id);
      return;
    }

    setSavingPlaylistId(playlist.id);
    const { data: existingSong } = await supabase
      .from("playlist_songs")
      .select("id")
      .eq("playlist_id", playlist.id)
      .eq("song_id", songId)
      .maybeSingle();

    if (existingSong) {
      toast.message("Song is already in this playlist");
      updatePlaylistSongIds(playlist.id);
      setSavingPlaylistId(null);
      return;
    }

    const { error } = await supabase.from("playlist_songs").insert({
      playlist_id: playlist.id,
      song_id: songId,
      song_title: song.title,
      artist: song.artist,
      thumbnail: songImageUrl,
    });

    if (error) {
      if (error.code === "23505") {
        toast.message("Song is already in this playlist");
        updatePlaylistSongIds(playlist.id);
      } else {
        console.error(error);
        toast.error("Failed to add to playlist");
      }
    } else {
      toast.success(`Added to \"${playlist.name}\"`);
      updatePlaylistSongIds(playlist.id);
      setOpen(false);
    }
    setSavingPlaylistId(null);
  };

  const isSavedSomewhere = playlists.some((playlist) =>
    (playlist.songIds || []).includes(songId),
  );

  const triggerChild =
    isSavedSomewhere && isValidElement(children) ?
      cloneElement(children, {
        children: Children.map(children.props.children, (child) => {
          if (!isValidElement(child)) return child;

          const iconName = String(
            child.type?.displayName || child.type?.name || "",
          );
          if (!/Plus/i.test(iconName)) return child;

          return <Check className={child.props.className || "h-4 w-4"} />;
        }),
      })
    : children;

  if (!user) {
    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          toast.error("Please login to save songs");
        }}>
        {children}
      </div>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}>
      <DialogTrigger asChild>{triggerChild}</DialogTrigger>
      <DialogContent
        className="sm:max-w-[425px]"
        onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Add to Playlist</DialogTitle>
          <DialogDescription>
            Save &quot;{song.title}&quot; to a playlist
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          <CreatePlaylistModal
            onCreated={(p) => {
              const playlistWithSongs = { ...p, songIds: [] };
              setPlaylists([playlistWithSongs, ...playlists]);
              addToPlaylist(playlistWithSongs);
            }}>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2">
              <Plus className="h-4 w-4" /> Create New Playlist
            </Button>
          </CreatePlaylistModal>

          {loading ?
            <div className="space-y-2 py-1">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg">
                  <Skeleton className="h-4 w-4 rounded-full shrink-0" />
                  <div className="flex-1 min-w-0">
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          : playlists.map((p) => {
              const alreadySaved = (p.songIds || []).includes(songId);
              return (
                <Button
                  key={p.id}
                  variant="ghost"
                  className="w-full justify-start gap-2"
                  disabled={alreadySaved || savingPlaylistId === p.id}
                  onClick={() => addToPlaylist(p)}>
                  {alreadySaved ?
                    <Check className="h-4 w-4 text-emerald-500" />
                  : <Music2 className="h-4 w-4 text-muted-foreground" />}
                  <span>{p.name}</span>
                  {alreadySaved && (
                    <span className="ml-auto text-xs text-emerald-500">
                      Added
                    </span>
                  )}
                </Button>
              );
            })
          }
        </div>
      </DialogContent>
    </Dialog>
  );
}
