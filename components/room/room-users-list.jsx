"use client";

import { useRoom } from "@/components/providers/room-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Crown, Shield, ShieldOff, Users } from "lucide-react";

export function RoomUsersList() {
	const { room, members, onlineUsers, isAdmin, updatePermission } = useRoom();

	const isOnline = (userId) =>
		onlineUsers.some((u) => u.user_id === userId);

	if (!room) return null;

	return (
		<div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
			{/* Header */}
			<div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Users className="w-4 h-4 text-white/70" />
					<span className="text-sm font-medium text-white">
						Members
					</span>
				</div>
				<span className="text-xs text-white/50 bg-white/10 px-2 py-0.5 rounded-full">
					{members.length}
				</span>
			</div>

			{/* Member List */}
			<ScrollArea className="max-h-[280px] md:max-h-[400px]">
				<div className="p-2 space-y-1">
					{members.map((member) => {
						const memberIsAdmin = member.user_id === room.admin_id;
						const online = isOnline(member.user_id);

						return (
							<div
								key={member.user_id}
								className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors">
								{/* Avatar with online indicator */}
								<div className="relative shrink-0">
									<Avatar className="w-8 h-8">
										<AvatarImage src={member.avatar_url} />
										<AvatarFallback className="bg-white/10 text-white text-xs">
											{(member.username || member.full_name || "U")[0]?.toUpperCase()}
										</AvatarFallback>
									</Avatar>
									<div
										className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#181818] ${
											online ? "bg-green-500" : "bg-white/30"
										}`}
									/>
								</div>

								{/* Name & badges */}
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-1.5">
										<span className="text-sm text-white truncate">
											{member.username || member.full_name || "User"}
										</span>
										{memberIsAdmin && (
											<Crown className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
										)}
										{!memberIsAdmin && member.has_control && (
											<Shield className="w-3.5 h-3.5 text-primary shrink-0" />
										)}
									</div>
									<span className="text-[10px] text-white/40">
										{memberIsAdmin
											? "Admin"
											: member.has_control
												? "Controller"
												: "Listener"}
									</span>
								</div>

								{/* Admin can toggle control for non-admin members */}
								{isAdmin && !memberIsAdmin && (
									<Button
										size="icon"
										variant="ghost"
										className="h-7 w-7 shrink-0 text-white/50 hover:text-white hover:bg-white/10"
										onClick={() =>
											updatePermission(
												room.id,
												member.user_id,
												!member.has_control,
											)
										}
										title={
											member.has_control
												? "Revoke control"
												: "Grant control"
										}>
										{member.has_control ? (
											<ShieldOff className="w-4 h-4" />
										) : (
											<Shield className="w-4 h-4" />
										)}
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
