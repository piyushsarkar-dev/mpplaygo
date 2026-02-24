"use client";

import { AuthModal } from "@/components/auth/auth-modal";
import { useSupabase } from "@/components/providers/supabase-provider";
import { CreateRoomModal } from "@/components/room/create-room-modal";
import { JoinRoomModal } from "@/components/room/join-room-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Globe, Lock, Music, Plus, Radio, Search, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const FILTERS = [
  { key: "all", label: "All Rooms", icon: Radio },
  { key: "public", label: "Public", icon: Globe },
  { key: "private", label: "Private", icon: Lock },
  { key: "joined", label: "My Rooms", icon: Users },
];

export default function RoomsLobbyPage() {
  const { user } = useSupabase();
  const router = useRouter();

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [joinModal, setJoinModal] = useState(null);
  const debounceRef = useRef(null);

  const fetchRooms = useCallback(
    async (searchQuery = "", currentFilter = "all") => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (searchQuery.trim()) params.set("search", searchQuery.trim());
        if (currentFilter !== "all") params.set("filter", currentFilter);
        const res = await fetch(`/api/rooms?${params.toString()}`);
        const data = await res.json();
        if (res.ok) {
          setRooms(data.rooms || []);
        }
      } catch (err) {
        console.error("Failed to fetch rooms:", err);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Initial load + re-fetch on filter change
  useEffect(() => {
    fetchRooms(search, filter);
  }, [filter, fetchRooms]);

  // Debounced search
  const onSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchRooms(val, filter);
    }, 400);
  };

  const handleRoomClick = (room) => {
    if (room.is_private && !room.is_joined) {
      setJoinModal({ roomId: room.id, roomName: room.name });
    } else {
      router.push(`/room/${room.id}`);
    }
  };

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="w-full max-w-6xl mx-auto pt-4 md:pt-8 pb-36 md:pb-24 space-y-5 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <Radio className="w-5 h-5 md:w-6 md:h-6 text-primary" />
            </div>
            Rooms
          </h1>
          <p className="text-white/40 text-sm mt-1.5 ml-12 md:ml-[52px]">
            Join a room and listen together in real-time
          </p>
        </div>

        {user && (
          <CreateRoomModal>
            <Button className="bg-primary text-black font-bold hover:bg-primary/90 rounded-xl gap-2 h-11 px-5 transition-all duration-200 hover:shadow-lg hover:shadow-primary/20">
              <Plus className="w-4 h-4" />
              Create Room
            </Button>
          </CreateRoomModal>
        )}
      </div>

      {/* Search + Filters */}
      <div className="space-y-3">
        {/* Search Bar */}
        <div className="flex items-center gap-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3.5 py-2.5 focus-within:border-primary/30 focus-within:bg-white/[0.05] transition-all duration-200">
          <Search className="w-4 h-4 text-white/30 shrink-0" />
          <Input
            placeholder="Search rooms by name..."
            value={search}
            onChange={onSearchChange}
            className="border-none bg-transparent text-white placeholder:text-white/25 h-8 px-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {FILTERS.map((f) => {
            const Icon = f.icon;
            const isActive = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                  isActive ?
                    "bg-primary text-black shadow-lg shadow-primary/15"
                  : "bg-white/[0.03] text-white/40 hover:bg-white/[0.06] hover:text-white/60 border border-white/[0.06]"
                }`}>
                <Icon className="w-3.5 h-3.5" />
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Not logged in banner */}
      {!user && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 text-primary/60" />
            </div>
            <p className="text-white/50 text-sm">
              Login to create & join rooms
            </p>
          </div>
          <AuthModal>
            <Button
              size="sm"
              className="bg-primary text-black font-bold hover:bg-primary/90 rounded-xl h-9 px-4">
              Login
            </Button>
          </AuthModal>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-12 w-full rounded-lg" />
              <div className="flex justify-between">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && rooms.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-white/[0.03] flex items-center justify-center mb-5">
            <Radio className="w-8 h-8 text-white/10" />
          </div>
          <h3 className="text-lg font-semibold text-white/50 mb-1.5">
            {search ? "No rooms found" : "No active rooms"}
          </h3>
          <p className="text-white/25 text-sm max-w-sm">
            {search ?
              `No rooms match "${search}". Try a different search.`
            : "Be the first to create a room and start listening together!"}
          </p>
          {user && !search && (
            <CreateRoomModal>
              <Button className="mt-5 bg-primary text-black font-bold hover:bg-primary/90 rounded-xl gap-2 h-11 transition-all duration-200 hover:shadow-lg hover:shadow-primary/20">
                <Plus className="w-4 h-4" />
                Create Room
              </Button>
            </CreateRoomModal>
          )}
        </div>
      )}

      {/* Room Cards Grid */}
      {!loading && rooms.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {rooms.map((room) => (
            <button
              key={room.id}
              onClick={() => handleRoomClick(room)}
              className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 text-left hover:bg-white/[0.06] hover:border-white/[0.1] transition-all duration-200 group relative overflow-hidden">
              {/* Playing indicator */}
              {room.is_playing && (
                <div className="absolute top-3.5 right-3.5 flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400"></span>
                  </span>
                  <span className="text-[10px] text-green-400 font-semibold uppercase tracking-wider">
                    LIVE
                  </span>
                </div>
              )}

              {/* Room Name + Type Badge */}
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
                  {room.is_private ?
                    <Lock className="w-4 h-4 text-primary/80" />
                  : <Radio className="w-4 h-4 text-primary/80" />}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-white font-semibold text-sm truncate group-hover:text-primary transition-colors duration-200">
                    {room.name}
                  </h3>
                  <p className="text-white/30 text-[11px] truncate mt-0.5">
                    by {room.admin?.username || "Unknown"} ·{" "}
                    {timeAgo(room.created_at)}
                  </p>
                </div>
              </div>

              {/* Currently playing song */}
              {room.current_song_data ?
                <div className="flex items-center gap-2.5 bg-black/20 rounded-xl p-2.5 mb-3 ring-1 ring-white/[0.04]">
                  <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 ring-1 ring-white/[0.06]">
                    {room.current_song_data?.image?.[1]?.url ?
                      <img
                        src={room.current_song_data.image[1].url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    : <div className="w-full h-full bg-white/[0.06] flex items-center justify-center">
                        <Music className="w-3 h-3 text-white/20" />
                      </div>
                    }
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-white/60 truncate leading-tight font-medium">
                      {room.current_song_data.name || "Unknown song"}
                    </p>
                    <p className="text-[10px] text-white/25 truncate mt-0.5">
                      {room.current_song_data.artists?.primary?.[0]?.name ||
                        room.current_song_data.primaryArtists ||
                        ""}
                    </p>
                  </div>
                </div>
              : <div className="flex items-center gap-2.5 bg-black/10 rounded-xl p-2.5 mb-3 ring-1 ring-white/[0.03]">
                  <Music className="w-4 h-4 text-white/15" />
                  <p className="text-xs text-white/20">No song playing</p>
                </div>
              }

              {/* Footer: Members + Join badge */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-white/30">
                  <Users className="w-3.5 h-3.5" />
                  <span className="text-[11px]">
                    {room.member_count} member
                    {room.member_count !== 1 ? "s" : ""}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {room.is_private && !room.is_joined && (
                    <span className="text-[10px] bg-yellow-500/10 text-yellow-400/80 px-2 py-0.5 rounded-full font-medium">
                      Password
                    </span>
                  )}
                  {room.is_joined && (
                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                      Joined
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Join Private Room Modal */}
      {joinModal && (
        <JoinRoomModal
          roomId={joinModal.roomId}
          roomName={joinModal.roomName}
          isPrivate={true}
          open={true}
          onOpenChange={(open) => {
            if (!open) setJoinModal(null);
          }}
          onJoined={() => {
            router.push(`/room/${joinModal.roomId}`);
            setJoinModal(null);
          }}
        />
      )}
    </div>
  );
}
