"use client";

import { CreatePlaylistModal } from "@/components/playlist/create-playlist-modal";
import { useSupabase } from "@/components/providers/supabase-provider";
import { Button } from "@/components/ui/button";
import { Globe, Lock, Play } from "lucide-react";
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

			// Fetch Playlists
			const { data: playlistData, error: playlistError } = await supabase
				.from("playlists")
				.select("*")
				.eq("user_id", profileData.id)
				.order("created_at", { ascending: false });

			if (playlistData) setPlaylists(playlistData);
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
					<h1 className="text-3xl font-bold">{profile.username}</h1>
					{isOwner && (
						<p className="text-muted-foreground">{profile.email}</p>
					)}
					<p className="text-sm text-muted-foreground mt-1">
						Joined{" "}
						{new Date(profile.created_at).toLocaleDateString()}
					</p>
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
								<div className="absolute inset-0 flex items-center justify-center bg-secondary/40 group-hover:bg-secondary/60 transition-colors">
									<Play className="h-10 w-10 text-primary opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0" />
								</div>
								<div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
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
