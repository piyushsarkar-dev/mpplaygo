"use client";

import { AuthModal } from "@/components/auth/auth-modal";
import { useRoom } from "@/components/providers/room-provider";
import { useSupabase } from "@/components/providers/supabase-provider";
import { JoinRoomModal } from "@/components/room/join-room-modal";
import { RoomHeader } from "@/components/room/room-header";
import { RoomPlayer } from "@/components/room/room-player";
import { RoomQueue } from "@/components/room/room-queue";
import { RoomSongSearch } from "@/components/room/room-song-search";
import { RoomUsersList } from "@/components/room/room-users-list";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ListMusic, Lock, Radio, Users } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function RoomPage() {
  const { roomId } = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useSupabase();
  const { isInRoom, room, enterRoom, fetchRoom, loading, error } = useRoom();

  const [roomInfo, setRoomInfo] = useState(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("player");

  // Fetch room info on mount
  useEffect(() => {
    if (!roomId) return;
    const load = async () => {
      setPageLoading(true);
      const data = await fetchRoom(roomId);
      if (data) {
        setRoomInfo(data);
      }
      setPageLoading(false);
    };
    load();
  }, [roomId, fetchRoom]);

  // Auto-join if user is logged in and room is public
  useEffect(() => {
    if (!authLoading && user && roomInfo && !isInRoom && !pageLoading) {
      if (!roomInfo.is_private) {
        enterRoom(roomId);
      } else {
        setShowJoinModal(true);
      }
    }
  }, [authLoading, user, roomInfo, isInRoom, pageLoading, roomId, enterRoom]);

  // Room was destroyed
  useEffect(() => {
    if (
      !isInRoom &&
      room === null &&
      roomInfo &&
      !pageLoading &&
      !loading &&
      user
    ) {
      const checkRoom = async () => {
        const data = await fetchRoom(roomId);
        if (!data) {
          router.push("/");
        }
      };
      const t = setTimeout(checkRoom, 1000);
      return () => clearTimeout(t);
    }
  }, [
    isInRoom,
    room,
    roomInfo,
    pageLoading,
    loading,
    user,
    roomId,
    fetchRoom,
    router,
  ]);

  // Loading state
  if (authLoading || pageLoading) {
    return (
      <div className="w-full max-w-6xl mx-auto px-3 md:px-4 pt-4 md:pt-8 space-y-4 md:space-y-6 animate-fade-in-up">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-2xl" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          <div className="hidden md:flex gap-2">
            <Skeleton className="h-9 w-20 rounded-xl" />
            <Skeleton className="h-9 w-20 rounded-xl" />
          </div>
        </div>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 space-y-4">
            <Skeleton className="h-48 md:h-36 w-full rounded-2xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton
                  key={i}
                  className="h-14 w-full rounded-xl"
                />
              ))}
            </div>
          </div>
          <div className="hidden lg:block w-[300px]">
            <Skeleton className="h-[400px] w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  // Room not found
  if (!roomInfo && !loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center animate-fade-in-up">
        <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-white/5 flex items-center justify-center mb-6">
          <Radio className="w-8 h-8 md:w-10 md:h-10 text-white/20" />
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
          Room Not Found
        </h2>
        <p className="text-white/50 text-sm md:text-base mb-8 max-w-sm">
          This room doesn&apos;t exist or has been destroyed by the admin.
        </p>
        <Button
          onClick={() => router.push("/")}
          className="bg-primary text-black font-bold hover:bg-primary/90 rounded-2xl h-12 px-8 text-sm">
          Go Home
        </Button>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center animate-fade-in-up">
        <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-white/5 flex items-center justify-center mb-6">
          <Users className="w-8 h-8 md:w-10 md:h-10 text-white/20" />
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
          Login Required
        </h2>
        <p className="text-white/50 text-sm md:text-base mb-8 max-w-sm">
          You need to be logged in to join this room and listen together.
        </p>
        <AuthModal>
          <Button className="bg-primary text-black font-bold hover:bg-primary/90 rounded-2xl h-12 px-8 text-sm">
            Login to Join
          </Button>
        </AuthModal>
      </div>
    );
  }

  // Private room — waiting for password
  if (roomInfo?.is_private && !isInRoom) {
    return (
      <>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center animate-fade-in-up">
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <Lock className="w-8 h-8 md:w-10 md:h-10 text-primary/60" />
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
            {roomInfo.name}
          </h2>
          <p className="text-white/50 text-sm md:text-base mb-8 max-w-sm">
            This is a private room. Enter the password to join.
          </p>
          <Button
            onClick={() => setShowJoinModal(true)}
            className="bg-primary text-black font-bold hover:bg-primary/90 rounded-2xl h-12 px-8 text-sm">
            Enter Password
          </Button>
        </div>
        <JoinRoomModal
          roomId={roomId}
          roomName={roomInfo?.name}
          isPrivate={true}
          open={showJoinModal}
          onOpenChange={setShowJoinModal}
          onJoined={() => {}}
        />
      </>
    );
  }

  // Loading join state
  if (!isInRoom && loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in-up">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
            <Radio className="w-7 h-7 text-primary animate-pulse" />
          </div>
          <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
        </div>
        <p className="text-white/50 text-sm mt-6">Joining room...</p>
      </div>
    );
  }

  // In room — main UI
  return (
    <div className="w-full max-w-6xl mx-auto pt-1 md:pt-4 space-y-3 md:space-y-5 pb-36 md:pb-24 animate-fade-in-up">
      <RoomHeader />

      {/* Mobile Tab Navigation */}
      <div className="md:hidden flex bg-white/[0.03] border border-white/[0.06] rounded-2xl p-1 gap-1">
        {[
          { key: "player", label: "Player", Icon: Radio },
          { key: "queue", label: "Queue", Icon: ListMusic },
          { key: "members", label: "Members", Icon: Users },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
              activeTab === tab.key ?
                "bg-primary text-black shadow-lg shadow-primary/20"
              : "text-white/50 hover:text-white/70"
            }`}>
            <tab.Icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-4 md:gap-5">
        {/* Left: Player + Song Search + Queue */}
        <div className="flex-1 space-y-4 min-w-0">
          <div className={`${activeTab !== "player" ? "hidden md:block" : ""}`}>
            <RoomPlayer />
            <div className="mt-4">
              <RoomSongSearch />
            </div>
          </div>

          <div
            className={`${
              activeTab !== "queue" && activeTab !== "player" ?
                "hidden md:block"
              : activeTab === "queue" ? ""
              : "hidden md:block"
            }`}>
            <RoomQueue />
          </div>
        </div>

        {/* Right: Members */}
        <div
          className={`w-full lg:w-[300px] xl:w-[340px] shrink-0 ${activeTab !== "members" ? "hidden lg:block" : ""}`}>
          <RoomUsersList />
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-red-400 text-sm flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
