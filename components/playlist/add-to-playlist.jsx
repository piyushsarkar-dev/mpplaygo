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
import { Music2, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CreatePlaylistModal } from "./create-playlist-modal";

export function AddToPlaylist({ children, song }) {
  const { supabase, user } = useSupabase();
  const [open, setOpen] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchPlaylists = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("playlists")
      .select("*")
      .eq("user_id", user.id)
      .order("name", { ascending: true });
    setPlaylists(data || []);
    setLoading(false);
  }, [supabase, user?.id]);

  useEffect(() => {
    if (open && user) {
      fetchPlaylists();
    }
  }, [fetchPlaylists, open, user]);

  const addToPlaylist = async (playlistId) => {
    const { error } = await supabase.from("playlist_songs").insert({
      playlist_id: playlistId,
      song_id: song.id,
      song_title: song.title,
      artist: song.artist,
      thumbnail: getImageUrl(song.image),
    });

    if (error) {
      console.error(error);
      toast.error("Failed to add to playlist");
    } else {
      toast.success("Added to playlist");
      setOpen(false);
    }
  };

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
      <DialogTrigger asChild>{children}</DialogTrigger>
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
              setPlaylists([p, ...playlists]);
              addToPlaylist(p.id);
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
          : playlists.map((p) => (
              <Button
                key={p.id}
                variant="ghost"
                className="w-full justify-start gap-2"
                onClick={() => addToPlaylist(p.id)}>
                <Music2 className="h-4 w-4 text-muted-foreground" />
                {p.name}
              </Button>
            ))
          }
        </div>
      </DialogContent>
    </Dialog>
  );
}
