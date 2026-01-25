"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getArtistSongsByIdPaged } from "@/lib/fetch";
import { Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

export default function Page({ params }) {
	const artistId = params?.id;
	const PAGE_SIZE = 100;
	const MAX_PAGES = 15;
	const QUEUE_KEY = "mpplaygo_queue";
	const USER_PLAY_KEY = "mpplaygo_user_initiated_play";
	const CACHE_KEY = `mpplaygo_artist_cache_${artistId}`;
	const router = useRouter();

	const [songs, setSongs] = useState([]);
	const [artist, setArtist] = useState(null);
	const [loading, setLoading] = useState(false);
	const loadingRef = useRef(false);
	const fetchOnceRef = useRef(false);
	const [error, setError] = useState(null);

	const setLoadingSafe = (v) => {
		loadingRef.current = v;
		setLoading(v);
	};
	const artistMeta = useMemo(() => {
		const name = artist?.name || `Artist ${artistId}`;
		const image =
			artist?.image?.[2]?.url ||
			artist?.image?.[1]?.url ||
			artist?.image?.[0]?.url ||
			"";
		return { name, image };
	}, [artist, artistId]);

	const startArtistQueue = (startIndex = 0) => {
		const items = (songs || []).map((s) => ({
			id: s?.id,
			name: s?.name,
			artist: s?.artists?.primary?.[0]?.name,
			image: s?.image?.[1]?.url || s?.image?.[2]?.url || s?.image?.[0]?.url,
		}));
		const filtered = items.filter((x) => x?.id);
		const start = filtered[startIndex];
		if (!start?.id) return;

		try {
			sessionStorage.setItem(
				QUEUE_KEY,
				JSON.stringify({ type: "artist", artistId, items: filtered }),
			);
			sessionStorage.setItem(USER_PLAY_KEY, "true");
		} catch {}
		try {
			localStorage.setItem("p", "true");
		} catch {}
		router.push(`/${start.id}`);
	};

	const fetchArtistAndSongsOnce = async () => {
		if (!artistId) return;
		if (loadingRef.current) return;
		if (fetchOnceRef.current) return;
		fetchOnceRef.current = true;

		setError(null);
		setLoadingSafe(true);
		try {
			// Cache check (prevents re-fetching same artist repeatedly)
			try {
				const cachedRaw = sessionStorage.getItem(CACHE_KEY);
				if (cachedRaw) {
					const cached = JSON.parse(cachedRaw);
					if (cached?.artist && Array.isArray(cached?.songs)) {
						setArtist(cached.artist);
						setSongs(cached.songs);
						setLoadingSafe(false);
						return;
					}
				}
			} catch {}

			// 1) Fetch artist details (once)
			const artistRes = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}artists/${artistId}`,
			);
			const artistJson = await artistRes.json();
			setArtist(artistJson?.data || null);

			// 2) Fetch ALL songs in one controlled flow (paged loop)
			const seen = new Set();
			let all = [];
			let total = null;
			for (let page = 1; page <= MAX_PAGES; page += 1) {
				const res = await getArtistSongsByIdPaged(artistId, {
					page,
					limit: PAGE_SIZE,
				});
				const json = await res?.json();
				const nextSongs = json?.data?.songs || [];
				if (typeof json?.data?.total === "number") total = json.data.total;

				let added = 0;
				for (const s of nextSongs) {
					const sid = s?.id;
					if (!sid) continue;
					if (seen.has(sid)) continue;
					seen.add(sid);
					all.push(s);
					added += 1;
				}

				// Stop conditions
				if (!nextSongs.length) break;
				if (added === 0) break; // API repeating pages; avoid infinite loop
				if (nextSongs.length < PAGE_SIZE) break;
				if (typeof total === "number" && all.length >= total) break;
			}

			if (all.length === 0) {
				setError("No songs found for this artist.");
			}
			setSongs(all);

			// Save cache
			try {
				sessionStorage.setItem(
					CACHE_KEY,
					JSON.stringify({ artist: artistJson?.data || null, songs: all }),
				);
			} catch {}
		} catch (e) {
			setError("Failed to load artist songs.");
		} finally {
			setLoadingSafe(false);
		}
	};

	useEffect(() => {
		fetchOnceRef.current = false;
		setArtist(null);
		setSongs([]);
		setLoadingSafe(false);
		fetchArtistAndSongsOnce();
	}, [artistId]);

	return (
		<main className="flex flex-col gap-6 w-full pb-10">
			{/* Artist header */}
			<div className="px-2 py-2">
				<div className="flex items-center gap-5">
					<div className="h-28 w-28 rounded-full overflow-hidden bg-white/5 border border-white/10 shrink-0">
						{artistMeta.image ? (
							// eslint-disable-next-line @next/next/no-img-element
							<img
								src={artistMeta.image}
								alt={artistMeta.name}
								className="h-full w-full object-cover"
								onError={(e) => {
									e.currentTarget.src = "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300&auto=format&fit=crop&q=60";
								}}
							/>
						) : (
							<Skeleton className="h-full w-full rounded-full" />
						)}
					</div>

					<div className="min-w-0 flex-1">
						<h1 className="text-2xl font-bold text-white truncate">
							{artistMeta.name}
						</h1>
						<p className="text-sm text-white/60 mt-1">Artist songs</p>
						<div className="mt-4">
							<Button
								type="button"
								className="rounded-full"
								onClick={() => startArtistQueue(0)}
								disabled={songs.length === 0}>
								<Play className="h-4 w-4 mr-2" />
								Play
							</Button>
						</div>
					</div>
				</div>
			</div>

			{/* Song list */}
			<div className="px-2">
				{error && (
					<p className="text-sm text-white/60">{error}</p>
				)}
				{songs.length > 0 ? (
					<div className="flex flex-col gap-2">
						{songs.map((song, i) => (
							<button
								key={`${song.id}-${i}`}
								type="button"
								onClick={() => startArtistQueue(i)}
								className="w-full text-left flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20 transition px-4 py-3">
								<span className="w-8 text-sm text-white/60 tabular-nums">
									{i + 1}
								</span>
								<div className="min-w-0 flex-1">
									<p className="text-white font-medium truncate">
										{song?.name}
									</p>
									<p className="text-xs text-white/50 truncate">
										{song?.album?.name || ""}
									</p>
								</div>
								<div className="text-xs text-white/50">
									{song?.duration ? `${Math.floor(song.duration / 60)}:${String(song.duration % 60).padStart(2, "0")}` : ""}
								</div>
							</button>
						))}
					</div>
				) : loading ? (
					<div className="flex flex-col gap-3">
						{Array.from({ length: 10 }).map((_, i) => (
							<div
								key={i}
								className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
								<Skeleton className="h-4 w-[60%]" />
								<Skeleton className="h-3 w-[35%] mt-2" />
							</div>
						))}
					</div>
				) : (
					<p className="text-sm text-white/60">No songs found.</p>
				)}
			</div>
		</main>
	);
}
