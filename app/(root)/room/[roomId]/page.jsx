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
import { Lock, Radio, Users } from "lucide-react";
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
      // Check if the room still exists
      const checkRoom = async () => {
        const data = await fetchRoom(roomId);
        if (!data) {
          router.push("/");
        }
      };
      // Small delay to avoid racing
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
      <div className="w-full max-w-5xl mx-auto px-4 pt-4 md:pt-8 space-y-4 md:space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-48 md:h-32 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  // Room not found
  if (!roomInfo && !loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] px-4 text-center">
        <Radio className="w-12 h-12 md:w-16 md:h-16 text-white/20 mb-4" />
        <h2 className="text-lg md:text-xl font-bold text-white mb-2">
          Room Not Found
        </h2>
        <p className="text-white/50 text-sm md:text-base mb-6">
          This room doesn't exist or has been destroyed.
        </p>
        <Button
          onClick={() => router.push("/")}
          className="bg-primary text-black font-bold hover:bg-primary/90 rounded-xl">
          Go Home
        </Button>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] px-4 text-center">
        <Users className="w-12 h-12 md:w-16 md:h-16 text-white/20 mb-4" />
        <h2 className="text-lg md:text-xl font-bold text-white mb-2">
          Login Required
        </h2>
        <p className="text-white/50 text-sm md:text-base mb-6">
          You need to be logged in to join a room.
        </p>
        <AuthModal>
          <Button className="bg-primary text-black font-bold hover:bg-primary/90 rounded-xl">
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
        <div className="flex flex-col items-center justify-center min-h-[50vh] px-4 text-center">
          <Lock className="w-12 h-12 md:w-16 md:h-16 text-white/20 mb-4" />
          <h2 className="text-lg md:text-xl font-bold text-white mb-2">
            {roomInfo.name}
          </h2>
          <p className="text-white/50 text-sm md:text-base mb-6">
            This is a private room. Enter the password to join.
          </p>
          <Button
            onClick={() => setShowJoinModal(true)}
            className="bg-primary text-black font-bold hover:bg-primary/90 rounded-xl">
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
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <Radio className="w-10 h-10 md:w-12 md:h-12 text-primary" />
          <p className="text-white/50 text-sm">Joining room...</p>
        </div>
      </div>
    );
  }

  // In room — main UI
  return (
    <div className="w-full max-w-5xl mx-auto pt-2 md:pt-6 space-y-4 md:space-y-6 pb-32 md:pb-24">
      <RoomHeader />

      {/* Main Content: Player + Sidebar */}
      <div className="flex flex-col lg:flex-row gap-4 md:gap-6">
        {/* Left: Player + Song Search + Queue */}
        <div className="flex-1 space-y-4 min-w-0">
          <RoomPlayer />
          <RoomSongSearch />
          <RoomQueue />
        </div>

        {/* Right: Members */}
        <div className="w-full lg:w-[280px] xl:w-[320px] shrink-0">
          <RoomUsersList />
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
