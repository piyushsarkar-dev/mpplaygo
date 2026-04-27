"use client";
import { useSupabase } from "@/components/providers/supabase-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { Children, cloneElement, isValidElement, useState } from "react";
import { toast } from "sonner";

function PlaylistForm({
  onCancel,
  onSubmit,
  isLoading,
  name,
  onNameChange,
  isPublic,
  onPublicChange,
  inline = false,
}) {
  return (
    <form
      onSubmit={onSubmit}
      className={cn("space-y-4", inline && "pt-1")}>
      <div className="space-y-2">
        <label className="text-sm font-medium">Name</label>
        <Input
          value={name}
          onChange={onNameChange}
          required
          placeholder="My Awesome Playlist"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="public"
          checked={isPublic}
          onChange={onPublicChange}
          className="h-4 w-4"
        />
        <label
          htmlFor="public"
          className="text-sm font-medium">
          Public Playlist
        </label>
      </div>
      {inline ?
        <div className="flex gap-2 pt-1">
          <Button
            type="button"
            variant="ghost"
            className="flex-1"
            onClick={onCancel}>
            Cancel
          </Button>
          <Button
            disabled={isLoading}
            type="submit"
            className="flex-1">
            Create
          </Button>
        </div>
      : <DialogFooter>
          <Button
            disabled={isLoading}
            type="submit">
            Create
          </Button>
        </DialogFooter>
      }
    </form>
  );
}

export function CreatePlaylistModal({ children, onCreated, mode = "dialog" }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { supabase, user } = useSupabase();
  const router = useRouter();
  const isInline = mode === "inline";

  const resetForm = () => {
    setOpen(false);
    setName("");
    setIsPublic(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error("You must be logged in");
      return;
    }
    setIsLoading(true);

    const { data, error } = await supabase
      .from("playlists")
      .insert({
        user_id: user.id,
        name: name,
        is_public: isPublic,
      })
      .select()
      .single();

    setIsLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Playlist created!");
      resetForm();
      if (onCreated) onCreated(data);
      router.refresh();
    }
  };

  const handleNameChange = (e) => setName(e.target.value);
  const handlePublicChange = (e) => setIsPublic(e.target.checked);
  const handleInlineToggle = () => setOpen((current) => !current);

  const form = (
    <PlaylistForm
      onCancel={isInline ? resetForm : undefined}
      onSubmit={handleCreate}
      isLoading={isLoading}
      name={name}
      onNameChange={handleNameChange}
      isPublic={isPublic}
      onPublicChange={handlePublicChange}
      inline={isInline}
    />
  );

  if (isInline) {
    const trigger = Children.only(children);
    const triggerNode =
      isValidElement(trigger) ?
        cloneElement(trigger, {
          type: trigger.props?.type ?? "button",
          onClick: (event) => {
            trigger.props?.onClick?.(event);
            if (!event.defaultPrevented) handleInlineToggle();
          },
        })
      : <div onClick={handleInlineToggle}>{children}</div>;

    return (
      <div className="space-y-3">
        {triggerNode}
        {open && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg shadow-black/20 backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="mb-3">
              <p className="text-sm font-semibold text-white">
                Create Playlist
              </p>
              <p className="text-xs text-white/45">
                Add a new playlist to your collection.
              </p>
            </div>
            {form}
          </div>
        )}
      </div>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Playlist</DialogTitle>
          <DialogDescription>
            Add a new playlist to your collection.
          </DialogDescription>
        </DialogHeader>
        {form}
      </DialogContent>
    </Dialog>
  );
}
