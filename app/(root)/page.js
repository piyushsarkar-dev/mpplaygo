"use client";
import SongCard from "@/components/cards/song";
import { useSupabase } from "@/components/providers/supabase-provider";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import {
    getSongsByQuery,
    getSongsByQueryPaged,
    searchAlbumByQuery,
    searchArtistsByQueryPaged,
} from "@/lib/fetch";
import { ChevronRight, Search, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

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
	const [artistModalOpen, setArtistModalOpen] = useState(false);
	const [artistQuery, setArtistQuery] = useState("");
	const [artistsExpanded, setArtistsExpanded] = useState(false);
	const [artistRowSlots, setArtistRowSlots] = useState(0);
	const [artistApiResults, setArtistApiResults] = useState([]);
	const [artistApiLoading, setArtistApiLoading] = useState(false);
	const artistRowRef = useRef(null);

	const { user, supabase } = useSupabase();

	const artists = useMemo(() => {
		// Popular Artists must be global (same for all users)
		const source = popular;
		const counts = new Map();

		for (const item of source || []) {
			const a = item?.artists?.primary?.[0];
			const name = a?.name || "";
			if (!name) continue;

			const key = a?.id || name.toLowerCase();
			const current = counts.get(key) || {
				id: a?.id || name,
				name,
				image:
					a?.image?.[2]?.url ||
					a?.image?.[1]?.url ||
					item?.image?.[2]?.url ||
					item?.image?.[1]?.url ||
					"",
				count: 0,
			};
			current.count += 1;
			if (!current.image) {
				current.image =
					a?.image?.[2]?.url ||
					a?.image?.[1]?.url ||
					item?.image?.[2]?.url ||
					item?.image?.[1]?.url ||
					"";
			}
			counts.set(key, current);
		}

		return [...counts.values()].sort((x, y) => y.count - x.count);
	}, [popular]);

	const sidebarArtists = useMemo(() => {
		const q = artistQuery.trim();
		if (!q) return artists;
		return (artistApiResults || []).map((a) => ({
			id: a?.id,
			name: a?.name,
			image:
				a?.image?.[2]?.url ||
				a?.image?.[1]?.url ||
				a?.image?.[0]?.url ||
				"",
		}));
	}, [artistApiResults, artistQuery, artists]);

	useEffect(() => {
		if (!artistModalOpen) return;
		const q = artistQuery.trim();
		if (!q) {
			setArtistApiResults([]);
			setArtistApiLoading(false);
			return;
		}

		let cancelled = false;
		setArtistApiLoading(true);
		(async () => {
			try {
				const res = await searchArtistsByQueryPaged(q, {
					page: 1,
					limit: 50,
				});
				const json = await res?.json();
				if (cancelled) return;
				setArtistApiResults(json?.data?.results || []);
			} catch {
				if (cancelled) return;
				setArtistApiResults([]);
			} finally {
				if (!cancelled) setArtistApiLoading(false);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [artistModalOpen, artistQuery]);

	useEffect(() => {
		const el = artistRowRef.current;
		if (!el) return;

		const ITEM_SIZE = 160; // w-40 (desktop)
		const GAP = 32; // gap-8
		const MIN_SLOTS = 2; // at least 1 artist + show more

		const computeSlots = () => {
			const width = el.clientWidth || 0;
			if (!width) return;
			const slots = Math.floor((width + GAP) / (ITEM_SIZE + GAP));
			setArtistRowSlots(Math.max(MIN_SLOTS, slots));
		};

		computeSlots();
		if (typeof ResizeObserver === "undefined") return;
		const ro = new ResizeObserver(() => computeSlots());
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

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
					const results = await Promise.all(
						topIds.map(async (id) => {
							try {
								const res = await getSongsById(id);
								if (!res?.ok) return null;
								const json = await res.json().catch(() => null);
								return json?.data?.[0] ?? null;
							} catch {
								return null;
							}
						}),
					);

					const enrichedHistory = results.filter(Boolean);

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
	const ensuredPopularArtistsRef = useRef(false);

	const getSongs = async (e, type) => {
		const get =
			type === "popular" ?
				await getSongsByQueryPaged(e, { page: 1, limit: 60 })
			: 	await getSongsByQuery(e);
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

	useEffect(() => {
		if (ensuredPopularArtistsRef.current) return;
		if (!popular || popular.length === 0) return;

		const uniqueArtistIds = new Set();
		for (const song of popular) {
			const id = song?.artists?.primary?.[0]?.id;
			if (id) uniqueArtistIds.add(id);
		}
		if (uniqueArtistIds.size >= 8) {
			ensuredPopularArtistsRef.current = true;
			return;
		}

		ensuredPopularArtistsRef.current = true;
		(async () => {
			try {
				const res = await getSongsByQueryPaged("trending", {
					page: 2,
					limit: 60,
				});
				const json = await res?.json();
				const nextResults = json?.data?.results || [];
				if (!nextResults.length) return;
				setPopular((prev) => mergeUniqueById(prev, nextResults));
			} catch {
				// ignore; best-effort to reach minimum artist count
			}
		})();
	}, [popular]);

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
		<main className="flex flex-col gap-8 w-full pb-10">
			{/* Carousel Section: History or Recommendations */}
			<div className="w-full">
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
				<div
					ref={artistRowRef}
					className="w-full px-2 pb-6">
					<div
						className={
							artistsExpanded
								? "flex flex-wrap gap-8"
								: "flex flex-nowrap gap-8 overflow-hidden"
						}>
						{artists.length > 0 ?
							(artistsExpanded
								? artists
								: artists.slice(
										0,
										Math.max(
											0,
											(artistRowSlots || 2) - 1,
										),
									)
								)
								.map((a) => (
									<Link
										key={a.id}
										href={a.id ? `/artist/${a.id}` : `/search/${a.name || "artist"}`}
										className="flex flex-col items-center gap-4 group cursor-pointer">
										<div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-zinc-800 group-hover:border-white transition-all shadow-xl relative">
											<img
												src={a.image}
												alt={a.name}
												className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
												onError={(e) => {
												e.currentTarget.src =
													"https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300&auto=format&fit=crop&q=60";
											}}
										/>
									</div>
									<span className="text-zinc-400 group-hover:text-white font-medium text-base text-center max-w-[140px] truncate transition">
										{a.name}
									</span>
								</Link>
							))
						: Array.from({ length: Math.max(0, (artistRowSlots || 6) - 1) }).map((_, i) => (
								<div
									key={i}
									className="flex flex-col items-center gap-4">
									<Skeleton className="w-32 h-32 rounded-full" />
									<Skeleton className="w-20 h-4" />
								</div>
							))}

						{/* Show more (at the end of the row) */}
						<Dialog
							open={artistModalOpen}
							onOpenChange={(v) => {
								setArtistModalOpen(v);
								if (!v) setArtistQuery("");
							}}>
							<DialogTrigger asChild>
								<button
									type="button"
									onClick={() => setArtistsExpanded(true)}
									className="flex flex-col items-center gap-4 group cursor-pointer">
									<div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-zinc-800 group-hover:border-white transition-all shadow-xl relative flex items-center justify-center bg-white/5">
										<ChevronRight className="w-10 h-10 text-white/70 group-hover:text-white transition" />
									</div>
									<span className="text-zinc-400 group-hover:text-white font-medium text-base text-center max-w-[140px] truncate transition">
										Show more
									</span>
								</button>
							</DialogTrigger>
							<DialogContent className="sm:max-w-[900px]">
								<DialogHeader>
									<DialogTitle>Artists</DialogTitle>
								</DialogHeader>

								<div className="mt-4">
									<div className="relative">
										<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
										<Input
											value={artistQuery}
											onChange={(e) =>
												setArtistQuery(e.target.value)
											}
											placeholder="Search artists"
											className="pl-9 pr-9"
										/>
										{artistQuery.trim().length > 0 && (
											<Button
												variant="ghost"
												size="icon"
												type="button"
												onClick={() =>
													setArtistQuery("")
												}
												className="absolute right-1 top-1/2 -translate-y-1/2">
												<X className="w-4 h-4" />
											</Button>
										)}
									</div>

									<div className="mt-5 max-h-[70vh] overflow-y-auto pr-1">
													{artistQuery.trim().length > 0 && artistApiLoading ?
														<p className="text-sm text-muted-foreground">
															Searching artists...
														</p>
												: sidebarArtists.length === 0 ?
											<p className="text-sm text-muted-foreground">
												No artists found.
											</p>
												: 	<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
													{sidebarArtists.map((a) => (
													<Link
														key={a.id}
															href={a.id ? `/artist/${a.id}` : `/search/${a.name}`}
														onClick={() =>
															setArtistModalOpen(
																false,
															)
														}
														className="flex items-center gap-3 rounded-xl p-3 border border-white/10 hover:border-white/20 hover:bg-white/5 transition">
														<div className="h-12 w-12 rounded-full overflow-hidden bg-white/5 border border-white/10">
															<img
																src={a.image}
																alt={a.name}
																className="h-full w-full object-cover"
																onError={(
																	e,
																) => {
																	e.currentTarget.src =
																		"https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=200&auto=format&fit=crop&q=60";
																}}
															/>
														</div>
														<div className="min-w-0">
															<p className="text-sm font-medium text-white truncate">
																{a.name}
															</p>
															<p className="text-xs text-white/50">
																Top listens
															</p>
														</div>
													</Link>
												))}
											</div>
										}
									</div>
								</div>
							</DialogContent>
						</Dialog>
					</div>
				</div>
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
