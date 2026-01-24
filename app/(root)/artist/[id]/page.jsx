"use client";

import SongCard from "@/components/cards/song";
import { Skeleton } from "@/components/ui/skeleton";
import { getArtistSongsByIdPaged } from "@/lib/fetch";
import { useEffect, useMemo, useRef, useState } from "react";

export default function Page({ params }) {
	const artistId = params?.id;
	const PAGE_SIZE = 30;

	const [songs, setSongs] = useState([]);
	const [loading, setLoading] = useState(false);
	const [hasMore, setHasMore] = useState(true);
	const pageRef = useRef(1);
	const loadingRef = useRef(false);
	const hasMoreRef = useRef(true);

	const setLoadingSafe = (v) => {
		loadingRef.current = v;
		setLoading(v);
	};
	const setHasMoreSafe = (v) => {
		hasMoreRef.current = v;
		setHasMore(v);
	};

	const mergeUniqueById = (prev, next) => {
		const seen = new Set(prev.map((x) => x?.id).filter(Boolean));
		const merged = prev.slice();
		for (const item of next || []) {
			if (!item?.id) continue;
			if (seen.has(item.id)) continue;
			seen.add(item.id);
			merged.push(item);
		}
		return merged;
	};

	const title = useMemo(() => `Artist ${artistId}`, [artistId]);

	const loadSongs = async (pageToLoad) => {
		if (!artistId) return;
		if (loadingRef.current) return;
		if (!hasMoreRef.current && pageToLoad !== 1) return;

		setLoadingSafe(true);
		try {
			const res = await getArtistSongsByIdPaged(artistId, {
				page: pageToLoad,
				limit: PAGE_SIZE,
			});
			const json = await res?.json();
			const nextResults = json?.data?.results || [];
			const total = json?.data?.total;

			setSongs((prev) => {
				const merged =
					pageToLoad === 1 ? nextResults : mergeUniqueById(prev, nextResults);
				if (!nextResults.length) setHasMoreSafe(false);
				if (typeof total === "number" && merged.length >= total)
					setHasMoreSafe(false);
				return merged;
			});
		} catch {
			setHasMoreSafe(false);
		} finally {
			setLoadingSafe(false);
		}
	};

	useEffect(() => {
		pageRef.current = 1;
		setSongs([]);
		setHasMoreSafe(true);
		setLoadingSafe(false);
		loadSongs(1);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [artistId]);

	return (
		<main className="flex flex-col gap-6 w-full pb-10">
			<div className="px-1">
				<h1 className="text-xl font-bold text-white">{title}</h1>
				<p className="text-sm text-white/60">
					Showing songs for this artist only.
				</p>
			</div>

			<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-8 gap-y-10 px-2">
				{songs.map((song, i) => (
					<div
						key={`${song.id}-${i}`}
						className="transition-transform hover:scale-[1.02] origin-top">
						<SongCard
							item={song}
							id={song.id}
							image={song.image?.[2]?.url}
							title={song.name}
							artist={song.artists?.primary?.[0]?.name}
							className="w-full"
							imageClassName="h-[300px]"
						/>
					</div>
				))}

				{loading && songs.length === 0 &&
					Array.from({ length: 12 }).map((_, i) => (
						<div key={i} className="w-full">
							<Skeleton className="w-full h-[210px] rounded-md" />
							<Skeleton className="w-[70%] h-4 mt-3" />
							<Skeleton className="w-20 h-3 mt-2" />
						</div>
					))}
			</div>

			<div className="px-2">
				{hasMore && !loading && songs.length > 0 && (
					<button
						type="button"
						className="text-xs px-4 py-2 rounded-md border border-white/10 hover:bg-white/5"
						onClick={() => {
							const next = pageRef.current + 1;
							pageRef.current = next;
							loadSongs(next);
						}}>
						Load more songs
					</button>
				)}
			</div>
		</main>
	);
}
