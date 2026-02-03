"use client";
import { useSupabase } from "@/components/providers/supabase-provider";
import { MusicContext } from "@/hooks/use-context";
import { getSongsById, getSongsSuggestions } from "@/lib/fetch";
import { useEffect, useState } from "react";

export default function MusicProvider({ children }) {
	const [music, setMusic] = useState(null);
	const [current, setCurrent] = useState(null);
	const [downloadProgress, setDownloadProgress] = useState(0);
	const [queue, setQueue] = useState([]);
	const [currentIndex, setCurrentIndex] = useState(0);
	const [queueLoaded, setQueueLoaded] = useState(false);
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
	}, [music, supabase, user]);

	// Load related songs for queue
	useEffect(() => {
		const loadQueue = async () => {
			if (!music || queueLoaded) return;
			
			try {
				const res = await getSongsSuggestions(music);
				if (!res) return;
				const data = await res.json();
				const suggestions = data?.data || [];
				
				// Create queue: current song + related songs
				const currentRes = await getSongsById(music);
				const currentData = await currentRes.json();
				const currentSong = currentData?.data?.[0];
				
				if (currentSong) {
					const newQueue = [currentSong, ...suggestions];
					setQueue(newQueue);
					setCurrentIndex(0);
					setQueueLoaded(true);
				}
			} catch (e) {
				console.error("Failed to load queue", e);
			}
		};
		
		loadQueue();
	}, [music, queueLoaded]);

	// Reset queue when song changes
	useEffect(() => {
		setQueueLoaded(false);
	}, [music]);

	const playNext = () => {
		if (currentIndex < queue.length - 1) {
			const nextSong = queue[currentIndex + 1];
			setMusic(nextSong.id);
			setCurrentIndex(currentIndex + 1);
			localStorage.setItem("last-played", nextSong.id);
			localStorage.setItem("p", "true");
			return nextSong.id;
		}
		return null;
	};

	const playPrevious = () => {
		if (currentIndex > 0) {
			const prevSong = queue[currentIndex - 1];
			setMusic(prevSong.id);
			setCurrentIndex(currentIndex - 1);
			localStorage.setItem("last-played", prevSong.id);
			localStorage.setItem("p", "true");
			return prevSong.id;
		}
		return null;
	};

	const hasNext = currentIndex < queue.length - 1;
	const hasPrevious = currentIndex > 0;

	return (
		<MusicContext.Provider
			value={{
				music,
				setMusic,
				current,
				setCurrent,
				downloadProgress,
				setDownloadProgress,
				queue,
				playNext,
				playPrevious,
				hasNext,
				hasPrevious,
			}}>
			{children}
		</MusicContext.Provider>
	);
}
