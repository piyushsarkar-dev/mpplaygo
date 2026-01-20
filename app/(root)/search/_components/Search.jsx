"use client";
import AlbumCard from "@/components/cards/album";
import ArtistCard from "@/components/cards/artist";
import SongCard from "@/components/cards/song";
import { useSupabase } from "@/components/providers/supabase-provider";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { getSongsByQueryPaged, searchAlbumByQueryPaged } from "@/lib/fetch";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

export default function Search({ params }) {
	const query = params.id;
	const PAGE_SIZE = 30;

	const [artists, setArtists] = useState([]);
	const [songs, setSongs] = useState([]);
	const [albums, setAlbums] = useState([]);
	const [userResults, setUserResults] = useState([]);

	const { supabase } = useSupabase();

	const [songsPage, setSongsPage] = useState(1);
	const [albumsPage, setAlbumsPage] = useState(1);
	const [songsLoading, setSongsLoading] = useState(false);
	const [albumsLoading, setAlbumsLoading] = useState(false);
	const [songsHasMore, setSongsHasMore] = useState(true);
	const [albumsHasMore, setAlbumsHasMore] = useState(true);

	const songsPageRef = useRef(1);
	const albumsPageRef = useRef(1);
	const songsLoadingRef = useRef(false);
	const albumsLoadingRef = useRef(false);
	const songsHasMoreRef = useRef(true);
	const albumsHasMoreRef = useRef(true);
	const songsAbortRef = useRef(null);
	const albumsAbortRef = useRef(null);
	const songsCacheRef = useRef(new Map());
	const albumsCacheRef = useRef(new Map());

	const decodedQuery = useMemo(() => {
		try {
			return decodeURI(query);
		} catch {
			return query;
		}
	}, [query]);

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

	const setSongsLoadingSafe = (v) => {
		songsLoadingRef.current = v;
		setSongsLoading(v);
	};

	const setAlbumsLoadingSafe = (v) => {
		albumsLoadingRef.current = v;
		setAlbumsLoading(v);
	};

	const setSongsHasMoreSafe = (v) => {
		songsHasMoreRef.current = v;
		setSongsHasMore(v);
	};

	const setAlbumsHasMoreSafe = (v) => {
		albumsHasMoreRef.current = v;
		setAlbumsHasMore(v);
	};

	const getSongs = async (pageToLoad) => {
		if (songsLoadingRef.current) return;
		if (!songsHasMoreRef.current && pageToLoad !== 1) return;

		const cacheKey = `${query}|${pageToLoad}`;
		if (songsCacheRef.current.has(cacheKey)) {
			const cached = songsCacheRef.current.get(cacheKey);
			setSongs((prev) => {
				const merged =
					pageToLoad === 1 ?
						cached.results
					:	mergeUniqueById(prev, cached.results);
				if (!cached.results.length) setSongsHasMoreSafe(false);
				if (
					typeof cached.total === "number" &&
					merged.length >= cached.total
				)
					setSongsHasMoreSafe(false);
				return merged;
			});
			return;
		}

		songsAbortRef.current?.abort?.();
		const controller = new AbortController();
		songsAbortRef.current = controller;

		setSongsLoadingSafe(true);
		try {
			const res = await getSongsByQueryPaged(query, {
				page: pageToLoad,
				limit: PAGE_SIZE,
				signal: controller.signal,
			});
			const json = await res?.json();
			if (controller.signal.aborted) return;
			const nextResults = json?.data?.results || [];
			const total = json?.data?.total;

			songsCacheRef.current.set(cacheKey, {
				results: nextResults,
				total,
			});

			setSongs((prev) => {
				const merged =
					pageToLoad === 1 ? nextResults : (
						mergeUniqueById(prev, nextResults)
					);
				if (
					!nextResults.length ||
					(pageToLoad !== 1 && merged.length === prev.length)
				) {
					setSongsHasMoreSafe(false);
				}
				if (typeof total === "number" && merged.length >= total) {
					setSongsHasMoreSafe(false);
				}
				return merged;
			});
		} catch (e) {
			if (!controller.signal.aborted) setSongsHasMoreSafe(false);
		} finally {
			if (!controller.signal.aborted) setSongsLoadingSafe(false);
		}
	};

	const getAlbum = async (pageToLoad) => {
		if (albumsLoadingRef.current) return;
		if (!albumsHasMoreRef.current && pageToLoad !== 1) return;

		const cacheKey = `${query}|${pageToLoad}`;
		if (albumsCacheRef.current.has(cacheKey)) {
			const cached = albumsCacheRef.current.get(cacheKey);
			setAlbums((prev) => {
				const merged =
					pageToLoad === 1 ?
						cached.results
					:	mergeUniqueById(prev, cached.results);
				if (!cached.results.length) setAlbumsHasMoreSafe(false);
				if (
					typeof cached.total === "number" &&
					merged.length >= cached.total
				)
					setAlbumsHasMoreSafe(false);
				return merged;
			});
			return;
		}

		albumsAbortRef.current?.abort?.();
		const controller = new AbortController();
		albumsAbortRef.current = controller;

		setAlbumsLoadingSafe(true);
		try {
			const res = await searchAlbumByQueryPaged(query, {
				page: pageToLoad,
				limit: PAGE_SIZE,
				signal: controller.signal,
			});
			const json = await res?.json();
			if (controller.signal.aborted) return;
			const nextResults = json?.data?.results || [];
			const total = json?.data?.total;

			albumsCacheRef.current.set(cacheKey, {
				results: nextResults,
				total,
			});

			setAlbums((prev) => {
				const merged =
					pageToLoad === 1 ? nextResults : (
						mergeUniqueById(prev, nextResults)
					);
				if (
					!nextResults.length ||
					(pageToLoad !== 1 && merged.length === prev.length)
				) {
					setAlbumsHasMoreSafe(false);
				}
				if (typeof total === "number" && merged.length >= total) {
					setAlbumsHasMoreSafe(false);
				}
				return merged;
			});
		} catch (e) {
			if (!controller.signal.aborted) setAlbumsHasMoreSafe(false);
		} finally {
			if (!controller.signal.aborted) setAlbumsLoadingSafe(false);
		}
	};

	useEffect(() => {
		const searchUsers = async () => {
			if (!supabase) return;
			const { data } = await supabase
				.from("profiles")
				.select("*")
				.ilike("username", `%${decodedQuery}%`)
				.limit(5);
			if (data) setUserResults(data);
		};
		searchUsers();
	}, [decodedQuery, supabase]);

	useEffect(() => {
		// derive artists from songs (unique artists only)
		const uniqueArtistIds = new Set();
		const uniqueArtists = [];
		for (const song of songs) {
			const primary = song?.artists?.primary?.[0];
			if (!primary?.id) continue;
			if (uniqueArtistIds.has(primary.id)) continue;
			uniqueArtistIds.add(primary.id);
			uniqueArtists.push(song);
		}
		setArtists(uniqueArtists);
	}, [songs]);

	useEffect(() => {
		// reset on query change
		songsAbortRef.current?.abort?.();
		albumsAbortRef.current?.abort?.();
		songsCacheRef.current.clear();
		albumsCacheRef.current.clear();

		setSongs([]);
		setAlbums([]);
		setArtists([]);
		songsPageRef.current = 1;
		albumsPageRef.current = 1;
		setSongsPage(1);
		setAlbumsPage(1);
		setSongsHasMoreSafe(true);
		setAlbumsHasMoreSafe(true);
		setSongsLoadingSafe(false);
		setAlbumsLoadingSafe(false);

		getSongs(1);
		getAlbum(1);
	}, [params.id]);

	const loadMoreSongs = () => {
		if (songsLoadingRef.current || !songsHasMoreRef.current) return;
		const nextPage = songsPageRef.current + 1;
		songsPageRef.current = nextPage;
		setSongsPage(nextPage);
		getSongs(nextPage);
	};

	const loadMoreAlbums = () => {
		if (albumsLoadingRef.current || !albumsHasMoreRef.current) return;
		const nextPage = albumsPageRef.current + 1;
		albumsPageRef.current = nextPage;
		setAlbumsPage(nextPage);
		getAlbum(nextPage);
	};

	const { sentinelRef: songsSentinelRef } = useInfiniteScroll({
		enabled: songsHasMore && !songsLoading && songs.length >= PAGE_SIZE,
		onLoadMore: loadMoreSongs,
		rootMargin: "300px 0px",
		cooldownMs: 1400,
	});

	const { sentinelRef: albumsSentinelRef } = useInfiniteScroll({
		enabled: albumsHasMore && !albumsLoading && albums.length >= PAGE_SIZE,
		onLoadMore: loadMoreAlbums,
		rootMargin: "300px 0px",
		cooldownMs: 1400,
	});

	return (
		<div className="py-12 -mt-9 px-6 md:px-20 lg:px-32">
			{userResults.length > 0 && (
				<div className="mb-8">
					<h1 className="text-base font-semibold mb-4">Users</h1>
					<ScrollArea className="rounded-md">
						<div className="flex gap-4 pb-4">
							{userResults.map((u) => (
								<Link
									href={`/profile/${u.username}`}
									key={u.id}
									className="flex flex-col items-center gap-2 p-4 bg-secondary/20 rounded hover:bg-secondary/40 min-w-[120px]">
									<img
										src={
											u.avatar_url ||
											`https://api.dicebear.com/7.x/initials/svg?seed=${u.username}`
										}
										className="h-20 w-20 rounded-full object-cover"
									/>
									<p className="font-medium text-sm truncate w-full text-center">
										{u.username}
									</p>
								</Link>
							))}
						</div>
						<ScrollBar
							orientation="horizontal"
							className="hidden sm:flex"
						/>
					</ScrollArea>
				</div>
			)}
			<div className="grid gap-4">
				<div className="mt-2">
					<h1 className="text-base">Search Results</h1>
					<p className="text-xs text-muted-foreground">
						search results for "{decodedQuery}"
					</p>
				</div>
				<div className="grid gap-4">
					<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
						{songs.length ?
							songs.map((song) => (
								<SongCard
									key={song.id}
									id={song.id}
									image={song.image?.[2]?.url}
									artist={
										song.artists?.primary?.[0]?.name ||
										"unknown"
									}
									title={song.name}
								/>
							))
						:	Array.from({ length: 10 }).map((_, i) => (
								<SongCard key={i} />
							))
						}
					</div>

					{/* Sentinel: when it enters view, fetch the next page */}
					<div
						ref={songsSentinelRef}
						className="h-10 w-full"
					/>

					{!songsLoading && songsHasMore && songs.length > 0 && (
						<div className="flex items-center justify-center">
							<button
								onClick={loadMoreSongs}
								className="text-xs px-4 py-2 rounded-md border border-white/10 hover:bg-white/5"
								type="button">
								Load more songs
							</button>
						</div>
					)}

					{songsLoading && songs.length > 0 && (
						<div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
							<Loader2 className="h-4 w-4 animate-spin" />
							Loading more songs...
						</div>
					)}
				</div>

				<div className="mt-8">
					<h1 className="text-base">Related Albums</h1>
					<p className="text-xs text-muted-foreground">
						Albums related to "{decodedQuery}"
					</p>
				</div>
				<div className="grid gap-4">
					<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
						{albums.length ?
							albums.map((album) => (
								<AlbumCard
									key={album.id}
									lang={album.language}
									desc={album.description || null}
									id={`album/${album.id}`}
									image={album.image?.[2]?.url}
									title={album.name}
									artist={
										album.artists?.primary?.[0]?.name ||
										"unknown"
									}
								/>
							))
						:	Array.from({ length: 10 }).map((_, i) => (
								<SongCard key={i} />
							))
						}
					</div>

					<div
						ref={albumsSentinelRef}
						className="h-10 w-full"
					/>

					{!albumsLoading && albumsHasMore && albums.length > 0 && (
						<div className="flex items-center justify-center">
							<button
								onClick={loadMoreAlbums}
								className="text-xs px-4 py-2 rounded-md border border-white/10 hover:bg-white/5"
								type="button">
								Load more albums
							</button>
						</div>
					)}

					{albumsLoading && albums.length > 0 && (
						<div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
							<Loader2 className="h-4 w-4 animate-spin" />
							Loading more albums...
						</div>
					)}
				</div>

				<div className="mt-4">
					<h1 className="text-base font-medium">Related Artists</h1>
					<p className="text-xs text-muted-foreground">
						artists related to "{decodedQuery}"
					</p>
				</div>
				<ScrollArea>
					{artists.length > 0 ?
						<div className="flex gap-4">
							{artists.map((song) => {
								const artist = song?.artists?.primary?.[0];
								const fallbackLetter =
									artist?.name
										?.split("")?.[0]
										?.toUpperCase?.() || "U";
								const fallbackAvatar = `https://az-avatar.vercel.app/api/avatar/?bgColor=0f0f0f0&fontSize=60&text=${fallbackLetter}`;
								return (
									<ArtistCard
										key={artist?.id}
										id={artist?.id}
										image={
											artist?.image?.[2]?.url ||
											fallbackAvatar
										}
										name={artist?.name || "unknown"}
									/>
								);
							})}
						</div>
					:	<div className="flex gap-3">
							<div>
								<Skeleton className="h-[100px] w-[100px] rounded-2xl" />
								<Skeleton className="h-3 mt-2 w-10" />
							</div>
							<div>
								<Skeleton className="h-[100px] w-[100px] rounded-2xl" />
								<Skeleton className="h-3 mt-2 w-10" />
							</div>
							<div>
								<Skeleton className="h-[100px] w-[100px] rounded-2xl" />
								<Skeleton className="h-3 mt-2 w-10" />
							</div>
							<div>
								<Skeleton className="h-[100px] w-[100px] rounded-2xl" />
								<Skeleton className="h-3 mt-2 w-10" />
							</div>
							<div>
								<Skeleton className="h-[100px] w-[100px] rounded-2xl" />
								<Skeleton className="h-3 mt-2 w-10" />
							</div>
						</div>
					}
					<ScrollBar
						orientation="horizontal"
						className="hidden sm:flex"
					/>
				</ScrollArea>
			</div>
		</div>
	);
}
