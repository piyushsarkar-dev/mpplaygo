"use client";

import { useRoom } from "@/components/providers/room-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Lock, Radio } from "lucide-react";
import { useState } from "react";

export function JoinRoomModal({
  roomId,
  roomName,
  isPrivate,
  open,
  onOpenChange,
  onJoined,
}) {
  const [password, setPassword] = useState("");
  const { enterRoom, loading, error } = useRoom();

  const handleJoin = async () => {
    const success = await enterRoom(roomId, isPrivate ? password : undefined);
    if (success) {
      onJoined?.();
      onOpenChange(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm bg-[#141414] border-white/[0.08] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2.5 text-base">
            <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center">
              <Lock className="w-4 h-4 text-primary" />
            </div>
            Join Room
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="bg-white/[0.03] rounded-xl p-3.5 border border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Radio className="w-4 h-4 text-primary/70" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-white/35 uppercase tracking-wider font-medium">
                  Room
                </p>
                <p className="text-white font-medium text-sm truncate">
                  {roomName || roomId}
                </p>
              </div>
            </div>
          </div>

          {isPrivate && (
            <div>
              <label className="text-xs text-white/50 mb-1.5 block font-medium">
                Password Required
              </label>
              <Input
                type="password"
                placeholder="Enter room password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 rounded-xl h-11 focus:border-primary/30"
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              />
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/15 rounded-xl px-3 py-2.5">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <Button
            onClick={handleJoin}
            disabled={loading}
            className="w-full bg-primary text-black font-bold hover:bg-primary/90 h-12 rounded-xl text-sm transition-all duration-200 hover:shadow-lg hover:shadow-primary/20">
            {loading ?
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                Joining...
              </div>
            : "Join Room"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
