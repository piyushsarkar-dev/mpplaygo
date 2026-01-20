"use client";
import SongCard from "@/components/cards/song";
import { useSupabase } from "@/components/providers/supabase-provider";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import {
	getSongsByQuery,
	getSongsByQueryPaged,
	searchAlbumByQuery,
} from "@/lib/fetch";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export default function Page() {
	const PAGE_SIZE = 30;
	const [latest, setLatest] = useState([]);
	const [popular, setPopular] = useState([]);
	const [albums, setAlbums] = useState([]);

	// New State for UI
	const [historySongs, setHistorySongs] = useState([]);

	const [feed, setFeed] = useState([]);
	const [feedPage, setFeedPage] = useState(1);
	const [feedLoading, setFeedLoading] = useState(false);
	const [feedHasMore, setFeedHasMore] = useState(true);
	const [recommended, setRecommended] = useState([]);

	const { user, supabase } = useSupabase();

	useEffect(() => {
		const fetchRecommendations = async () => {
			if (!user) {
				setRecommended([]);
				setHistorySongs([]);
				return;
			}

			const { data: history } = await supabase
				.from("user_history")
				.select("*")
				.order("listened_at", { ascending: false })
				.limit(20);

			// Process History for "Recent Plays"
			if (history && history.length > 0) {
				const uniqueHistory = [];
				const seenIds = new Set();
				history.forEach((h) => {
					if (!seenIds.has(h.song_id)) {
						seenIds.add(h.song_id);
						uniqueHistory.push({
							id: h.song_id,
							name: h.song_title,
							artist: h.artist,
							image: h.thumbnail, // Assuming thumbnail is array or url
						});
					}
				});
				setHistorySongs(uniqueHistory);

				// Existing Logic for Recommendations
				const langCounts = {};
				history.forEach((h) => {
					if (h.language)
						langCounts[h.language] =
							(langCounts[h.language] || 0) + 1;
				});

				const favoriteLang = Object.keys(langCounts).reduce((a, b) =>
					langCounts[a] > langCounts[b] ? a : b,
				);

				if (favoriteLang) {
					const get = await getSongsByQuery(
						favoriteLang + " hit songs",
					);
					const data = await get.json();
					if (data.data && data.data.results)
						setRecommended(data.data.results);
				}
			}
		};

		if (user) fetchRecommendations();
	}, [user, supabase]);

	const feedPageRef = useRef(1);
	const feedLoadingRef = useRef(false);
	const feedHasMoreRef = useRef(true);
	const feedAbortRef = useRef(null);
	const feedCacheRef = useRef(new Map());

	const getSongs = async (e, type) => {
		const get = await getSongsByQuery(e);
		const data = await get.json();
		if (type === "latest") {
			setLatest(data.data.results);
		} else if (type === "popular") {
			setPopular(data.data.results);
		}
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

	const setFeedLoadingSafe = (v) => {
		feedLoadingRef.current = v;
		setFeedLoading(v);
	};
	const setFeedHasMoreSafe = (v) => {
		feedHasMoreRef.current = v;
		setFeedHasMore(v);
	};

	const getFeed = async (pageToLoad) => {
		if (feedLoadingRef.current) return;
		if (!feedHasMoreRef.current && pageToLoad !== 1) return;

		const cacheKey = `trending|${pageToLoad}`;
		if (feedCacheRef.current.has(cacheKey)) {
			const cached = feedCacheRef.current.get(cacheKey);
			setFeed((prev) => {
				const merged =
					pageToLoad === 1 ?
						cached.results
					:	mergeUniqueById(prev, cached.results);
				if (!cached.results.length) setFeedHasMoreSafe(false);
				if (
					typeof cached.total === "number" &&
					merged.length >= cached.total
				)
					setFeedHasMoreSafe(false);
				return merged;
			});
			return;
		}

		feedAbortRef.current?.abort?.();
		const controller = new AbortController();
		feedAbortRef.current = controller;

		setFeedLoadingSafe(true);
		try {
			const res = await getSongsByQueryPaged("trending", {
				page: pageToLoad,
				limit: PAGE_SIZE,
				signal: controller.signal,
			});
			const json = await res?.json();
			if (controller.signal.aborted) return;
			const nextResults = json?.data?.results || [];
			const total = json?.data?.total;

			feedCacheRef.current.set(cacheKey, { results: nextResults, total });

			setFeed((prev) => {
				const merged =
					pageToLoad === 1 ? nextResults : (
						mergeUniqueById(prev, nextResults)
					);
				if (
					!nextResults.length ||
					(pageToLoad !== 1 && merged.length === prev.length)
				) {
					setFeedHasMoreSafe(false);
				}
				if (typeof total === "number" && merged.length >= total) {
					setFeedHasMoreSafe(false);
				}
				return merged;
			});
		} catch (e) {
			if (!controller.signal.aborted) setFeedHasMoreSafe(false);
		} finally {
			if (!controller.signal.aborted) setFeedLoadingSafe(false);
		}
	};

	const getAlbum = async () => {
		const get = await searchAlbumByQuery("latest");
		const data = await get.json();
		setAlbums(data.data.results);
	};

	useEffect(() => {
		getSongs("latest", "latest");
		getSongs("trending", "popular");
		getAlbum();

		// YouTube-style feed
		feedAbortRef.current?.abort?.();
		feedCacheRef.current.clear();
		setFeed([]);
		feedPageRef.current = 1;
		setFeedPage(1);
		setFeedHasMoreSafe(true);
		setFeedLoadingSafe(false);
		getFeed(1);
	}, []);

	const loadMoreFeed = () => {
		if (feedLoadingRef.current || !feedHasMoreRef.current) return;
		const nextPage = feedPageRef.current + 1;
		feedPageRef.current = nextPage;
		setFeedPage(nextPage);
		getFeed(nextPage);
	};

	const { sentinelRef: feedSentinelRef } = useInfiniteScroll({
		enabled: feedHasMore && !feedLoading && feed.length >= PAGE_SIZE,
		onLoadMore: loadMoreFeed,
		rootMargin: "300px 0px",
		cooldownMs: 1400,
	});

	return (
		<main className="flex flex-col gap-12 w-full pt-6">
			{/* 1. Recent Plays - Prominent Horizontal Cards */}
			{user && historySongs.length > 0 && (
				<section>
					<div className="flex items-center justify-between mb-4 px-1">
						<h2 className="text-2xl font-bold text-white">
							Recent Plays
						</h2>
					</div>
					<ScrollArea className="w-full whitespace-nowrap pb-4">
						<div className="flex w-max space-x-6">
							{historySongs.map((song) => (
								<div
									key={song.id}
									className="w-[300px] h-[300px] relative group transition-transform hover:scale-[1.02]">
									{/* Custom Card for Recent Plays to match screenshot large style */}
									<div className="overflow-hidden rounded-3xl w-full h-full relative cursor-pointer shadow-lg bg-zinc-900 border border-white/5">
										{/* Song Image Background */}
										<img
											src={
												song.image?.[2]?.url ||
												song.image?.[1]?.url ||
												(Array.isArray(song.image) ?
													song.image[0]
												:	song.image) ||
												""
											}
											alt={song.name}
											className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition duration-500"
										/>
										{/* Overlay Content */}
										<div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent flex flex-col justify-end p-6">
											<h3 className="text-2xl font-bold text-white truncate drop-shadow-md">
												{song.name}
											</h3>
											<p className="text-white/80 font-medium truncate drop-shadow-md">
												{song.artist}
											</p>
										</div>
										{/* Play Button Overlay */}
										<div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300 bg-black/20 backdrop-blur-[2px]">
											<div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-xl transform scale-75 group-hover:scale-100 transition">
												<svg
													className="w-6 h-6 text-black fill-current ml-1"
													viewBox="0 0 24 24">
													<path d="M8 5v14l11-7z" />
												</svg>
											</div>
										</div>
									</div>
								</div>
							))}
						</div>
						<ScrollBar
							orientation="horizontal"
							className="hidden"
						/>
					</ScrollArea>
				</section>
			)}

			{/* 2. Popular Artists - Circular Row */}
			<section>
				<div className="flex items-center justify-between mb-6 px-1">
					<h2 className="text-xl font-bold text-white flex items-center gap-2 cursor-pointer hover:text-primary transition">
						Popular Artist{" "}
						<ChevronRight className="w-5 h-5 text-zinc-500" />
					</h2>
				</div>
				<ScrollArea className="w-full whitespace-nowrap pb-6">
					<div className="flex w-max space-x-8 px-2">
						{
							popular.length > 0 ?
								// Extracting unique artists logic simplified for UI demo
								[
									...new Map(
										popular
											.slice(0, 20)
											.map((item) => [
												item.artists?.primary?.[0]?.id,
												item,
											]),
									).values(),
								].map((song, i) => (
									<Link
										key={i}
										href={`/search/${song.artists?.primary?.[0]?.name || "artist"}`}
										className="flex flex-col items-center gap-4 group cursor-pointer">
										<div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-zinc-800 group-hover:border-white transition-all shadow-xl relative">
											<img
												src={
													song.artists?.primary?.[0]
														?.image?.[2]?.url ||
													song.artists?.primary?.[0]
														?.image?.[1]?.url ||
													song.image?.[2]?.url ||
													song.image?.[1]?.url
												}
												alt={
													song.artists?.primary?.[0]
														?.name
												}
												className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
											/>
										</div>
										<span className="text-zinc-400 group-hover:text-white font-medium text-base text-center max-w-[140px] truncate transition">
											{song.artists?.primary?.[0]?.name ||
												"Unknown Artist"}
										</span>
									</Link>
								))
								// Skeletons
							:	Array.from({ length: 8 }).map((_, i) => (
									<div
										key={i}
										className="flex flex-col items-center gap-4">
										<Skeleton className="w-32 h-32 rounded-full" />
										<Skeleton className="w-20 h-4" />
									</div>
								))

						}
					</div>
					<ScrollBar orientation="horizontal" />
				</ScrollArea>
			</section>

			{/* 3. For You Section - Infinite List */}
			<section className="pb-10">
				<div className="flex items-center justify-between mb-6 px-1">
					<h2 className="text-xl font-bold text-white flex items-center gap-2">
						For you{" "}
						<ChevronRight className="w-5 h-5 text-zinc-500" />
					</h2>
				</div>

				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-6">
					{feed.map((song, i) => (
						<div
							key={`${song.id}-${i}`}
							className="transition-transform hover:scale-[1.02]">
							<SongCard
								item={song}
								id={song.id}
								image={song.image?.[2]?.url}
								title={song.name}
								artist={song.artists?.primary?.[0]?.name}
							/>
						</div>
					))}
					{feedLoading &&
						Array.from({ length: 10 }).map((_, i) => (
							<div
								key={i}
								className="space-y-3">
								<Skeleton className="h-40 w-full rounded-2xl" />
								<div className="space-y-2">
									<Skeleton className="h-4 w-[90%]" />
									<Skeleton className="h-3 w-[60%]" />
								</div>
							</div>
						))}
				</div>

				<div
					ref={feedSentinelRef}
					className="h-10 w-full"
				/>

				{!feedLoading && feedHasMore && (
					<div className="mt-8 flex items-center justify-center">
						<button
							onClick={loadMoreFeed}
							className="text-sm px-6 py-3 rounded-full border border-white/10 hover:bg-white/10 hover:border-white/30 transition text-white"
							type="button">
							Load more songs
						</button>
					</div>
				)}
			</section>
		</main>
	);
}
