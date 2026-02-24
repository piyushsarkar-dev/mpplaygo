"use client";

/* eslint-disable @next/next/no-img-element */

import SongCard from "@/components/cards/song";
import { useSupabase } from "@/components/providers/supabase-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { getSongsByQuery, getSongsSuggestions } from "@/lib/fetch";
import {
  ChevronLeft,
  ChevronRight,
  Music2,
  Sparkles,
  User,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

/* ────────────────────────────────────────────────
   HorizontalRow — reusable horizontal scroll row
   ──────────────────────────────────────────────── */
function HorizontalRow({ children, className = "" }) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      ro.disconnect();
    };
  }, [checkScroll, children]);

  const scroll = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.7, behavior: "smooth" });
  };

  return (
    <div className={`relative group/scroll ${className}`}>
      {/* Left arrow */}
      {canScrollLeft && (
        <button
          onClick={() => scroll(-1)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-20 hidden md:flex w-10 h-10 items-center justify-center rounded-full bg-black/70 border border-white/10 text-white shadow-lg opacity-0 group-hover/scroll:opacity-100 transition-opacity hover:bg-black/90">
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}
      {/* Right arrow */}
      {canScrollRight && (
        <button
          onClick={() => scroll(1)}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-20 hidden md:flex w-10 h-10 items-center justify-center rounded-full bg-black/70 border border-white/10 text-white shadow-lg opacity-0 group-hover/scroll:opacity-100 transition-opacity hover:bg-black/90">
          <ChevronRight className="w-5 h-5" />
        </button>
      )}

      <div
        ref={scrollRef}
        className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide scroll-smooth px-1 pb-2">
        {children}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────
   SectionHeader
   ──────────────────────────────────────────────── */
function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-center gap-2.5 mb-3 md:mb-4">
      {Icon && (
        <div className="flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-lg bg-white/5 border border-white/10">
          <Icon className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
        </div>
      )}
      <div>
        <h2 className="text-sm md:text-lg font-semibold text-white leading-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="text-[11px] md:text-xs text-zinc-500 mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────
   Mini song card for horizontal rows
   ──────────────────────────────────────────────── */
function MiniSongCard({ song }) {
  const imgUrl =
    (Array.isArray(song.image) ?
      song.image?.[2]?.url || song.image?.[1]?.url || song.image?.[0]?.url
    : song.image) || "";
  const safe =
    typeof imgUrl === "string" ?
      imgUrl.replace(/^http:\/\//, "https://")
    : imgUrl;
  const artist =
    song.artists?.primary?.[0]?.name ||
    song.artist ||
    song.primaryArtists ||
    "";

  return (
    <div className="flex-shrink-0 w-[140px] md:w-[180px]">
      <SongCard
        item={song}
        id={song.id}
        image={safe}
        title={song.name || song.song_title || ""}
        artist={artist}
        className="w-full"
        imageClassName="w-full !h-[140px] md:!h-[180px] aspect-square object-cover"
      />
    </div>
  );
}

/* ────────────────────────────────────────────────
   PersonalizedSections — main export
   ──────────────────────────────────────────────── */
export default function PersonalizedSections() {
  const { user, supabase, isLoading: authLoading } = useSupabase();

  // State
  const [topArtists, setTopArtists] = useState([]); // [{name, count, image, songs:[]}]
  const [artistSections, setArtistSections] = useState([]); // [{artistName, songs:[]}]
  const [suggestedSongs, setSuggestedSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    (async () => {
      try {
        setLoading(true);

        // 1. Fetch user history (last 100 entries)
        const { data: history, error } = await supabase
          .from("user_history")
          .select("song_id, song_title, artist, thumbnail, language")
          .eq("user_id", user.id)
          .order("listened_at", { ascending: false })
          .limit(100);

        if (error || !history || history.length === 0) {
          setLoading(false);
          return;
        }

        // 2. Compute top artists by play count
        const artistMap = new Map();
        for (const h of history) {
          const name = (h.artist || "").trim();
          if (!name || name === "Unknown") continue;
          const key = name.toLowerCase();
          if (!artistMap.has(key)) {
            artistMap.set(key, {
              name,
              count: 0,
              image: h.thumbnail || "",
            });
          }
          const entry = artistMap.get(key);
          entry.count += 1;
          // Keep best thumbnail
          if (!entry.image && h.thumbnail) entry.image = h.thumbnail;
        }

        const sortedArtists = [...artistMap.values()]
          .sort((a, b) => b.count - a.count)
          .slice(0, 8);

        setTopArtists(sortedArtists);

        // 3. For top 3 artists, fetch their songs
        const top3 = sortedArtists.slice(0, 3);
        const artistSectionsData = await Promise.all(
          top3.map(async (artist) => {
            try {
              const res = await getSongsByQuery(artist.name);
              const json = await res?.json();
              const songs = json?.data?.results || [];
              return { artistName: artist.name, songs: songs.slice(0, 15) };
            } catch {
              return { artistName: artist.name, songs: [] };
            }
          }),
        );
        setArtistSections(artistSectionsData.filter((s) => s.songs.length > 0));

        // 4. Fetch suggestions based on most recent unique songs
        const uniqueRecent = [];
        const seenIds = new Set();
        for (const h of history) {
          if (!seenIds.has(h.song_id)) {
            seenIds.add(h.song_id);
            uniqueRecent.push(h.song_id);
          }
          if (uniqueRecent.length >= 3) break;
        }

        const suggResults = await Promise.all(
          uniqueRecent.map(async (songId) => {
            try {
              const res = await getSongsSuggestions(songId);
              const json = await res?.json();
              return json?.data || [];
            } catch {
              return [];
            }
          }),
        );

        // Flatten & dedupe suggestions
        const allSugg = [];
        const suggSeen = new Set();
        for (const arr of suggResults) {
          for (const s of arr) {
            if (s?.id && !suggSeen.has(s.id)) {
              suggSeen.add(s.id);
              allSugg.push(s);
            }
          }
        }
        setSuggestedSongs(allSugg.slice(0, 20));
      } catch (e) {
        console.error("PersonalizedSections error:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user, supabase, authLoading]);

  // Reset when user changes
  useEffect(() => {
    if (!user) {
      fetchedRef.current = false;
      setTopArtists([]);
      setArtistSections([]);
      setSuggestedSongs([]);
    }
  }, [user]);

  // Don't render if not logged in or no data
  if (authLoading || !user) return null;

  if (loading) {
    return (
      <div className="flex flex-col gap-6 md:gap-8">
        {/* Skeleton for top artists */}
        <section>
          <div className="flex items-center gap-2.5 mb-4">
            <Skeleton className="w-8 h-8 rounded-lg" />
            <Skeleton className="w-32 h-5" />
          </div>
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col items-center gap-2 flex-shrink-0">
                <Skeleton className="w-[72px] h-[72px] md:w-[88px] md:h-[88px] rounded-full" />
                <Skeleton className="w-14 h-3" />
              </div>
            ))}
          </div>
        </section>
        {/* Skeleton for song rows */}
        {[1, 2].map((n) => (
          <section key={n}>
            <div className="flex items-center gap-2.5 mb-4">
              <Skeleton className="w-8 h-8 rounded-lg" />
              <Skeleton className="w-48 h-5" />
            </div>
            <div className="flex gap-3 overflow-hidden">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 w-[140px] md:w-[180px]">
                  <Skeleton className="w-full h-[140px] md:h-[180px] rounded-xl" />
                  <Skeleton className="w-[80%] h-4 mt-2" />
                  <Skeleton className="w-[50%] h-3 mt-1" />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  const hasAnyData =
    topArtists.length > 0 ||
    artistSections.length > 0 ||
    suggestedSongs.length > 0;

  if (!hasAnyData) return null;

  return (
    <div className="flex flex-col gap-6 md:gap-10">
      {/* ───── Your Top Artists ───── */}
      {topArtists.length > 0 && (
        <section>
          <SectionHeader
            icon={User}
            title="Your Top Artists"
            subtitle="Based on your listening history"
          />
          <HorizontalRow>
            {topArtists.map((a) => {
              const imgSafe =
                typeof a.image === "string" ?
                  a.image.replace(/^http:\/\//, "https://")
                : a.image;
              return (
                <Link
                  key={a.name}
                  href={`/search/${encodeURIComponent(a.name)}`}
                  className="flex flex-col items-center gap-2.5 group cursor-pointer flex-shrink-0 w-[80px] md:w-[100px]">
                  <div className="w-[68px] h-[68px] md:w-[88px] md:h-[88px] rounded-full overflow-hidden border-2 border-white/10 group-hover:border-primary/60 transition-all shadow-lg ring-2 ring-transparent group-hover:ring-primary/20">
                    {imgSafe ?
                      <img
                        src={imgSafe}
                        alt={a.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
                        onError={(e) => {
                          e.currentTarget.src =
                            "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300&auto=format&fit=crop&q=60";
                        }}
                      />
                    : <div className="w-full h-full bg-white/5 flex items-center justify-center">
                        <Music2 className="w-6 h-6 text-zinc-500" />
                      </div>
                    }
                  </div>
                  <span className="text-zinc-400 group-hover:text-white font-medium text-[11px] md:text-xs text-center max-w-[80px] md:max-w-[100px] truncate transition">
                    {a.name}
                  </span>
                  <span className="text-[10px] text-zinc-600 -mt-1.5">
                    {a.count} {a.count === 1 ? "play" : "plays"}
                  </span>
                </Link>
              );
            })}
          </HorizontalRow>
        </section>
      )}

      {/* ───── Because You Listen To [Artist] ───── */}
      {artistSections.map((section) => (
        <section key={section.artistName}>
          <SectionHeader
            icon={Music2}
            title={`Because You Listen To ${section.artistName}`}
            subtitle="Songs you might enjoy"
          />
          <HorizontalRow>
            {section.songs.map((song) => (
              <MiniSongCard
                key={song.id}
                song={song}
              />
            ))}
          </HorizontalRow>
        </section>
      ))}

      {/* ───── Suggested For You (based on recent plays) ───── */}
      {suggestedSongs.length > 0 && (
        <section>
          <SectionHeader
            icon={Sparkles}
            title="Suggested For You"
            subtitle="Based on songs you recently played"
          />
          <HorizontalRow>
            {suggestedSongs.map((song) => (
              <MiniSongCard
                key={song.id}
                song={song}
              />
            ))}
          </HorizontalRow>
        </section>
      )}
    </div>
  );
}
