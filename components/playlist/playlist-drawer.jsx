"use client";
import { useSupabase } from "@/components/providers/supabase-provider";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { ListMusic, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CreatePlaylistModal } from "./create-playlist-modal";

export function PlaylistDrawer({ children }) {
	const { supabase, user } = useSupabase();
	const [playlists, setPlaylists] = useState([]);
	const [loading, setLoading] = useState(false);
	const [open, setOpen] = useState(false);

	const fetchPlaylists = async () => {
		if (!user) return;
		setLoading(true);
		const { data } = await supabase
			.from("playlists")
			.select("*")
			.eq("user_id", user.id)
			.order("created_at", { ascending: false });
		setPlaylists(data || []);
		setLoading(false);
	};

	useEffect(() => {
		if (open) {
			fetchPlaylists();
		}
	}, [open, user]);

	return (
		<Sheet
			open={open}
			onOpenChange={setOpen}>
			<SheetTrigger asChild>{children}</SheetTrigger>
			<SheetContent
				side="left"
				className="w-[300px] sm:w-[350px] border-r-white/10 bg-black/40 backdrop-blur-xl text-white pt-10">
				<SheetHeader className="mb-6">
					<SheetTitle className="text-2xl font-bold text-white flex items-center gap-2">
						<ListMusic className="w-6 h-6" />
						Playlists
					</SheetTitle>
				</SheetHeader>

				<div className="flex flex-col gap-4 h-full pb-10">
					<CreatePlaylistModal onCreated={fetchPlaylists}>
						<Button className="w-full bg-white/10 hover:bg-white/20 text-white border-0 justify-start gap-2 h-12 rounded-xl backdrop-blur-sm">
							<Plus className="w-5 h-5" />
							Create New Playlist
						</Button>
					</CreatePlaylistModal>

					<div className="h-px bg-white/10 w-full my-2" />

					<ScrollArea className="flex-1 -mx-6 px-6">
						<div className="flex flex-col gap-2">
							{loading && (
								<div className="text-white/50 text-sm p-4">
									Loading playlists...
								</div>
							)}

							{!loading && playlists.length === 0 && (
								<div className="text-white/50 text-sm text-center py-10">
									No playlists yet. Create one!
								</div>
							)}

							{playlists.map((playlist) => (
								<Link
									key={playlist.id}
									href={`/playlist/${playlist.id}`}
									onClick={() => setOpen(false)}
									className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 transition-all group">
									<div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center group-hover:bg-zinc-700 transition">
										<ListMusic className="w-5 h-5 text-zinc-400 group-hover:text-white" />
									</div>
									<div className="flex-1 min-w-0">
										<p className="text-white font-medium truncate">
											{playlist.name}
										</p>
										<p className="text-xs text-white/50 truncate">
											{playlist.is_public ?
												"Public"
											:	"Private"}{" "}
											• Playlist
										</p>
									</div>
								</Link>
							))}
						</div>
					</ScrollArea>
				</div>
			</SheetContent>
		</Sheet>
	);
}
