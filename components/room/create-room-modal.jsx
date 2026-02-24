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
import { Check, Copy, Globe, Lock, Radio, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function CreateRoomModal({ children }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState("");
  const [createdRoom, setCreatedRoom] = useState(null);
  const [copied, setCopied] = useState(false);
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
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenChange = (open) => {
    setOpen(open);
    if (!open) {
      setCreatedRoom(null);
      setName("");
      setPassword("");
      setIsPrivate(false);
      setCopied(false);
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
        <DialogContent className="sm:max-w-md bg-[#141414] border-white/[0.08] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2.5 text-base">
              <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center">
                {createdRoom ?
                  <Sparkles className="w-4 h-4 text-primary" />
                : <Radio className="w-4 h-4 text-primary" />}
              </div>
              {createdRoom ? "Room Created!" : "Create a Room"}
            </DialogTitle>
          </DialogHeader>

          {!createdRoom ?
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-xs text-white/50 mb-1.5 block font-medium">
                  Room Name
                </label>
                <Input
                  placeholder="My Music Room"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 rounded-xl h-11 focus:border-primary/30"
                  maxLength={50}
                  onKeyDown={(e) =>
                    e.key === "Enter" && !isPrivate && handleCreate()
                  }
                />
              </div>

              {/* Privacy Toggle */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsPrivate(false)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all duration-200 text-sm font-medium ${
                    !isPrivate ?
                      "bg-primary/15 border-primary/30 text-primary"
                    : "bg-white/[0.03] border-white/[0.06] text-white/40 hover:bg-white/[0.06] hover:text-white/60"
                  }`}>
                  <Globe className="w-4 h-4" />
                  Public
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrivate(true)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all duration-200 text-sm font-medium ${
                    isPrivate ?
                      "bg-primary/15 border-primary/30 text-primary"
                    : "bg-white/[0.03] border-white/[0.06] text-white/40 hover:bg-white/[0.06] hover:text-white/60"
                  }`}>
                  <Lock className="w-4 h-4" />
                  Private
                </button>
              </div>

              {isPrivate && (
                <div className="animate-fade-in-up">
                  <label className="text-xs text-white/50 mb-1.5 block font-medium">
                    Room Password
                  </label>
                  <Input
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 rounded-xl h-11 focus:border-primary/30"
                    maxLength={30}
                    onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  />
                </div>
              )}

              <Button
                onClick={handleCreate}
                disabled={loading}
                className="w-full bg-primary text-black font-bold hover:bg-primary/90 h-12 rounded-xl text-sm transition-all duration-200 hover:shadow-lg hover:shadow-primary/20">
                {loading ?
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    Creating...
                  </div>
                : "Create Room"}
              </Button>
            </div>
          : <div className="space-y-4 pt-2">
              <div className="bg-white/[0.03] rounded-xl p-4 space-y-3 border border-white/[0.06]">
                <div>
                  <p className="text-[11px] text-white/35 uppercase tracking-wider font-medium">
                    Room Name
                  </p>
                  <p className="text-white font-medium mt-0.5">
                    {createdRoom.name}
                  </p>
                </div>
                <div className="h-px bg-white/[0.06]" />
                <div>
                  <p className="text-[11px] text-white/35 uppercase tracking-wider font-medium">
                    Share Link
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <code className="text-xs text-primary bg-primary/10 px-3 py-1.5 rounded-lg flex-1 truncate">
                      {getRoomShareUrl(createdRoom.id)}
                    </code>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={handleCopyLink}
                      className="shrink-0 h-8 w-8 text-white/50 hover:text-white hover:bg-white/[0.06] rounded-lg">
                      {copied ?
                        <Check className="w-4 h-4 text-green-400" />
                      : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleGoToRoom}
                className="w-full bg-primary text-black font-bold hover:bg-primary/90 h-12 rounded-xl text-sm transition-all duration-200 hover:shadow-lg hover:shadow-primary/20">
                Enter Room
              </Button>
            </div>
          }
        </DialogContent>
      </Dialog>
    </>
  );
}
