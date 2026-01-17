"use client";
import { useSupabase } from "@/components/providers/supabase-provider";
import { MusicContext } from "@/hooks/use-context";
import { getSongsById } from "@/lib/fetch";
import { useEffect, useState } from "react";

export default function MusicProvider({ children }) {
	const [music, setMusic] = useState(null);
	const [current, setCurrent] = useState(null);
	const [downloadProgress, setDownloadProgress] = useState(0);
	const { supabase, user } = useSupabase();

	useEffect(() => {
		if (localStorage.getItem("last-played")) {
			setMusic(localStorage.getItem("last-played"));
		}
	}, []);

	useEffect(() => {
		const updateHistory = async () => {
			if (music && user) {
				try {
					const res = await getSongsById(music);
					if (!res) return;
					const data = await res.json();
					const songData = data.data && data.data[0];

					if (songData) {
						await supabase.from("user_history").insert({
							user_id: user.id,
							song_id: songData.id,
							song_title: songData.name,
							language: songData.language,
							listened_at: new Date().toISOString(),
						});
					}
				} catch (e) {
					console.error("Failed to update history", e);
				}
			}
		};
		updateHistory();
	}, [music, user]);

	return (
		<MusicContext.Provider
			value={{
				music,
				setMusic,
				current,
				setCurrent,
				downloadProgress,
				setDownloadProgress,
			}}>
			{children}
		</MusicContext.Provider>
	);
}
