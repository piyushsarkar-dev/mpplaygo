"use client";
import AlbumCard from "@/components/cards/album";
import ArtistCard from "@/components/cards/artist";
import SongCard from "@/components/cards/song";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { getSongsByQueryPaged, searchAlbumByQueryPaged } from "@/lib/fetch";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export default function Search({ params }) {
    const query = params.id;

    const [artists, setArtists] = useState([]);
    const [songs, setSongs] = useState([]);
    const [albums, setAlbums] = useState([]);

    const [songsPage, setSongsPage] = useState(1);
    const [albumsPage, setAlbumsPage] = useState(1);
    const [songsLoading, setSongsLoading] = useState(false);
    const [albumsLoading, setAlbumsLoading] = useState(false);
    const [songsHasMore, setSongsHasMore] = useState(true);
    const [albumsHasMore, setAlbumsHasMore] = useState(true);

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

    const getSongs = async (pageToLoad) => {
        if (songsLoading) return;
        if (!songsHasMore && pageToLoad !== 1) return;

        setSongsLoading(true);
        try {
            const res = await getSongsByQueryPaged(query, { page: pageToLoad, limit: 20 });
            const json = await res?.json();
            const nextResults = json?.data?.results || [];

            setSongs((prev) => {
                const merged = pageToLoad === 1 ? nextResults : mergeUniqueById(prev, nextResults);
                if (!nextResults.length || merged.length === prev.length) {
                    setSongsHasMore(false);
                }
                return merged;
            });
        } catch (e) {
            setSongsHasMore(false);
        } finally {
            setSongsLoading(false);
        }
    };

    const getAlbum = async (pageToLoad) => {
        if (albumsLoading) return;
        if (!albumsHasMore && pageToLoad !== 1) return;

        setAlbumsLoading(true);
        try {
            const res = await searchAlbumByQueryPaged(query, { page: pageToLoad, limit: 20 });
            const json = await res?.json();
            const nextResults = json?.data?.results || [];

            setAlbums((prev) => {
                const merged = pageToLoad === 1 ? nextResults : mergeUniqueById(prev, nextResults);
                if (!nextResults.length || merged.length === prev.length) {
                    setAlbumsHasMore(false);
                }
                return merged;
            });
        } catch (e) {
            setAlbumsHasMore(false);
        } finally {
            setAlbumsLoading(false);
        }
    };

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
        setSongs([]);
        setAlbums([]);
        setArtists([]);
        setSongsPage(1);
        setAlbumsPage(1);
        setSongsHasMore(true);
        setAlbumsHasMore(true);

        getSongs(1);
        getAlbum(1);
    }, [params.id]);

    const loadMoreSongs = () => {
        if (songsLoading || !songsHasMore) return;
        const nextPage = songsPage + 1;
        setSongsPage(nextPage);
        getSongs(nextPage);
    };

    const loadMoreAlbums = () => {
        if (albumsLoading || !albumsHasMore) return;
        const nextPage = albumsPage + 1;
        setAlbumsPage(nextPage);
        getAlbum(nextPage);
    };

    const { sentinelRef: songsSentinelRef } = useInfiniteScroll({
        enabled: songsHasMore && !songsLoading,
        onLoadMore: loadMoreSongs,
        root: null,
        rootMargin: "600px 0px",
    });

    const { sentinelRef: albumsSentinelRef } = useInfiniteScroll({
        enabled: albumsHasMore && !albumsLoading,
        onLoadMore: loadMoreAlbums,
        root: null,
        rootMargin: "600px 0px",
    });

    return (
        <div className="py-12 -mt-9 px-6 md:px-20 lg:px-32">
            <div className="grid gap-4">
                <div className="mt-2">
                    <h1 className="text-base">Search Results</h1>
                    <p className="text-xs text-muted-foreground">search results for "{decodedQuery}"</p>
                </div>
                <div className="grid gap-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {songs.length ? songs.map((song) => (
                            <SongCard key={song.id} id={song.id} image={song.image?.[2]?.url} artist={song.artists?.primary?.[0]?.name || "unknown"} title={song.name} />
                        )) : (
                            Array.from({ length: 10 }).map((_, i) => <SongCard key={i} />)
                        )}
                    </div>

                    {/* Sentinel: when it enters view, fetch the next page */}
                    <div ref={songsSentinelRef} className="h-10 w-full" />

                    {(songsLoading && songs.length > 0) && (
                        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading more songs...
                        </div>
                    )}
                </div>

                <div className="mt-8">
                    <h1 className="text-base">Related Albums</h1>
                    <p className="text-xs text-muted-foreground">Albums related to "{decodedQuery}"</p>
                </div>
                <div className="grid gap-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {albums.length ? albums.map((album) => (
                            <AlbumCard key={album.id} lang={album.language} desc={album.description || null} id={`album/${album.id}`} image={album.image?.[2]?.url} title={album.name} artist={album.artists?.primary?.[0]?.name || "unknown"} />
                        )) : (
                            Array.from({ length: 10 }).map((_, i) => <SongCard key={i} />)
                        )}
                    </div>

                    <div ref={albumsSentinelRef} className="h-10 w-full" />

                    {(albumsLoading && albums.length > 0) && (
                        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading more albums...
                        </div>
                    )}
                </div>

                <div className="mt-4">
                    <h1 className="text-base font-medium">Related Artists</h1>
                    <p className="text-xs text-muted-foreground">artists related to "{decodedQuery}"</p>
                </div>
                <ScrollArea>
                    {artists.length > 0 ? (
                        <div className="flex gap-4">
                            {artists.map((song) => {
                                const artist = song?.artists?.primary?.[0];
                                const fallbackLetter = artist?.name?.split("")?.[0]?.toUpperCase?.() || "U";
                                const fallbackAvatar = `https://az-avatar.vercel.app/api/avatar/?bgColor=0f0f0f0&fontSize=60&text=${fallbackLetter}`;
                                return (
                                    <ArtistCard
                                        key={artist?.id}
                                        id={artist?.id}
                                        image={artist?.image?.[2]?.url || fallbackAvatar}
                                        name={artist?.name || "unknown"}
                                    />
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex gap-3">
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
                    )}
                    <ScrollBar orientation="horizontal" className="hidden sm:flex" />
                </ScrollArea>
            </div>
        </div>
    )
}