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
	const { supabase, user, profile } = useSupabase();
	const [playlist, setPlaylist] = useState(null);
	const [songs, setSongs] = useState([]);
	const [loading, setLoading] = useState(true);
	const [copying, setCopying] = useState(false);
	const [togglingPublic, setTogglingPublic] = useState(false);
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
	const canCopy = Boolean(user && !isOwner && playlist?.is_public);

	const handleCopyPlaylist = async () => {
		if (!user) {
			toast.error("You must be logged in");
			return;
		}
		if (!playlist?.is_public) return;

		setCopying(true);
		try {
			const { data: newPlaylist, error: playlistError } = await supabase
				.from("playlists")
				.insert({
					user_id: user.id,
					name: `Copy of ${playlist.name}`,
					is_public: false,
				})
				.select("*")
				.single();

			if (playlistError) throw playlistError;

			if (songs.length > 0) {
				const rows = songs.map((s) => ({
					playlist_id: newPlaylist.id,
					song_id: s.song_id,
					song_title: s.song_title,
					artist: s.artist,
					thumbnail: s.thumbnail,
				}));
				const { error: songsError } = await supabase
					.from("playlist_songs")
					.insert(rows);
				if (songsError) throw songsError;
			}

			toast.success("Playlist copied to your account");
			router.push(`/playlist/${newPlaylist.id}`);
		} catch (e) {
			toast.error(e?.message || "Failed to copy playlist");
		} finally {
			setCopying(false);
		}
	};

	const handlePlaySong = (songId) => {
		try {
			sessionStorage.setItem("mpplaygo_user_initiated_play", "true");
		} catch {}
		try {
			localStorage.setItem("p", "true");
		} catch {}
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
			toast.success("Song removed from playlist");
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
			router.push(
				`/profile/${encodeURIComponent(profile?.username || user?.user_metadata?.full_name || "")}`,
			);
		}
	};

	const handleTogglePublic = async () => {
		if (!isOwner) return;
		setTogglingPublic(true);
		try {
			const nextValue = !playlist.is_public;
			const { data, error } = await supabase
				.from("playlists")
				.update({ is_public: nextValue })
				.eq("id", playlist.id)
				.select("*, profiles(username)")
				.single();
			if (error) throw error;
			setPlaylist(data);
			toast.success(
				nextValue ?
					"Playlist is now public"
				:	"Playlist is now private",
			);
		} catch (e) {
			toast.error(e?.message || "Failed to update playlist");
		} finally {
			setTogglingPublic(false);
		}
	};

	return (
		<div className="container mx-auto py-10 px-4 md:px-0">
			{/* Header */}
			<div className="flex flex-col md:flex-row gap-8 items-end mb-10">
				<div className="h-52 w-52 bg-secondary/50 rounded-lg overflow-hidden shadow-2xl">
					{songs.length > 0 ? (
						songs.length === 1 ? (
							// Single thumbnail for 1 song
							<img
								src={songs[0].thumbnail}
								alt={playlist.name}
								className="h-full w-full object-cover"
							/>
						) : (
							// Grid layout for multiple songs (Spotify style)
							<div className="grid grid-cols-2 gap-0 h-full w-full">
								{[0, 1, 2, 3].map((index) => (
									<div key={index} className="relative aspect-square bg-secondary/40">
										{songs[index]?.thumbnail ? (
											<img
												src={songs[index].thumbnail}
												alt=""
												className="w-full h-full object-cover"
											/>
										) : (
											<div className="w-full h-full flex items-center justify-center">
												<Play className="h-8 w-8 text-muted-foreground/30" />
											</div>
										)}
									</div>
								))}
							</div>
						)
					) : (
						<div className="h-full w-full flex items-center justify-center">
							<Play className="h-20 w-20 text-muted-foreground/50" />
						</div>
					)}
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
					{isOwner && (
						<Button
							variant="outline"
							onClick={handleTogglePublic}
							disabled={togglingPublic}>
							{togglingPublic ?
								"Updating…"
							: playlist.is_public ?
								"Make private"
							:	"Make public"}
						</Button>
					)}
					{canCopy && (
						<Button
							variant="secondary"
							onClick={handleCopyPlaylist}
							disabled={copying}>
							{copying ? "Copying…" : "Copy playlist"}
						</Button>
					)}
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
