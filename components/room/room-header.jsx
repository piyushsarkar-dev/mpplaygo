"use client";

import { useRoom } from "@/components/providers/room-provider";
import { Button } from "@/components/ui/button";
import { getRoomShareUrl } from "@/lib/room/utils";
import {
  Copy,
  Crown,
  DoorOpen,
  Globe,
  Lock,
  Radio,
  Share2,
  Trash2,
  Wifi,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function RoomHeader() {
  const router = useRouter();
  const {
    room,
    isAdmin,
    isInRoom,
    exitRoom,
    destroyRoom,
    members,
    onlineUsers,
  } = useRoom();

  if (!room || !isInRoom) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getRoomShareUrl(room.id));
    toast.success("Room link copied!");
  };

  const handleShare = async () => {
    const url = getRoomShareUrl(room.id);
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${room.name} on MpPlaygo`,
          text: `Listen together in ${room.name}!`,
          url,
        });
      } catch {
        // User cancelled
      }
    } else {
      handleCopyLink();
    }
  };

  const handleLeave = async () => {
    await exitRoom();
    router.push("/rooms");
    toast.success("Left room");
  };

  const handleDestroy = async () => {
    if (
      confirm(
        "Are you sure you want to destroy this room? All users will be disconnected.",
      )
    ) {
      await destroyRoom(room.id);
      router.push("/rooms");
      toast.success("Room destroyed");
    }
  };

  return (
    <div className="space-y-3">
      {/* Room Title Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white/[0.03] border border-white/[0.06] rounded-2xl p-3 md:p-4">
        <div className="flex items-center gap-3 min-w-0">
          {/* Room Icon */}
          <div className="relative shrink-0">
            <div className="h-11 w-11 md:h-13 md:w-13 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
              <Radio className="w-5 h-5 md:w-6 md:h-6 text-primary" />
            </div>
            {/* Live pulse indicator */}
            <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-black room-live-pulse" />
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-base md:text-xl font-bold text-white truncate leading-tight">
              {room.name}
            </h1>
            <div className="flex items-center gap-2 text-[11px] md:text-xs text-white/40 mt-0.5 flex-wrap">
              {room.is_private ?
                <span className="flex items-center gap-1 bg-white/[0.06] px-2 py-0.5 rounded-full">
                  <Lock className="w-2.5 h-2.5" /> Private
                </span>
              : <span className="flex items-center gap-1 bg-white/[0.06] px-2 py-0.5 rounded-full">
                  <Globe className="w-2.5 h-2.5" /> Public
                </span>
              }
              <span className="flex items-center gap-1">
                <span className="text-white/30">•</span>
                {members.length} members
              </span>
              <span className="flex items-center gap-1 text-green-400">
                <Wifi className="w-2.5 h-2.5" />
                {onlineUsers.length} online
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleShare}
            className="text-white/60 hover:text-white hover:bg-white/[0.08] rounded-xl h-9 px-2.5 md:px-3 text-xs">
            <Share2 className="w-4 h-4 md:mr-1.5" />
            <span className="hidden md:inline">Share</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyLink}
            className="text-white/60 hover:text-white hover:bg-white/[0.08] rounded-xl h-9 px-2.5 md:px-3 text-xs">
            <Copy className="w-4 h-4 md:mr-1.5" />
            <span className="hidden md:inline">Copy</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLeave}
            className="text-red-400/80 hover:text-red-400 hover:bg-red-500/10 rounded-xl h-9 px-2.5 md:px-3 text-xs">
            <DoorOpen className="w-4 h-4 md:mr-1.5" />
            <span className="hidden md:inline">Leave</span>
          </Button>

          {isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDestroy}
              className="text-red-400/80 hover:text-red-400 hover:bg-red-500/10 rounded-xl h-9 px-2.5 md:px-3 text-xs">
              <Trash2 className="w-4 h-4 md:mr-1.5" />
              <span className="hidden md:inline">Destroy</span>
            </Button>
          )}
        </div>
      </div>

      {/* Admin badge */}
      {isAdmin && (
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/15 rounded-xl text-yellow-500 text-[11px] font-medium">
          <Crown className="w-3 h-3" />
          Room Admin
        </div>
      )}
    </div>
  );
}
