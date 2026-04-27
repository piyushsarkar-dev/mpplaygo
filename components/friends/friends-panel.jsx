"use client";

import {
  FRIEND_STATUS_META,
  FRIEND_TABS,
  normalizeFriendStatus,
  useFriends,
} from "@/components/providers/friends-provider";
import { useRoom } from "@/components/providers/room-provider";
import { useSupabase } from "@/components/providers/supabase-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  RotateCcw,
  Search,
  SendHorizontal,
  UserRoundPlus,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

function makePairKey(leftId, rightId) {
  return [leftId, rightId].filter(Boolean).sort().join("::");
}

function getInitial(value) {
  return (
    String(value || "U")
      .trim()
      .charAt(0)
      .toUpperCase() || "U"
  );
}

function FriendAvatar({ person, className, imageClassName = "" }) {
  const avatarUrl =
    person?.avatar_url ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
      person?.username || person?.full_name || person?.id || "user",
    )}`;

  return (
    <Avatar className={cn("shrink-0", className)}>
      <AvatarImage
        src={avatarUrl}
        className={imageClassName}
      />
      <AvatarFallback className="bg-white/10 text-white/80 font-semibold">
        {getInitial(person?.username || person?.full_name || person?.id)}
      </AvatarFallback>
    </Avatar>
  );
}

function StatusChip({ status, className }) {
  const normalized = normalizeFriendStatus(status);
  const meta = FRIEND_STATUS_META[normalized] || FRIEND_STATUS_META.offline;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium",
        meta.chipClassName,
        className,
      )}>
      <span className={cn("h-2 w-2 rounded-full", meta.dotClassName)} />
      {meta.label}
    </span>
  );
}

function TabButton({ tab, label, count }) {
  const { activeTab, setActiveTab } = useFriends();
  const active = activeTab === tab;

  return (
    <Button
      variant={active ? "secondary" : "ghost"}
      size="sm"
      onClick={() => setActiveTab(tab)}
      className={cn(
        "h-9 rounded-full px-4 text-sm transition-all",
        active ? "bg-white/12 text-white" : "text-white/55 hover:text-white",
      )}>
      <span>{label}</span>
      {typeof count === "number" && count > 0 && (
        <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white/10 px-1.5 text-[10px] font-semibold text-white/80">
          {count}
        </span>
      )}
    </Button>
  );
}

function FriendsContent() {
  const router = useRouter();
  const { user } = useSupabase();
  const { room, isInRoom } = useRoom();
  const {
    activeTab,
    searchQuery,
    setSearchQuery,
    searchResults,
    searchLoading,
    incomingRequests,
    friendEntries,
    onlineFriends,
    offlineFriends,
    friendIdSet,
    requestPairSet,
    presenceMap,
    myStatus,
    updateMyStatus,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    sendRoomInvite,
    dismissRoomInvite,
    incomingRoomInvites,
    onlineUsers,
    loading,
    refreshFriendsData,
  } = useFriends();
  const searchInputRef = useRef(null);
  const [showOfflineFriends, setShowOfflineFriends] = useState(false);

  useEffect(() => {
    if (activeTab === FRIEND_TABS.SEARCH) {
      searchInputRef.current?.focus?.();
    }
  }, [activeTab]);

  const searchResultsWithState = useMemo(() => {
    return searchResults.map((person) => {
      const pairKey = makePairKey(user?.id, person.id);
      const receivedRequest = incomingRequests.some(
        (request) => request.sender_id === person.id,
      );
      const friend = friendIdSet.has(person.id);
      const pending = requestPairSet.has(pairKey);
      const status = normalizeFriendStatus(
        presenceMap.get(person.id) || "offline",
      );

      let label = "Add Friend";
      let disabled = false;

      if (friend) {
        label = "Friends";
        disabled = true;
      } else if (receivedRequest) {
        label = "Pending in Requests";
        disabled = true;
      } else if (pending) {
        label = "Requested";
        disabled = true;
      }

      return {
        ...person,
        status,
        label,
        disabled,
      };
    });
  }, [
    friendIdSet,
    incomingRequests,
    presenceMap,
    requestPairSet,
    searchResults,
    user?.id,
  ]);

  const requestCount = incomingRequests.length;
  const friendCount = friendEntries.length;
  const onlineCount = onlineFriends.length;
  const offlineCount = offlineFriends.length;

  const statusOptions = ["online", "offline", "dnd"];

  const renderStatusButtons = () => (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11px] uppercase tracking-[0.28em] text-white/35">
        Your status
      </span>
      {statusOptions.map((status) => {
        const active = myStatus === status;
        const meta = FRIEND_STATUS_META[status];
        return (
          <Button
            key={status}
            variant={active ? "secondary" : "outline"}
            size="sm"
            onClick={() => updateMyStatus(status)}
            className={cn(
              "h-9 rounded-full px-4 text-xs",
              active ?
                "border-white/10 bg-white/12 text-white"
              : "border-white/10 text-white/70 hover:text-white",
            )}>
            <span
              className={cn("mr-2 h-2 w-2 rounded-full", meta.dotClassName)}
            />
            {meta.label}
          </Button>
        );
      })}
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col text-white">
      <div className="border-b border-white/10 bg-white/[0.02] px-4 py-4 md:px-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.32em] text-white/35">
              Social hub
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
              Friends
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-white/45">
              Search users, review requests, manage presence, and send room
              invites instantly.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/")}
            className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-4 space-y-3">
          {renderStatusButtons()}
          <div className="flex flex-wrap gap-2">
            <TabButton
              tab={FRIEND_TABS.SEARCH}
              label="Search Friends"
            />
            <TabButton
              tab={FRIEND_TABS.REQUESTS}
              label="Friend Requests"
              count={requestCount}
            />
            <TabButton
              tab={FRIEND_TABS.FRIENDS}
              label="Friends List"
              count={friendCount}
            />
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-6 px-4 py-4 md:px-6 md:py-5">
          <section className="space-y-4 rounded-3xl border border-white/10 bg-white/[0.03] p-4 md:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/35">
                  Online now
                </p>
                <h3 className="mt-1 text-lg font-semibold text-white">
                  Top 10 online users
                </h3>
                <p className="mt-1 text-sm text-white/45">
                  These are the current online users, whether or not they are in
                  your friends list.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={refreshFriendsData}
                className="rounded-full border border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white">
                <RotateCcw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>

            {loading ?
              <div className="grid gap-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-3 py-3">
                    <Skeleton className="h-11 w-11 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-9 w-28 rounded-full" />
                  </div>
                ))}
              </div>
            : onlineUsers.length > 0 ?
              <div className="grid gap-2">
                {onlineUsers.map((person) => {
                  const pairKey = [user?.id, person.id]
                    .filter(Boolean)
                    .sort()
                    .join("::");
                  const alreadyFriend = friendIdSet.has(person.id);
                  const pending = requestPairSet.has(pairKey);
                  const canSendRequest = user && !alreadyFriend && !pending;
                  return (
                    <div
                      key={person.id}
                      className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <FriendAvatar
                          person={person}
                          className="h-11 w-11"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">
                            @{person.username}
                          </p>
                          <p className="truncate text-xs text-white/45">
                            {person.full_name || "Online now"}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusChip status={person.status} />
                        <Button
                          variant={canSendRequest ? "default" : "outline"}
                          size="sm"
                          disabled={!canSendRequest}
                          onClick={() => sendFriendRequest(person)}
                          className={cn(
                            "rounded-full",
                            canSendRequest ?
                              "bg-[#1DB954] text-black hover:bg-[#1ed760]"
                            : "border-white/10 bg-white/[0.03] text-white/45",
                          )}>
                          <UserRoundPlus className="mr-2 h-4 w-4" />
                          {alreadyFriend ?
                            "Friends"
                          : pending ?
                            "Requested"
                          : "Add Friend"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            : <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center text-sm text-white/45">
                No online users right now.
              </div>
            }
          </section>

          {user ? null : (
            <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 md:p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.06] text-white/70">
                  <UserRoundPlus className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">
                    Login required
                  </p>
                  <p className="text-sm text-white/45">
                    Sign in to search, send requests, and receive invites.
                  </p>
                </div>
              </div>
            </section>
          )}

          {activeTab === FRIEND_TABS.SEARCH && user && (
            <section className="space-y-4 rounded-3xl border border-white/10 bg-white/[0.03] p-4 md:p-5">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/35">
                  Search friends
                </p>
                <p className="mt-1 text-sm text-white/45">
                  Search by username and send a request without leaving the app.
                </p>
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                <Input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by username"
                  autoComplete="off"
                  className="h-11 rounded-2xl border-white/10 bg-black/30 pl-10 pr-11 text-white placeholder:text-white/30 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                {searchQuery.trim().length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full text-white/45 hover:text-white">
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {searchLoading ?
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-3 py-3">
                      <Skeleton className="h-11 w-11 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-9 w-28 rounded-full" />
                    </div>
                  ))}
                </div>
              : (
                searchQuery.trim().length >= 2 &&
                searchResultsWithState.length > 0
              ) ?
                <div className="space-y-2">
                  {searchResultsWithState.map((person) => (
                    <div
                      key={person.id}
                      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-3 py-3 transition hover:border-white/15 hover:bg-white/[0.04]">
                      <Link
                        href={`/profile/${encodeURIComponent(person.username || person.id)}`}
                        className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-1 py-1 text-left transition hover:bg-white/[0.03]">
                        <FriendAvatar
                          person={person}
                          className="h-11 w-11"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-semibold text-white">
                              @{person.username || person.id}
                            </p>
                            {person.status && person.status !== "offline" && (
                              <StatusChip status={person.status} />
                            )}
                          </div>
                          {person.full_name ?
                            <p className="truncate text-xs text-white/45">
                              {person.full_name}
                            </p>
                          : null}
                        </div>
                      </Link>
                      <Button
                        variant={person.disabled ? "outline" : "default"}
                        size="sm"
                        disabled={person.disabled}
                        onClick={() => sendFriendRequest(person)}
                        className={cn(
                          "shrink-0 rounded-full px-4",
                          person.disabled ?
                            "border-white/10 bg-white/[0.03] text-white/50"
                          : "bg-[#1DB954] text-black hover:bg-[#1ed760]",
                        )}>
                        {person.disabled ?
                          person.label
                        : <>
                            <UserRoundPlus className="mr-2 h-4 w-4" />
                            {person.label}
                          </>
                        }
                      </Button>
                    </div>
                  ))}
                </div>
              : searchQuery.trim().length >= 2 ?
                <div className="rounded-3xl border border-white/10 bg-white/[0.02] px-4 py-8 text-center text-sm text-white/45">
                  No matching users found.
                </div>
              : <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center text-sm text-white/45">
                  Type at least 2 characters to search by username.
                </div>
              }
            </section>
          )}

          {activeTab === FRIEND_TABS.REQUESTS && user && (
            <section className="space-y-4 rounded-3xl border border-white/10 bg-white/[0.03] p-4 md:p-5">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/35">
                  Incoming requests
                </p>
                <p className="mt-1 text-sm text-white/45">
                  Accept or reject requests as they arrive.
                </p>
              </div>

              {loading ?
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-3 py-3">
                      <Skeleton className="h-11 w-11 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                  ))}
                </div>
              : incomingRequests.length > 0 ?
                <div className="space-y-2">
                  {incomingRequests.map((request) => {
                    const sender = request.sender || {};
                    const senderHref = `/profile/${encodeURIComponent(sender.username || request.sender_id)}`;
                    return (
                      <div
                        key={request.id}
                        className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-3 py-3">
                        <Link
                          href={senderHref}
                          className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-1 py-1 text-left transition hover:bg-white/[0.03]">
                          <FriendAvatar
                            person={sender}
                            className="h-11 w-11"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-white">
                              @{sender.username || request.sender_id}
                            </p>
                            <p className="truncate text-xs text-white/45">
                              Sent you a friend request
                            </p>
                          </div>
                        </Link>
                        <div className="flex shrink-0 items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => acceptFriendRequest(request)}
                            className="rounded-full border-white/10 text-white/70 hover:text-white">
                            <Check className="mr-2 h-4 w-4" />
                            Accept
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => rejectFriendRequest(request.id)}
                            className="rounded-full text-white/55 hover:text-white">
                            <X className="mr-2 h-4 w-4" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              : <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center text-sm text-white/45">
                  No incoming friend requests.
                </div>
              }
            </section>
          )}

          {activeTab === FRIEND_TABS.FRIENDS && user && (
            <div className="space-y-6">
              {incomingRoomInvites.length > 0 && (
                <section className="space-y-4 rounded-3xl border border-amber-400/15 bg-amber-400/[0.06] p-4 md:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-amber-200/60">
                        Room invites
                      </p>
                      <p className="mt-1 text-sm text-white/60">
                        Incoming invitations update in real time.
                      </p>
                    </div>
                    <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-100">
                      {incomingRoomInvites.length}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {incomingRoomInvites.map((invite) => (
                      <div
                        key={invite.id}
                        className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">
                            {invite.sender?.username ?
                              <Link
                                href={`/profile/${encodeURIComponent(invite.sender.username)}`}
                                className="hover:underline">
                                @{invite.sender.username}
                              </Link>
                            : "A friend"}{" "}
                            invited you to a room
                          </p>
                          <p className="truncate text-xs text-white/45">
                            Room ID: {invite.room_id}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              router.push(`/room/${invite.room_id}`);
                            }}
                            className="rounded-full">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Open Room
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => dismissRoomInvite(invite.id)}
                            className="rounded-full text-white/55 hover:text-white">
                            Dismiss
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section className="space-y-4 rounded-3xl border border-white/10 bg-white/[0.03] p-4 md:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/35">
                      Quick access
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-white">
                      Online friends
                    </h3>
                    <p className="mt-1 text-sm text-white/45">
                      Invite friends who are online right now.
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2 text-right">
                    <StatusChip status={myStatus} />
                    <span className="text-xs text-white/40">
                      {onlineCount} online / {offlineCount} hidden
                    </span>
                  </div>
                </div>

                {loading ?
                  <div className="grid gap-3">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-3 py-3">
                        <Skeleton className="h-11 w-11 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-28" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                        <Skeleton className="h-9 w-32 rounded-full" />
                      </div>
                    ))}
                  </div>
                : onlineFriends.length > 0 ?
                  <div className="grid gap-3">
                    {onlineFriends.map((friend) => (
                      <div
                        key={friend.id}
                        className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <Link
                          href={`/profile/${encodeURIComponent(friend.username || friend.id)}`}
                          className="flex min-w-0 items-center gap-3 rounded-2xl px-1 py-1 text-left transition hover:bg-white/[0.03]">
                          <FriendAvatar
                            person={friend}
                            className="h-11 w-11"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">
                              @{friend.username || friend.id}
                            </p>
                            <p className="truncate text-xs text-white/45">
                              {friend.full_name || "Online now"}
                            </p>
                          </div>
                        </Link>
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusChip status={friend.status} />
                          <Button
                            variant={isInRoom ? "default" : "outline"}
                            size="sm"
                            disabled={!isInRoom}
                            onClick={() =>
                              sendRoomInvite({
                                friendId: friend.id,
                                roomId: room?.id,
                              })
                            }
                            className={cn(
                              "rounded-full",
                              isInRoom ?
                                "bg-[#1DB954] text-black hover:bg-[#1ed760]"
                              : "border-white/10 bg-white/[0.03] text-white/45",
                            )}>
                            <SendHorizontal className="mr-2 h-4 w-4" />
                            {isInRoom ? "Invite to Room" : "Join a room first"}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                : <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center text-sm text-white/45">
                    No friends are online right now.
                  </div>
                }

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowOfflineFriends((current) => !current)}
                    className="inline-flex items-center gap-2 text-sm text-white/55 transition hover:text-white">
                    {showOfflineFriends ?
                      <>
                        <ChevronUp className="h-4 w-4" />
                        Hide offline and DND friends
                      </>
                    : <>
                        <ChevronDown className="h-4 w-4" />
                        Show {offlineCount} hidden friends
                      </>
                    }
                  </button>
                </div>

                {showOfflineFriends && offlineFriends.length > 0 && (
                  <div className="grid gap-3">
                    {offlineFriends.map((friend) => (
                      <div
                        key={friend.id}
                        className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <Link
                          href={`/profile/${encodeURIComponent(friend.username || friend.id)}`}
                          className="flex min-w-0 items-center gap-3 rounded-2xl px-1 py-1 text-left transition hover:bg-white/[0.03]">
                          <FriendAvatar
                            person={friend}
                            className="h-11 w-11"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">
                              @{friend.username}
                            </p>
                            <p className="truncate text-xs text-white/45">
                              {friend.full_name || "Offline"}
                            </p>
                          </div>
                        </Link>
                        <div className="flex items-center gap-2">
                          <StatusChip status={friend.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {user &&
            activeTab === FRIEND_TABS.FRIENDS &&
            friendEntries.length === 0 &&
            !loading && (
              <section className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center text-sm text-white/45">
                You do not have any accepted friends yet.
              </section>
            )}
        </div>
      </ScrollArea>
    </div>
  );
}

function FriendsShell() {
  return <FriendsContent />;
}

export default function FriendsPanel() {
  return <FriendsShell />;
}
