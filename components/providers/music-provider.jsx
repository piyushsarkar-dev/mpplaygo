"use client";
import { useSupabase } from "@/components/providers/supabase-provider";
import { MusicContext } from "@/hooks/use-context";
import { getSongsById, getSongsSuggestions } from "@/lib/fetch";
import { useEffect, useState, useRef } from "react";

const HISTORY_KEY = "mpplaygo_history";
const QUEUE_KEY_V2 = "mpplaygo_queue_v2";

export default function MusicProvider({ children }) {
	const [music, setMusic] = useState(null);
	const [current, setCurrent] = useState(null);
	const [downloadProgress, setDownloadProgress] = useState(0);
	const [queue, setQueue] = useState([]);
	const [history, setHistory] = useState([]); // Previous songs history
	const [queueLoaded, setQueueLoaded] = useState(false);
	const isNavigatingRef = useRef(false); // Track if we're navigating with prev/next
	const { supabase, user } = useSupabase();

	// Load history from localStorage on mount
	useEffect(() => {
		try {
			const savedHistory = localStorage.getItem(HISTORY_KEY);
			const savedQueue = localStorage.getItem(QUEUE_KEY_V2);
			if (savedHistory) {
				setHistory(JSON.parse(savedHistory));
			}
			if (savedQueue) {
				setQueue(JSON.parse(savedQueue));
			}
		} catch (e) {
			console.error("Failed to load history", e);
		}
	}, []);

	// Save history to localStorage whenever it changes
	useEffect(() => {
		try {
			localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
		} catch (e) {
			console.error("Failed to save history", e);
		}
	}, [history]);

	// Save queue to localStorage whenever it changes
	useEffect(() => {
		try {
			localStorage.setItem(QUEUE_KEY_V2, JSON.stringify(queue));
		} catch (e) {
			console.error("Failed to save queue", e);
		}
	}, [queue]);

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
						// Extract artist name
						const artist = 
							songData.artists?.primary?.[0]?.name || 
							songData.artist || 
							"Unknown Artist";
						
						await supabase.from("user_history").insert({
							user_id: user.id,
							song_id: songData.id,
							song_title: songData.name,
							artist: artist,
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
				// If not navigating (user manually selected song), add to history
				if (!isNavigatingRef.current) {
					const currentRes = await getSongsById(music);
					const currentData = await currentRes.json();
					const currentSong = currentData?.data?.[0];
					
					if (currentSong) {
						// Check if this song is already the last in history (avoid duplicates)
						setHistory(prev => {
							const lastSong = prev[prev.length - 1];
							if (lastSong?.id === currentSong.id) {
								return prev; // Don't add duplicate
							}
							return [...prev, currentSong];
						});
					}
				}
				
				// Load related songs for queue
				const res = await getSongsSuggestions(music);
				if (!res) {
					setQueueLoaded(true);
					isNavigatingRef.current = false;
					return;
				}
				const data = await res.json();
				const suggestions = data?.data || [];
				
				// Only update queue if not navigating
				if (!isNavigatingRef.current) {
					setQueue(suggestions);
				}
				
				setQueueLoaded(true);
				isNavigatingRef.current = false;
			} catch (e) {
				console.error("Failed to load queue", e);
				isNavigatingRef.current = false;
				setQueueLoaded(true);
			}
		};
		
		loadQueue();
	}, [music, queueLoaded]);

	// Reset queue when song changes
	useEffect(() => {
		setQueueLoaded(false);
	}, [music]);

	const playNext = () => {
		if (queue.length > 0) {
			const nextSong = queue[0];
			isNavigatingRef.current = true;
			setMusic(nextSong.id);
			
			// Remove played song from queue and add current to history
			setQueue(prev => prev.slice(1));
			
			localStorage.setItem("last-played", nextSong.id);
			localStorage.setItem("p", "true");
			return nextSong.id;
		}
		return null;
	};

	const playPrevious = () => {
		if (history.length > 1) { // Need at least 2 items (current + previous)
			isNavigatingRef.current = true;
			
			// Get previous song (second to last in history)
			const prevSong = history[history.length - 2];
			
			// Current song goes back to front of queue
			const currentRes = history[history.length - 1];
			setQueue(prev => [currentRes, ...prev]);
			
			// Remove last item from history
			setHistory(prev => prev.slice(0, -1));
			
			setMusic(prevSong.id);
			localStorage.setItem("last-played", prevSong.id);
			localStorage.setItem("p", "true");
			return prevSong.id;
		}
		return null;
	};

	const hasNext = queue.length > 0;
	const hasPrevious = history.length > 1;

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
