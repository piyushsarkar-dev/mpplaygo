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
} from "lucide-react";
import { toast } from "sonner";

export function RoomHeader() {
	const { room, isAdmin, isInRoom, exitRoom, destroyRoom, members, onlineUsers } = useRoom();

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
	};

	const handleDestroy = async () => {
		if (confirm("Are you sure you want to destroy this room? All users will be disconnected.")) {
			await destroyRoom(room.id);
		}
	};

	return (
		<div className="space-y-3 md:space-y-4">
			{/* Room Title Bar */}
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex items-center gap-3 min-w-0">
					<div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
						<Radio className="w-5 h-5 md:w-6 md:h-6 text-primary" />
					</div>
					<div className="min-w-0">
						<h1 className="text-lg md:text-2xl font-bold text-white truncate">
							{room.name}
						</h1>
						<div className="flex items-center gap-2 text-xs text-white/50">
							{room.is_private ? (
								<span className="flex items-center gap-1">
									<Lock className="w-3 h-3" /> Private
								</span>
							) : (
								<span className="flex items-center gap-1">
									<Globe className="w-3 h-3" /> Public
								</span>
							)}
							<span>•</span>
							<span>{members.length} members</span>
							<span>•</span>
							<span className="text-green-400">
								{onlineUsers.length} online
							</span>
						</div>
					</div>
				</div>

				{/* Actions */}
				<div className="flex items-center gap-2 shrink-0">
					<Button
						variant="ghost"
						size="sm"
						onClick={handleShare}
						className="text-white/70 hover:text-white hover:bg-white/10 rounded-xl h-9 px-3 text-xs md:text-sm">
						<Share2 className="w-4 h-4 mr-1.5" />
						<span className="hidden xs:inline">Share</span>
					</Button>

					<Button
						variant="ghost"
						size="sm"
						onClick={handleCopyLink}
						className="text-white/70 hover:text-white hover:bg-white/10 rounded-xl h-9 px-3 text-xs md:text-sm">
						<Copy className="w-4 h-4 mr-1.5" />
						<span className="hidden xs:inline">Copy Link</span>
					</Button>

					{isAdmin ? (
						<Button
							variant="ghost"
							size="sm"
							onClick={handleDestroy}
							className="text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl h-9 px-3 text-xs md:text-sm">
							<Trash2 className="w-4 h-4 mr-1.5" />
							<span className="hidden xs:inline">Destroy</span>
						</Button>
					) : (
						<Button
							variant="ghost"
							size="sm"
							onClick={handleLeave}
							className="text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl h-9 px-3 text-xs md:text-sm">
							<DoorOpen className="w-4 h-4 mr-1.5" />
							<span className="hidden xs:inline">Leave</span>
						</Button>
					)}
				</div>
			</div>

			{/* Admin badge */}
			{isAdmin && (
				<div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-full text-yellow-500 text-xs font-medium">
					<Crown className="w-3.5 h-3.5" />
					You are the room admin
				</div>
			)}
		</div>
	);
}
