"use client";

import { useSupabase } from "@/components/providers/supabase-provider";
import { Button } from "@/components/ui/button";
import { MusicContext } from "@/hooks/use-context";
import { Globe, Lock, Play, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useContext, useEffect, useState } from "react";
import { toast } from "sonner";

export default function PlaylistPage({ params }) {
	const { id } = params;
	const { supabase, user } = useSupabase();
	const [playlist, setPlaylist] = useState(null);
	const [songs, setSongs] = useState([]);
	const [loading, setLoading] = useState(true);
	const router = useRouter();
	const musicContext = useContext(MusicContext);

	useEffect(() => {
		const fetchData = async () => {
			// Fetch Playlist
			const { data: playlistData, error: playlistError } = await supabase
				.from("playlists")
				.select("*, profiles(username)")
				.eq("id", id)
				.single();

			if (playlistError) {
				toast.error("Error loading playlist");
				setLoading(false);
				return;
			}
			setPlaylist(playlistData);

			// Fetch Songs
			const { data: songsData, error: songsError } = await supabase
				.from("playlist_songs")
				.select("*")
				.eq("playlist_id", id)
				.order("added_at", { ascending: true });

			if (songsData) setSongs(songsData);
			setLoading(false);
		};

		if (supabase) fetchData();
	}, [id, supabase]);

	if (loading) return <div className="p-10 text-center">Loading...</div>;
	if (!playlist)
		return (
			<div className="p-10 text-center">
				Playlist not found or private
			</div>
		);

	const isOwner = user?.id === playlist.user_id;

	const handlePlaySong = (songId) => {
		musicContext.setMusic(songId);
	};

	const handleDeleteSong = async (songId) => {
		if (!isOwner) return;
		const { error } = await supabase
			.from("playlist_songs")
			.delete()
			.eq("id", songId);
		if (error) {
			toast.error("Failed to remove song");
		} else {
			toast.success("Song removed");
			setSongs(songs.filter((s) => s.id !== songId));
		}
	};

	const handleDeletePlaylist = async () => {
		if (!isOwner) return;
		if (!confirm("Are you sure you want to delete this playlist?")) return;

		const { error } = await supabase
			.from("playlists")
			.delete()
			.eq("id", playlist.id);
		if (error) {
			toast.error("Failed to delete playlist");
		} else {
			toast.success("Playlist deleted");
			router.push(`/profile/${user.user_metadata.full_name}`);
		}
	};

	return (
		<div className="container mx-auto py-10 px-4 md:px-0">
			{/* Header */}
			<div className="flex flex-col md:flex-row gap-8 items-end mb-10">
				<div className="h-52 w-52 bg-secondary/50 rounded-lg flex items-center justify-center shadow-2xl">
					{songs.length > 0 && songs[0].thumbnail ?
						<img
							src={songs[0].thumbnail}
							alt={playlist.name}
							className="h-full w-full object-cover rounded-lg"
						/>
					:	<Play className="h-20 w-20 text-muted-foreground/50" />}
				</div>
				<div className="flex-1 space-y-4">
					<p className="uppercase text-xs font-bold tracking-wider text-muted-foreground">
						Playlist
					</p>
					<h1 className="text-4xl md:text-6xl font-bold">
						{playlist.name}
					</h1>
					<p className="text-muted-foreground">
						Created by{" "}
						<span className="text-foreground font-medium">
							{playlist.profiles?.username}
						</span>{" "}
						• {songs.length} songs
					</p>
					<div className="flex items-center gap-1 text-xs text-muted-foreground/80">
						{playlist.is_public ?
							<Globe className="h-3 w-3" />
						:	<Lock className="h-3 w-3" />}
						<span>{playlist.is_public ? "Public" : "Private"}</span>
					</div>
				</div>
				{isOwner && (
					<Button
						variant="destructive"
						size="icon"
						onClick={handleDeletePlaylist}>
						<Trash2 className="h-4 w-4" />
					</Button>
				)}
			</div>

			{/* Songs List */}
			<div className="space-y-2">
				{songs.map((song, index) => (
					<div
						key={song.id}
						className="group flex items-center gap-4 p-2 rounded-md hover:bg-secondary/50 transition-colors">
						<div className="w-8 text-center text-muted-foreground group-hover:hidden">
							{index + 1}
						</div>
						<div
							className="w-8 h-8 hidden group-hover:flex items-center justify-center cursor-pointer"
							onClick={() => handlePlaySong(song.song_id)}>
							<Play className="h-4 w-4 fill-current" />
						</div>

						<img
							src={song.thumbnail}
							alt={song.title}
							className="h-10 w-10 rounded object-cover bg-secondary"
						/>

						<div className="flex-1 min-w-0">
							<p
								className="font-medium truncate cursor-pointer hover:underline"
								onClick={() => handlePlaySong(song.song_id)}>
								{song.song_title}
							</p>
							<p className="text-xs text-muted-foreground truncate">
								{song.artist}
							</p>
						</div>

						{/* Add Song Actions (Like remove) here */}
						{isOwner && (
							<Button
								variant="ghost"
								size="icon"
								className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
								onClick={() => handleDeleteSong(song.id)}>
								<Trash2 className="h-4 w-4" />
							</Button>
						)}
					</div>
				))}
				{songs.length === 0 && (
					<div className="text-center py-10 text-muted-foreground">
						This playlist is empty. Add some songs!
					</div>
				)}
			</div>
		</div>
	);
}
