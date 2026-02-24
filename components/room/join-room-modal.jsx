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
import { Lock } from "lucide-react";
import { useState } from "react";

export function JoinRoomModal({ roomId, roomName, isPrivate, open, onOpenChange, onJoined }) {
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
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-sm bg-[#181818] border-white/10">
				<DialogHeader>
					<DialogTitle className="text-white flex items-center gap-2">
						<Lock className="w-5 h-5 text-primary" />
						Join Room
					</DialogTitle>
				</DialogHeader>

				<div className="space-y-4 pt-2">
					<div className="bg-white/5 rounded-xl p-3">
						<p className="text-xs text-white/50">Room</p>
						<p className="text-white font-medium">{roomName || roomId}</p>
					</div>

					{isPrivate && (
						<div>
							<label className="text-sm text-white/70 mb-1.5 block">
								Password Required
							</label>
							<Input
								type="password"
								placeholder="Enter room password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
								onKeyDown={(e) => e.key === "Enter" && handleJoin()}
							/>
						</div>
					)}

					{error && (
						<p className="text-red-400 text-sm">{error}</p>
					)}

					<Button
						onClick={handleJoin}
						disabled={loading}
						className="w-full bg-primary text-black font-bold hover:bg-primary/90 h-11 rounded-xl">
						{loading ? "Joining..." : "Join Room"}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
