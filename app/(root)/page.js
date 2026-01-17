"use client";
import AlbumCard from "@/components/cards/album";
import ArtistCard from "@/components/cards/artist";
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
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function Page() {
	const PAGE_SIZE = 30;
	const [latest, setLatest] = useState([]);
	const [popular, setPopular] = useState([]);
	const [albums, setAlbums] = useState([]);

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
				return;
			}

			const { data: history } = await supabase
				.from("user_history")
				.select("language")
				.order("listened_at", { ascending: false })
				.limit(20);

			if (history && history.length > 0) {
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
		<main className="px-6 py-5 md:px-20 lg:px-32">
			{recommended.length > 0 && (
				<div className="mb-14">
					<div className="grid">
						<h1 className="text-base">Recommended for You</h1>
						<p className="text-xs text-muted-foreground">
							Based on your listening history.
						</p>
					</div>
					<ScrollArea className="rounded-md mt-4">
						<div className="flex gap-4">
							{recommended.map((song) => (
								<SongCard
									key={song.id}
									image={
										song.image && song.image.length > 2 ?
											song.image[2].url
										:	""
									}
									album={song.album}
									title={song.name}
									artist={song.artists.primary[0].name}
									id={song.id}
								/>
							))}
						</div>
						<ScrollBar
							orientation="horizontal"
							className="hidden sm:flex"
						/>
					</ScrollArea>
				</div>
			)}
			<div>
				<div className="grid">
					<h1 className="text-base">Songs</h1>
					<p className="text-xs text-muted-foreground">
						Top new released songs.
					</p>
				</div>
				<ScrollArea className="rounded-md mt-4">
					<div className="flex gap-4">
						{latest.length ?
							latest.slice().map((song) => (
								<SongCard
									key={song.id}
									image={song.image[2].url}
									album={song.album}
									title={song.name}
									artist={song.artists.primary[0].name}
									id={song.id}
								/>
							))
						:	Array.from({ length: 10 }).map((_, i) => (
								<SongCard key={i} />
							))
						}
					</div>
					<ScrollBar
						orientation="horizontal"
						className="hidden sm:flex"
					/>
				</ScrollArea>
			</div>

			<div className="mt-14">
				<h1 className="text-base">Albums</h1>
				<p className="text-xs text-muted-foreground">
					Top new released albums.
				</p>
				<ScrollArea className="rounded-md mt-6">
					<div className="flex gap-4">
						{albums.length ?
							albums.slice().map((song) => (
								<AlbumCard
									key={song.id}
									lang={song.language}
									image={song.image[2].url}
									album={song.album}
									title={song.name}
									artist={song.artists.primary[0].name}
									id={`album/${song.id}`}
								/>
							))
						:	Array.from({ length: 10 }).map((_, i) => (
								<SongCard key={i} />
							))
						}
					</div>
					<ScrollBar
						orientation="horizontal"
						className="hidden sm:flex"
					/>
				</ScrollArea>
			</div>

			<div className="mt-12">
				<h1 className="text-base">Artists</h1>
				<p className="text-xs text-muted-foreground">
					Most searched artists.
				</p>
				<ScrollArea className="rounded-md mt-6">
					<div className="flex gap-4">
						{latest.length ?
							[
								...new Set(
									latest.map((a) => a.artists.primary[0].id),
								),
							].map((id) => (
								<ArtistCard
									key={id}
									id={id}
									image={
										latest.find(
											(a) =>
												a.artists.primary[0].id === id,
										).artists.primary[0].image[2]?.url ||
										`https://az-avatar.vercel.app/api/avatar/?bgColor=0f0f0f0&fontSize=60&text=${
											latest
												.find(
													(a) =>
														a.artists.primary[0]
															.id === id,
												)
												.artists.primary[0].name.split(
													"",
												)[0]
												.toUpperCase() || "UN"
										}`
									}
									name={
										latest.find(
											(a) =>
												a.artists.primary[0].id === id,
										).artists.primary[0].name
									}
								/>
							))
						:	Array.from({ length: 10 }).map((_, i) => (
								<div
									key={i}
									className="grid gap-2">
									<Skeleton className="h-[100px] w-[100px] rounded-full" />
									<Skeleton className="h-3 w-20" />
								</div>
							))
						}
					</div>
					<ScrollBar
						orientation="horizontal"
						className="hidden sm:flex"
					/>
				</ScrollArea>
			</div>

			<div className="mt-12">
				<h1 className="text-base">Trending</h1>
				<p className="text-xs text-muted-foreground">
					Most played songs in this week.
				</p>
				<ScrollArea className="rounded-md mt-6">
					<div className="flex gap-4">
						{popular.length ?
							popular.map((song) => (
								<SongCard
									key={song.id}
									id={song.id}
									image={song.image[2].url}
									title={song.name}
									artist={song.artists.primary[0].name}
								/>
							))
						:	Array.from({ length: 10 }).map((_, i) => (
								<SongCard key={i} />
							))
						}
					</div>
					<ScrollBar
						orientation="horizontal"
						className="hidden sm:flex"
					/>
				</ScrollArea>
			</div>

			{/* YouTube-style vertical infinite scroll */}
			<div className="mt-12">
				<h1 className="text-base">More Songs</h1>
				<p className="text-xs text-muted-foreground">
					Keep scrolling to load more.
				</p>

				<div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
					{feed.length ?
						feed.map((song) => (
							<SongCard
								key={song.id}
								id={song.id}
								image={song.image?.[2]?.url}
								title={song.name}
								artist={
									song.artists?.primary?.[0]?.name ||
									"unknown"
								}
							/>
						))
					:	Array.from({ length: 20 }).map((_, i) => (
							<SongCard key={i} />
						))
					}
				</div>

				<div
					ref={feedSentinelRef}
					className="h-10 w-full"
				/>

				{!feedLoading && feedHasMore && (
					<div className="mt-4 flex items-center justify-center">
						<button
							onClick={loadMoreFeed}
							className="text-xs px-4 py-2 rounded-md border border-white/10 hover:bg-white/5"
							type="button">
							Load more
						</button>
					</div>
				)}

				{feedLoading && feed.length > 0 && (
					<div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
						<Loader2 className="h-4 w-4 animate-spin" />
						Loading more...
					</div>
				)}
			</div>
		</main>
	);
}
