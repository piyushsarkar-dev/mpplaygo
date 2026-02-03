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
		<div className="container mx-auto py-6 md:py-10 px-4 md:px-6 max-w-7xl">
			{/* Header Section */}
			<div className="flex flex-col md:flex-row gap-6 md:gap-8 mb-8 md:mb-12">
				{/* Playlist Cover */}
				<div className="mx-auto md:mx-0 w-48 h-48 md:w-56 md:h-56 lg:w-64 lg:h-64 flex-shrink-0">
					<div className="w-full h-full bg-gradient-to-br from-secondary/30 to-secondary/60 rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10">
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
								<div className="grid grid-cols-2 gap-0.5 h-full w-full bg-black/20 p-0.5">
									{[0, 1, 2, 3].map((index) => (
										<div key={index} className="relative bg-secondary/60 overflow-hidden">
											{songs[index]?.thumbnail ? (
												<img
													src={songs[index].thumbnail}
													alt=""
													className="w-full h-full object-cover"
												/>
											) : (
												<div className="w-full h-full flex items-center justify-center">
													<Play className="h-6 w-6 md:h-8 md:w-8 text-muted-foreground/40" />
												</div>
											)}
										</div>
									))}
								</div>
							)
						) : (
							<div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-secondary/40 to-secondary/60">
								<Play className="h-16 w-16 md:h-20 md:w-20 text-muted-foreground/50" />
							</div>
						)}
					</div>
				</div>

				{/* Playlist Info */}
				<div className="flex-1 flex flex-col justify-center text-center md:text-left space-y-3 md:space-y-4">
					<p className="uppercase text-xs font-bold tracking-widest text-muted-foreground/80">
						Playlist
					</p>
					<h1 className="text-3xl md:text-5xl lg:text-6xl font-bold leading-tight line-clamp-2">
						{playlist.name}
					</h1>
					<div className="flex flex-col md:flex-row items-center justify-center md:justify-start gap-2 text-sm">
						<span className="text-muted-foreground">
							Created by{" "}
							<span className="text-foreground font-semibold hover:underline cursor-pointer">
								{playlist.profiles?.username}
							</span>
						</span>
						<span className="hidden md:inline text-muted-foreground/50">•</span>
						<span className="text-muted-foreground font-medium">{songs.length} {songs.length === 1 ? 'song' : 'songs'}</span>
					</div>
					<div className="flex items-center justify-center md:justify-start gap-2 text-xs">
						<div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${playlist.is_public ? 'bg-green-500/10 text-green-500' : 'bg-muted text-muted-foreground'}`}>
							{playlist.is_public ?
								<Globe className="h-3.5 w-3.5" />
							:	<Lock className="h-3.5 w-3.5" />}
							<span className="font-medium">{playlist.is_public ? "Public" : "Private"}</span>
						</div>
					</div>
					
					{/* Action Buttons */}
					<div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
						{isOwner && (
							<Button
								variant="outline"
								size="sm"
								onClick={handleTogglePublic}
								disabled={togglingPublic}
								className="min-w-[120px]">
								{togglingPublic ?
									"Updating…"
								: playlist.is_public ?
									"Make Private"
								:	"Make Public"}
							</Button>
						)}
						{canCopy && (
							<Button
								variant="secondary"
								size="sm"
								onClick={handleCopyPlaylist}
								disabled={copying}
								className="min-w-[120px]">
								{copying ? "Copying…" : "Copy Playlist"}
							</Button>
						)}
						{isOwner && (
							<Button
								variant="destructive"
								size="sm"
								onClick={handleDeletePlaylist}
								className="gap-2">
								<Trash2 className="h-3.5 w-3.5" />
								Delete
							</Button>
						)}
					</div>
				</div>
			</div>

			{/* Songs List */}
			<div className="space-y-1 bg-black/20 rounded-xl p-2 md:p-3">
				{songs.map((song, index) => (
					<div
						key={song.id}
						className="group flex items-center gap-3 md:gap-4 p-2 md:p-3 rounded-lg hover:bg-white/5 transition-all duration-200">
						<div className="w-8 md:w-10 text-center text-sm text-muted-foreground/80 group-hover:hidden font-medium">
							{index + 1}
						</div>
						<div
							className="w-8 md:w-10 h-8 md:h-10 hidden group-hover:flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
							onClick={() => handlePlaySong(song.song_id)}>
							<Play className="h-5 w-5 fill-current text-primary" />
						</div>

						<img
							src={song.thumbnail}
							alt={song.song_title}
							className="h-12 w-12 md:h-14 md:w-14 rounded-md object-cover bg-secondary shadow-md ring-1 ring-white/5"
						/>

						<div className="flex-1 min-w-0">
							<p
								className="font-semibold truncate cursor-pointer hover:underline text-sm md:text-base"
								onClick={() => handlePlaySong(song.song_id)}>
								{song.song_title}
							</p>
							<p className="text-xs md:text-sm text-muted-foreground truncate">
								{song.artist}
							</p>
						</div>

						{isOwner && (
							<Button
								variant="ghost"
								size="icon"
								className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all h-8 w-8 md:h-9 md:w-9"
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
