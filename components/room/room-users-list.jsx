"use client";

import { useRoom } from "@/components/providers/room-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Crown, Shield, ShieldOff, Users, Wifi } from "lucide-react";

export function RoomUsersList() {
  const { room, members, onlineUsers, isAdmin, updatePermission } = useRoom();

  const isOnline = (userId) => onlineUsers.some((u) => u.user_id === userId);

  if (!room) return null;

  // Sort: online members first, then offline
  const sortedMembers = [...members].sort((a, b) => {
    const aOnline = isOnline(a.user_id);
    const bOnline = isOnline(b.user_id);
    if (aOnline && !bOnline) return -1;
    if (!aOnline && bOnline) return 1;
    // Admin always first
    if (a.user_id === room.admin_id) return -1;
    if (b.user_id === room.admin_id) return 1;
    return 0;
  });

  const onlineCount = members.filter((m) => isOnline(m.user_id)).length;

  return (
    <div className="bg-white/[0.03] rounded-2xl border border-white/[0.06] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary/70" />
          <span className="text-sm font-semibold text-white/80">Members</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-[11px] text-green-400/80 bg-green-500/10 px-2 py-0.5 rounded-full">
            <Wifi className="w-2.5 h-2.5" />
            {onlineCount}
          </span>
          <span className="text-[11px] text-white/30 bg-white/[0.06] px-2 py-0.5 rounded-full">
            {members.length}
          </span>
        </div>
      </div>

      {/* Member List */}
      <ScrollArea className="max-h-[260px] md:max-h-[420px]">
        <div className="p-1.5 space-y-0.5">
          {sortedMembers.map((member) => {
            const memberIsAdmin = member.user_id === room.admin_id;
            const online = isOnline(member.user_id);

            return (
              <div
                key={member.user_id}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                  online ? "hover:bg-white/[0.04]" : "opacity-50"
                }`}>
                {/* Avatar with online indicator */}
                <div className="relative shrink-0">
                  <Avatar className="w-9 h-9 ring-1 ring-white/[0.08]">
                    <AvatarImage src={member.avatar_url} />
                    <AvatarFallback className="bg-white/[0.06] text-white/70 text-xs font-medium">
                      {(member.username ||
                        member.full_name ||
                        "U")[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#151515] transition-colors ${
                      online ? "bg-green-500" : "bg-white/20"
                    }`}
                  />
                </div>

                {/* Name & badges */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-white/90 truncate leading-tight">
                      {member.username || member.full_name || "User"}
                    </span>
                    {memberIsAdmin && (
                      <Crown className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                    )}
                    {!memberIsAdmin && member.has_control && (
                      <Shield className="w-3.5 h-3.5 text-primary shrink-0" />
                    )}
                  </div>
                  <span
                    className={`text-[10px] leading-tight ${
                      memberIsAdmin ? "text-yellow-500/60"
                      : member.has_control ? "text-primary/50"
                      : "text-white/25"
                    }`}>
                    {memberIsAdmin ?
                      "Admin"
                    : member.has_control ?
                      "Controller"
                    : "Listener"}
                  </span>
                </div>

                {/* Admin can toggle control for non-admin members */}
                {isAdmin && !memberIsAdmin && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className={`h-7 w-7 shrink-0 rounded-lg transition-all duration-200 ${
                      member.has_control ?
                        "text-primary/80 hover:text-primary hover:bg-primary/10"
                      : "text-white/30 hover:text-white hover:bg-white/[0.06]"
                    }`}
                    onClick={() =>
                      updatePermission(
                        room.id,
                        member.user_id,
                        !member.has_control,
                      )
                    }
                    title={
                      member.has_control ? "Revoke control" : "Grant control"
                    }>
                    {member.has_control ?
                      <ShieldOff className="w-3.5 h-3.5" />
                    : <Shield className="w-3.5 h-3.5" />}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
