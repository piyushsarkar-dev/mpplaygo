"use client";

import { EditProfileModal } from "@/components/auth/edit-profile-modal";
import { CreatePlaylistModal } from "@/components/playlist/create-playlist-modal";
import { useSupabase } from "@/components/providers/supabase-provider";
import { Button } from "@/components/ui/button";
import { Globe, Lock, Music, Play } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ProfilePage({ params }) {
	const { username } = params;
	const { supabase, user } = useSupabase();
	const [profile, setProfile] = useState(null);
	const [playlists, setPlaylists] = useState([]);
	const [loading, setLoading] = useState(true);
	const router = useRouter();

	useEffect(() => {
		const fetchData = async () => {
			// Fetch Profile
			// Need to decode username as it might be URL encoded
			const decodedUsername = decodeURIComponent(username);
			const { data: profileData, error: profileError } = await supabase
				.from("profiles")
				.select("*")
				.eq("username", decodedUsername)
				.single();

			if (profileError || !profileData) {
				// handle error or not found
				console.error(profileError);
				setLoading(false);
				return;
			}
			setProfile(profileData);

		// Fetch Playlists with first 4 song thumbnails
		const { data: playlistData, error: playlistError } = await supabase
			.from("playlists")
			.select(`
				*,
				playlist_songs(song_id, thumbnail)
			`)
			.eq("user_id", profileData.id)
			.order("created_at", { ascending: false });

		if (playlistData) {
			// Get first 4 thumbnails for each playlist
			const playlistsWithThumbnails = playlistData.map(playlist => ({
				...playlist,
				thumbnails: playlist.playlist_songs?.slice(0, 4).map(s => s.thumbnail).filter(Boolean) || []
			}));
			console.log('Playlists with thumbnails:', playlistsWithThumbnails);
			setPlaylists(playlistsWithThumbnails);
		}
			setLoading(false);
		};

		if (supabase) fetchData();
	}, [username, supabase]);

	if (loading) return <div className="p-10 text-center">Loading...</div>;
	if (!profile) return <div className="p-10 text-center">User not found</div>;

	const isOwner = user?.id === profile.id;

	return (
		<div className="container mx-auto py-10 px-4 md:px-0">
			<div className="flex flex-col items-center md:items-start md:flex-row gap-6 mb-10 border-b pb-10 border-white/10">
				<div className="h-32 w-32 rounded-full overflow-hidden border-2 border-primary/20">
					<img
						src={
							profile.avatar_url ||
							`https://api.dicebear.com/7.x/initials/svg?seed=${username}`
						}
						alt={username}
						className="h-full w-full object-cover"
					/>
				</div>
				<div className="text-center md:text-left pt-2">
					<h1 className="text-3xl font-bold">
						{profile.full_name || profile.username}
					</h1>
					<p className="text-muted-foreground">@{profile.username}</p>
					{profile.gender && (
						<p className="text-xs text-muted-foreground mt-1 capitalize">
							Gender: {profile.gender}
						</p>
					)}
					{isOwner && (
						<p className="text-muted-foreground">{profile.email}</p>
					)}
					<p className="text-sm text-muted-foreground mt-1">
						Joined{" "}
						{new Date(profile.created_at).toLocaleDateString()}
					</p>
					{isOwner && (
						<div className="mt-4 flex justify-center md:justify-start">
							<EditProfileModal>
								<Button variant="secondary">
									Edit Profile
								</Button>
							</EditProfileModal>
						</div>
					)}
				</div>
			</div>

			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<h2 className="text-2xl font-semibold">Playlists</h2>
					{isOwner && (
						<CreatePlaylistModal
							onCreated={(newPlaylist) =>
								setPlaylists([newPlaylist, ...playlists])
							}>
							<Button variant="secondary">Create New</Button>
						</CreatePlaylistModal>
					)}
				</div>

				{playlists.length === 0 ?
					<p className="text-muted-foreground">No playlists found.</p>
				:	<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
						{playlists.map((playlist) => (
							<Link
								href={`/playlist/${playlist.id}`}
								key={playlist.id}
								className="group relative aspect-square bg-secondary/20 rounded-lg overflow-hidden border border-white/5 hover:border-primary/50 transition-all">
								{/* Playlist Cover Grid (Spotify style) */}
								{playlist.thumbnails && playlist.thumbnails.length > 0 ? (
									<div className="grid grid-cols-2 gap-0 h-full">
										{[0, 1, 2, 3].map((index) => (
											<div key={index} className="relative aspect-square bg-secondary/40">
												{playlist.thumbnails[index] ? (
													<img
														src={playlist.thumbnails[index]}
														alt=""
														className="w-full h-full object-cover"
													/>
												) : (
													<div className="w-full h-full flex items-center justify-center">
														<Music className="h-6 w-6 text-muted-foreground/30" />
													</div>
												)}
											</div>
										))}
									</div>
								) : (
									<div className="absolute inset-0 flex items-center justify-center bg-secondary/40">
										<Music className="h-12 w-12 text-muted-foreground/30" />
									</div>
								)}
								
								{/* Hover Play Button */}
								<div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors">
									<Play className="h-10 w-10 text-primary opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0" />
								</div>
								
								{/* Playlist Info */}
								<div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
									<h3 className="font-semibold truncate">
										{playlist.name}
									</h3>
									<div className="flex items-center gap-1 text-xs text-muted-foreground">
										{playlist.is_public ?
											<Globe className="h-3 w-3" />
										:	<Lock className="h-3 w-3" />}
										<span>
											{playlist.is_public ?
												"Public"
											:	"Private"}
										</span>
									</div>
								</div>
							</Link>
						))}
					</div>
				}
			</div>
		</div>
	);
}
