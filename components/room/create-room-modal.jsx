"use client";

import { AuthModal } from "@/components/auth/auth-modal";
import { useRoom } from "@/components/providers/room-provider";
import { useSupabase } from "@/components/providers/supabase-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getRoomShareUrl } from "@/lib/room/utils";
import { Copy, Globe, Lock, Radio } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function CreateRoomModal({ children }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState("");
  const [createdRoom, setCreatedRoom] = useState(null);
  const { createRoom, loading } = useRoom();
  const { user } = useSupabase();
  const router = useRouter();

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Room name is required");
      return;
    }
    if (isPrivate && !password.trim()) {
      toast.error("Password is required for private rooms");
      return;
    }

    const room = await createRoom({ name, isPrivate, password });
    if (room) {
      setCreatedRoom(room);
      toast.success("Room created!");
    }
  };

  const handleGoToRoom = () => {
    if (createdRoom) {
      setOpen(false);
      setName("");
      setPassword("");
      setIsPrivate(false);
      router.push(`/room/${createdRoom.id}`);
      setCreatedRoom(null);
    }
  };

  const handleCopyLink = () => {
    if (createdRoom) {
      navigator.clipboard.writeText(getRoomShareUrl(createdRoom.id));
      toast.success("Link copied!");
    }
  };

  const handleOpenChange = (open) => {
    setOpen(open);
    if (!open) {
      setCreatedRoom(null);
      setName("");
      setPassword("");
      setIsPrivate(false);
    }
  };

  // If not logged in, wrap with AuthModal
  if (!user) {
    return <AuthModal>{children}</AuthModal>;
  }

  return (
    <>
      <div onClick={() => setOpen(true)}>{children}</div>
      <Dialog
        open={open}
        onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md bg-[#181818] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Radio className="w-5 h-5 text-primary" />
              {createdRoom ? "Room Created!" : "Create a Room"}
            </DialogTitle>
          </DialogHeader>

          {!createdRoom ?
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-sm text-white/70 mb-1.5 block">
                  Room Name
                </label>
                <Input
                  placeholder="My Music Room"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  maxLength={50}
                />
              </div>

              {/* Privacy Toggle */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsPrivate(false)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all text-sm font-medium ${
                    !isPrivate ?
                      "bg-primary/20 border-primary/50 text-primary"
                    : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
                  }`}>
                  <Globe className="w-4 h-4" />
                  Public
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrivate(true)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all text-sm font-medium ${
                    isPrivate ?
                      "bg-primary/20 border-primary/50 text-primary"
                    : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
                  }`}>
                  <Lock className="w-4 h-4" />
                  Private
                </button>
              </div>

              {isPrivate && (
                <div>
                  <label className="text-sm text-white/70 mb-1.5 block">
                    Room Password
                  </label>
                  <Input
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                    maxLength={30}
                  />
                </div>
              )}

              <Button
                onClick={handleCreate}
                disabled={loading}
                className="w-full bg-primary text-black font-bold hover:bg-primary/90 h-11 rounded-xl">
                {loading ? "Creating..." : "Create Room"}
              </Button>
            </div>
          : <div className="space-y-4 pt-2">
              <div className="bg-white/5 rounded-xl p-4 space-y-3">
                <div>
                  <p className="text-xs text-white/50">Room Name</p>
                  <p className="text-white font-medium">{createdRoom.name}</p>
                </div>
                <div>
                  <p className="text-xs text-white/50">Room ID</p>
                  <p className="text-white font-mono text-sm">
                    {createdRoom.id}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-white/50">Share Link</p>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-xs text-primary bg-primary/10 px-2 py-1 rounded flex-1 truncate">
                      {getRoomShareUrl(createdRoom.id)}
                    </code>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={handleCopyLink}
                      className="shrink-0 h-8 w-8 text-white/70 hover:text-white">
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleGoToRoom}
                className="w-full bg-primary text-black font-bold hover:bg-primary/90 h-11 rounded-xl">
                Enter Room
              </Button>
            </div>
          }
        </DialogContent>
      </Dialog>
    </>
  );
}
