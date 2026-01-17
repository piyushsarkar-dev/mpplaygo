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
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function CreatePlaylistModal({ children, onCreated }) {
	const [open, setOpen] = useState(false);
	const [name, setName] = useState("");
	const [isPublic, setIsPublic] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const { supabase, user } = useSupabase();
	const router = useRouter();

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
			setOpen(false);
			setName("");
			if (onCreated) onCreated(data);
			router.refresh();
		}
	};

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
				<form
					onSubmit={handleCreate}
					className="space-y-4">
					<div className="space-y-2">
						<label className="text-sm font-medium">Name</label>
						<Input
							value={name}
							onChange={(e) => setName(e.target.value)}
							required
							placeholder="My Awesome Playlist"
						/>
					</div>
					<div className="flex items-center gap-2">
						<input
							type="checkbox"
							id="public"
							checked={isPublic}
							onChange={(e) => setIsPublic(e.target.checked)}
							className="h-4 w-4"
						/>
						<label
							htmlFor="public"
							className="text-sm font-medium">
							Public Playlist
						</label>
					</div>
					<DialogFooter>
						<Button
							disabled={isLoading}
							type="submit">
							Create
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
