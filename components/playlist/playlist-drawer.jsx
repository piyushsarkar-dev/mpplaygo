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
import { MusicContext } from "@/hooks/use-context";
import { ArrowLeft, Globe, ListMusic, Lock, Play, Plus, Share2, Trash2 } from "lucide-react";
import { useCallback, useContext, useEffect, useState } from "react";
import { toast } from "sonner";
import { CreatePlaylistModal } from "./create-playlist-modal";

export function PlaylistDrawer({ children }) {
	const { supabase, user } = useSupabase();
	const musicContext = useContext(MusicContext);
	const [playlists, setPlaylists] = useState([]);
	const [loading, setLoading] = useState(false);
	const [open, setOpen] = useState(false);
	const [selectedPlaylist, setSelectedPlaylist] = useState(null);
	const [playlistSongs, setPlaylistSongs] = useState([]);
	const [loadingSongs, setLoadingSongs] = useState(false);
	const userId = user?.id;

	const fetchPlaylists = useCallback(async () => {
		if (!userId) return;
		setLoading(true);
		const { data } = await supabase
			.from("playlists")
			.select(`
				*,
				playlist_songs(song_id, thumbnail)
			`)
			.eq("user_id", userId)
			.order("created_at", { ascending: false });
		
		if (data) {
			const playlistsWithThumbnails = data.map(playlist => ({
				...playlist,
				thumbnails: playlist.playlist_songs?.slice(0, 4).map(s => s.thumbnail).filter(Boolean) || [],
				songCount: playlist.playlist_songs?.length || 0
			}));
			setPlaylists(playlistsWithThumbnails);
		}
		setLoading(false);
	}, [supabase, userId]);

	const fetchPlaylistSongs = useCallback(async (playlistId) => {
		setLoadingSongs(true);
		const { data } = await supabase
			.from("playlist_songs")
			.select("*")
			.eq("playlist_id", playlistId)
			.order("added_at", { ascending: true });
		setPlaylistSongs(data || []);
		setLoadingSongs(false);
	}, [supabase]);

	const handlePlaylistClick = (playlist) => {
		setSelectedPlaylist(playlist);
		fetchPlaylistSongs(playlist.id);
	};

	const handleBack = () => {
		setSelectedPlaylist(null);
		setPlaylistSongs([]);
	};

	const handlePlaySong = (songId) => {
		try {
			sessionStorage.setItem("mpplaygo_user_initiated_play", "true");
		} catch {}
		try {
			localStorage.setItem("p", "true");
		} catch {}
		musicContext.setMusic(songId);
		setOpen(false);
	};

	const handleRemoveSong = async (e, songDbId, songTitle) => {
		e.stopPropagation();
		const { error } = await supabase
			.from("playlist_songs")
			.delete()
			.eq("id", songDbId);
		
		if (error) {
			toast.error("Failed to remove song");
		} else {
			toast.success(`Removed "${songTitle}"`);
			setPlaylistSongs(playlistSongs.filter(s => s.id !== songDbId));
			setPlaylists(playlists.map(p => 
				p.id === selectedPlaylist.id 
					? { ...p, songCount: (p.songCount || 1) - 1 }
					: p
			));
		}
	};

	const handleSharePlaylist = async () => {
		const url = `${window.location.origin}/playlist/${selectedPlaylist.id}`;
		try {
			if (navigator.share) {
				await navigator.share({
					title: selectedPlaylist.name,
					text: `Check out my playlist "${selectedPlaylist.name}"`,
					url: url
				});
				toast.success("Shared successfully!");
			} else {
				await navigator.clipboard.writeText(url);
				toast.success("Link copied to clipboard!");
			}
		} catch (error) {
			if (error.name !== 'AbortError') {
				toast.error("Failed to share");
			}
		}
	};

	const handleTogglePublic = async () => {
		const newPublicState = !selectedPlaylist.is_public;
		const { data, error } = await supabase
			.from("playlists")
			.update({ is_public: newPublicState })
			.eq("id", selectedPlaylist.id)
			.select()
			.single();
		
		if (error) {
			toast.error("Failed to update playlist");
		} else {
			toast.success(newPublicState ? "Playlist is now public" : "Playlist is now private");
			setSelectedPlaylist({ ...selectedPlaylist, is_public: newPublicState });
			setPlaylists(playlists.map(p => 
				p.id === selectedPlaylist.id 
					? { ...p, is_public: newPublicState }
					: p
			));
		}
	};

	useEffect(() => {
		if (open) {
			fetchPlaylists();
			setSelectedPlaylist(null);
			setPlaylistSongs([]);
		}
	}, [fetchPlaylists, open]);

	return (
		<Sheet
			open={open}
			onOpenChange={setOpen}>
			<SheetTrigger asChild>{children}</SheetTrigger>
			<SheetContent
				side="left"
				className="w-[90vw] sm:w-[380px] max-w-[400px] border-r border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-950 backdrop-blur-2xl text-white p-0 flex flex-col">
				
				{!selectedPlaylist ? (
					<div className="flex flex-col h-full">
						<SheetHeader className="pt-8 pb-6 px-6 border-b border-white/10 bg-gradient-to-b from-black/40 to-transparent">
							<SheetTitle className="text-2xl font-bold text-white flex items-center gap-3">
								<div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 ring-1 ring-primary/30">
									<ListMusic className="w-6 h-6 text-primary" />
								</div>
								<span>Your Playlists</span>
							</SheetTitle>
						</SheetHeader>

						<div className="flex flex-col gap-4 flex-1 overflow-hidden px-6 pt-6">
							<CreatePlaylistModal onCreated={fetchPlaylists}>
								<Button className="w-full bg-gradient-to-r from-primary/20 to-primary/10 hover:from-primary/30 hover:to-primary/20 text-white border border-primary/30 hover:border-primary/40 justify-center gap-2.5 h-12 rounded-xl backdrop-blur-sm font-semibold shadow-lg shadow-primary/10 transition-all">
									<Plus className="w-5 h-5" />
									Create New Playlist
								</Button>
							</CreatePlaylistModal>

							<div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

							<ScrollArea className="flex-1 -mx-6 px-6">
								<div className="flex flex-col gap-2 pb-6">
									{loading && (
										<div className="text-white/50 text-sm p-8 text-center">
											<div className="animate-pulse">Loading...</div>
										</div>
									)}

									{!loading && playlists.length === 0 && (
										<div className="text-center py-16 px-4">
											<div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4 ring-1 ring-white/10">
												<ListMusic className="w-10 h-10 text-white/30" />
											</div>
											<p className="text-white/70 text-base font-medium">No playlists yet</p>
										</div>
									)}

									{playlists.map((playlist) => (
										<button
											key={playlist.id}
											onClick={() => handlePlaylistClick(playlist)}
											className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 active:bg-white/15 transition-all group text-left w-full border border-transparent hover:border-white/10">
											<div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 shadow-lg ring-1 ring-white/10 group-hover:scale-105 transition-transform">
												{playlist.thumbnails && playlist.thumbnails.length > 0 ? (
													<div className="grid grid-cols-2 gap-0.5 h-full w-full bg-black">
														{[0, 1, 2, 3].map((index) => (
															<div key={index} className="relative bg-zinc-900">
																{playlist.thumbnails[index] ? (
																	<img src={playlist.thumbnails[index]} alt="" className="w-full h-full object-cover" />
																) : (
																	<div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
																		<ListMusic className="w-3 h-3 text-zinc-600" />
																	</div>
																)}
															</div>
														))}
													</div>
												) : (
													<div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-black">
														<ListMusic className="w-7 h-7 text-zinc-600" />
													</div>
												)}
											</div>
											<div className="flex-1 min-w-0">
												<p className="text-white font-semibold truncate group-hover:text-primary transition text-base mb-1">
													{playlist.name}
												</p>
												<div className="flex items-center gap-2 text-xs text-white/50">
													<div className="flex items-center gap-1">
														{playlist.is_public ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
														<span>{playlist.is_public ? "Public" : "Private"}</span>
													</div>
													<span>•</span>
													<span>{playlist.songCount} {playlist.songCount === 1 ? 'song' : 'songs'}</span>
												</div>
											</div>
										</button>
									))}
								</div>
							</ScrollArea>
						</div>
					</div>
				) : (
					<div className="flex flex-col h-full">
						<SheetHeader className="pt-8 pb-6 px-6 border-b border-white/10 space-y-4">
							<div className="flex items-center gap-2">
								<Button
									variant="ghost"
									size="icon"
									className="text-white hover:bg-white/10 rounded-xl h-11 w-11 flex-shrink-0"
									onClick={handleBack}>
									<ArrowLeft className="w-5 h-5" />
								</Button>
								<SheetTitle className="text-xl font-bold text-white flex-1 truncate">
									{selectedPlaylist.name}
								</SheetTitle>
								<Button
									variant="ghost"
									size="icon"
									className="text-white hover:bg-white/10 rounded-xl h-11 w-11 flex-shrink-0"
									onClick={handleSharePlaylist}>
									<Share2 className="w-5 h-5" />
								</Button>
							</div>
							<div className="bg-gradient-to-br from-white/10 to-white/5 rounded-xl p-4 border border-white/10">
								<div className="flex items-center gap-4">
									<div className="w-20 h-20 rounded-xl overflow-hidden shadow-xl ring-1 ring-white/20">
										{selectedPlaylist.thumbnails && selectedPlaylist.thumbnails.length > 0 ? (
											<div className="grid grid-cols-2 gap-0.5 h-full w-full bg-black">
												{[0, 1, 2, 3].map((index) => (
													<div key={index} className="relative bg-zinc-900">
														{selectedPlaylist.thumbnails[index] ? (
															<img src={selectedPlaylist.thumbnails[index]} alt="" className="w-full h-full object-cover" />
														) : (
															<div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
																<ListMusic className="w-3.5 h-3.5 text-zinc-600" />
															</div>
														)}
													</div>
												))}
											</div>
										) : (
											<div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-black">
												<ListMusic className="w-8 h-8 text-zinc-600" />
											</div>
										)}
									</div>
									<div className="flex-1 min-w-0">
										<p className="text-white font-bold text-lg truncate mb-2">{selectedPlaylist.name}</p>
									<div className="flex items-center gap-2 flex-wrap">
										<div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${selectedPlaylist.is_public ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/40' : 'bg-white/10 text-white/70'}`}>
											{selectedPlaylist.is_public ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
											<span>{selectedPlaylist.is_public ? "Public" : "Private"}</span>
										</div>
										<span className="text-sm text-white/60 font-medium">{playlistSongs.length} {playlistSongs.length === 1 ? 'song' : 'songs'}</span>
									</div>
								</div>
							</div>
							<Button
								variant="outline"
								size="sm"
								onClick={handleTogglePublic}
								className={`w-full mt-3 border transition-all ${
									selectedPlaylist.is_public 
										? 'border-white/20 hover:border-white/30 text-white/90 hover:bg-white/5' 
										: 'border-green-500/30 hover:border-green-500/50 text-green-400 hover:bg-green-500/10'
								}`}>
								{selectedPlaylist.is_public ? (
									<>
										<Lock className="w-4 h-4 mr-2" />
										Make Private
									</>
								) : (
									<>
										<Globe className="w-4 h-4 mr-2" />
										Make Public
									</>
								)}
							</Button>
							</div>
						</SheetHeader>

						<ScrollArea className="flex-1 px-6 pt-4">
							<div className="flex flex-col gap-1 pb-6">
								{loadingSongs && (
									<div className="text-white/50 text-sm p-8 text-center">
										<div className="animate-pulse">Loading songs...</div>
									</div>
								)}

								{!loadingSongs && playlistSongs.length === 0 && (
									<div className="text-center py-16">
										<div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
											<Play className="w-10 h-10 text-white/30" />
										</div>
										<p className="text-white/70">This playlist is empty</p>
									</div>
								)}

								{playlistSongs.map((song, index) => (
									<div
										key={song.id}
										className="group flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 transition-all border border-transparent hover:border-white/10">
										<div className="w-9 text-center text-sm text-white/50 font-semibold group-hover:hidden">{index + 1}</div>
										<button
											onClick={() => handlePlaySong(song.song_id)}
											className="w-9 h-9 hidden group-hover:flex items-center justify-center">
											<div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center ring-1 ring-primary/30 hover:scale-110 transition-transform">
												<Play className="w-4 h-4 fill-primary text-primary ml-0.5" />
											</div>
										</button>
										<button 
											onClick={() => handlePlaySong(song.song_id)}
											className="flex-shrink-0">
											<img src={song.thumbnail} alt={song.song_title} className="w-14 h-14 rounded-lg object-cover shadow-md ring-1 ring-white/10 group-hover:scale-105 transition" />
										</button>
										<button 
											onClick={() => handlePlaySong(song.song_id)}
											className="flex-1 min-w-0 text-left">
											<p className="text-white font-semibold truncate text-sm group-hover:text-primary transition">{song.song_title}</p>
											<p className="text-xs text-white/50 truncate">{song.artist}</p>
										</button>
										<Button
											variant="ghost"
											size="icon"
											className="text-white/50 hover:text-red-400 hover:bg-red-500/10 rounded-lg h-9 w-9 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
											onClick={(e) => handleRemoveSong(e, song.id, song.song_title)}>
											<Trash2 className="w-4 h-4" />
										</Button>
									</div>
								))}
							</div>
						</ScrollArea>
					</div>
				)}
			</SheetContent>
		</Sheet>
	);
}
