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

import FeaturedCarousel from "@/components/home/recent-played-carousel";
import { getSongsById } from "@/lib/fetch"; // Ensure this is imported

export default function Page() {
	const FOR_YOU_LIMIT = 6;
	const PAGE_SIZE = FOR_YOU_LIMIT;
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
				// Not logged in: Fetch generic recommendations (e.g. "Trending" or "Hindi" or "English" hits)
				// Using "Trending" or a default query
				const get = await getSongsByQuery("Global Hits");
				const data = await get.json();
				if (data.data && data.data.results) {
					setRecommended(data.data.results);
				}
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
				const idsToFetch = [];

				history.forEach((h) => {
					if (!seenIds.has(h.song_id)) {
						seenIds.add(h.song_id);
						idsToFetch.push(h.song_id);
						uniqueHistory.push({
							id: h.song_id,
							name: h.song_title,
							artist: h.artist, // artist might be missing in history table, so we need fetch
							image: h.thumbnail, // thumbnail is likely missing based on schema
						});
					}
				});

				// Fetch full details for images if possible
				// Since getSongsById takes a single ID, we loop or Promise.all.
				// Optimization: Slice to top 10 to avoid too many requests.
				const topIds = idsToFetch.slice(0, 10);
				try {
					const promises = topIds.map((id) =>
						getSongsById(id).catch(() => null),
					);
					const results = await Promise.all(promises);

					const enrichedHistory = results
						.map((r) => {
							if (r && r.data && r.data[0]) return r.data[0];
							return null;
						})
						.filter(Boolean);

					if (enrichedHistory.length > 0) {
						setHistorySongs(enrichedHistory);
					} else {
						// Fallback if fetch fails (use stored data but missing image)
						setHistorySongs(uniqueHistory);
					}
				} catch (e) {
					console.error("Error fetching history details", e);
					setHistorySongs(uniqueHistory);
				}

				// Recommendations Logic
				const langCounts = {};
				history.forEach((h) => {
					if (h.language)
						langCounts[h.language] =
							(langCounts[h.language] || 0) + 1;
				});

				let favoriteLang = "English";
				if (Object.keys(langCounts).length > 0) {
					favoriteLang = Object.keys(langCounts).reduce((a, b) =>
						langCounts[a] > langCounts[b] ? a : b,
					);
				}

				if (favoriteLang) {
					const get = await getSongsByQuery(
						favoriteLang + " hit songs",
					);
					const data = await get.json();
					if (data.data && data.data.results)
						setRecommended(data.data.results);
				}
			} else {
				// User logged in but no history
				const get = await getSongsByQuery("Trending");
				const data = await get.json();
				if (data.data && data.data.results)
					setRecommended(data.data.results);
			}
		};

		if (user !== undefined) fetchRecommendations(); // Run even if user is null (for guest mode)
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
		// Vertical page scroll: preload when nearing the bottom
		rootMargin: "600px 0px",
		threshold: 0,
	});

	return (
		<main className="flex flex-col gap-8 w-full pb-32">
			{/* Carousel Section: History or Recommendations */}
			<div className="w-full min-h-[50vh]">
				{user && historySongs.length > 0 ?
					<FeaturedCarousel
						songs={historySongs}
						title="Recent Played"
					/>
				:	<FeaturedCarousel
						songs={recommended}
						title="Recommended For You"
					/>
				}
			</div>

			{/* 2. Popular Artists - Circular Row */}
			<section>
				<div className="flex items-center  justify-between mb-6 px-1">
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

			{/* 3. For You Section - Infinite List (Vertical) */}
			<section className="pb-10">
				<div className="flex items-center justify-between mb-6 px-1">
					<h2 className="text-xl font-bold text-white flex items-center gap-2">
						For you{" "}
						<ChevronRight className="w-5 h-5 text-zinc-500" />
					</h2>
				</div>

				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-8 gap-y-10 px-2">
					{feed.map((song, i) => (
						<div
							key={`${song.id}-${i}`}
							className=" transition-transform hover:scale-[1.02] origin-top">
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
					{feedLoading &&
						Array.from({ length: FOR_YOU_LIMIT }).map((_, i) => (
							<div
								key={i}
								className="w-full">
								<Skeleton className="w-full h-[210px] rounded-md" />
								<Skeleton className="w-[70%] h-4 mt-3" />
								<Skeleton className="w-20 h-3 mt-2" />
							</div>
						))}
				</div>
				{/* Sentinel for vertical infinite loading */}
				<div
					ref={feedSentinelRef}
					className="h-6"
				/>
			</section>
		</main>
	);
}
