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
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
    Bell,
    Check,
    ChevronDown,
    ChevronUp,
    Copy,
    ExternalLink,
    Facebook,
    Instagram,
    Link2,
    Play,
    Plus,
    RotateCcw,
    Search,
    UserRoundPlus,
    Users,
    X
} from "lucide-react";
import { BsWhatsapp } from "react-icons/bs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

const MAX_FRIENDS = 100;
const STATUS_OPTIONS = ["online", "offline", "dnd"];

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

function formatLastActive(value) {
  if (!value) return "Active recently";

  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "Active recently";

  const diff = Date.now() - timestamp;
  if (diff < 0) return "Active recently";

  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Active just now";
  if (minutes < 60) return `Active ${minutes}m Ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Active ${hours}h Ago`;

  const days = Math.floor(hours / 24);
  return `Active ${days}d Ago`;
}

function getProfileHref(person) {
  return `/profile/${encodeURIComponent(person?.username || person?.id || "user")}`;
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

function SectionPill({ children, className }) {
  return (
    <span
      className={cn(
        "text-center inline-flex items-center rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-[11px] font-medium uppercase tracking-[0.26em] text-[#a8ff9a]",
        className,
      )}>
      {children}
    </span>
  );
}

function IconButton({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  className,
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "h-11 w-11 shrink-0 rounded-full border border-white/10 bg-white/[0.05] text-white/80 transition-all duration-200 hover:bg-white/[0.1] hover:text-white disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}>
      <Icon className="h-4 w-4" />
    </Button>
  );
}

function QuickNavButton({
  label,
  active,
  onClick,
  icon: Icon,
  badge,
  className,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left transition-all duration-200",
        active ?
          "border-white/15 bg-white/[0.08] text-white shadow-[0_0_0_1px_rgba(29,185,84,0.12)]"
        : "border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white",
        className,
      )}>
      <span className="flex min-w-0 items-center gap-3">
        {Icon ?
          <Icon className="h-4 w-4 shrink-0" />
        : null}
        <span className="truncate text-sm font-semibold tracking-[0.08em]">
          {label}
        </span>
      </span>
      {badge ?
        <span className="ml-3 inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-white/10 bg-black/30 px-2 text-[11px] font-semibold text-white/75">
          {badge}
        </span>
      : null}
    </button>
  );
}

function TabButton({ label, count, active, onClick }) {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="sm"
      onClick={onClick}
      className={cn(
        "h-9 rounded-full px-4 text-sm transition-all",
        active ?
          "border border-white/10 bg-white/[0.12] text-white"
        : "border border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.08] hover:text-white",
      )}>
      <span>{label}</span>
      {typeof count === "number" && count > 0 ?
        <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white/10 px-1.5 text-[10px] font-semibold text-white/80">
          {count}
        </span>
      : null}
    </Button>
  );
}

function CompactPersonRow({
  person,
  href,
  actionLabel,
  actionIcon: ActionIcon = Plus,
  actionTone = "primary",
  actionDisabled = false,
  onAction,
  trailing,
  displayName,
  usernameLabel,
}) {
  const actionClassName =
    actionTone === "primary" ?
      "border-emerald-400/20 bg-[#1DB954] text-black hover:bg-[#1ed760]"
    : "border-white/10 bg-white/[0.05] text-white/80 hover:bg-white/[0.1] hover:text-white";

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-3 transition-colors hover:border-white/15 hover:bg-white/[0.04]">
      <Link
        href={href}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-1 py-1 text-left transition hover:bg-white/[0.03]">
        <FriendAvatar
          person={person}
          className="h-11 w-11"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">
            {displayName || person?.full_name || person?.username || "User"}
          </p>
          <p className="truncate text-xs text-white/45">
            {usernameLabel || `@${person?.username || person?.id || "user"}`}
          </p>
        </div>
      </Link>

      {trailing ?
        <div className="hidden md:flex">{trailing}</div>
      : null}

      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={actionLabel}
        title={actionLabel}
        disabled={actionDisabled}
        onClick={onAction}
        className={cn(
          "h-11 w-11 shrink-0 rounded-full border transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40",
          actionClassName,
        )}>
        <ActionIcon className="h-4 w-4" />
      </Button>
    </div>
  );
}

function RequestRow({ request, sender, onAccept, onReject }) {
  const href = getProfileHref(
    sender || { id: request.sender_id, username: request.sender_id },
  );

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-3 transition-colors hover:border-white/15 hover:bg-white/[0.04]">
      <Link
        href={href}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-1 py-1 text-left transition hover:bg-white/[0.03]">
        <FriendAvatar
          person={sender}
          className="h-11 w-11"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">
            @{sender?.username || request.sender_id}
          </p>
          <p className="truncate text-xs text-white/45">
            {sender?.full_name || "Sent you a friend request"}
          </p>
        </div>
      </Link>

      <div className="flex shrink-0 items-center gap-2">
        <IconButton
          icon={Check}
          label="Accept friend request"
          onClick={() => onAccept(request)}
          className="border-emerald-400/20 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20 hover:text-emerald-200"
        />
        <IconButton
          icon={X}
          label="Reject friend request"
          onClick={() => onReject(request.id)}
          className="border-white/10 bg-white/[0.05] text-white/65 hover:bg-white/[0.1] hover:text-white"
        />
      </div>
    </div>
  );
}

function InviteRow({ invite, onOpen, onDismiss }) {
  const sender = invite.sender || {};
  const href = getProfileHref(
    sender || { id: invite.sender_id, username: invite.sender_id },
  );

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-3 transition-colors hover:border-white/15 hover:bg-white/[0.04]">
      <Link
        href={href}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-1 py-1 text-left transition hover:bg-white/[0.03]">
        <FriendAvatar
          person={sender}
          className="h-11 w-11"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">
            {sender?.username ? `@${sender.username}` : "A friend"} invited you
          </p>
          <p className="truncate text-xs text-white/45">
            Room ID: {invite.room_id}
          </p>
        </div>
      </Link>

      <div className="flex shrink-0 items-center gap-2">
        <IconButton
          icon={ExternalLink}
          label="Open room"
          onClick={onOpen}
          className="border-white/10 bg-white/[0.05] text-white/80 hover:bg-white/[0.1] hover:text-white"
        />
        <IconButton
          icon={X}
          label="Dismiss invite"
          onClick={onDismiss}
          className="border-white/10 bg-white/[0.05] text-white/65 hover:bg-white/[0.1] hover:text-white"
        />
      </div>
    </div>
  );
}

function FriendRow({
  friend,
  presenceRow,
  room,
  isInRoom,
  onInvite,
  onOpenRoom,
}) {
  const status = normalizeFriendStatus(friend.status);
  const statusMeta = FRIEND_STATUS_META[status] || FRIEND_STATUS_META.offline;
  const hasRoom = Boolean(isInRoom && room?.id);
  const lastActive =
    status === "online" ? "Online now" : (
      formatLastActive(presenceRow?.updated_at || friend.updatedAt)
    );

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-3 transition-colors hover:border-white/15 hover:bg-white/[0.04] md:flex-row md:items-center md:justify-between">
      <Link
        href={getProfileHref(friend)}
        className="flex min-w-0 items-center gap-3 rounded-2xl px-1 py-1 text-left transition hover:bg-white/[0.03] md:flex-1">
        <FriendAvatar
          person={friend}
          className="h-11 w-11"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">
            {friend.full_name || friend.username || friend.id}
          </p>
          <p className="truncate text-xs text-white/45">
            @{friend.username || friend.id}
          </p>
        </div>
      </Link>

      <div className="flex min-w-0 flex-1 items-center justify-between gap-3 md:justify-end">
        <div className="min-w-0 text-left md:text-right">
          <p className="truncate text-sm text-white/85">{lastActive}</p>
          <p className="truncate text-xs text-white/40">{statusMeta.label}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <IconButton
            icon={Plus}
            label="Invite to room"
            onClick={() => onInvite(friend)}
            disabled={!hasRoom}
            className="border-emerald-400/20 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20 hover:text-emerald-200"
          />
          <IconButton
            icon={Play}
            label="Open room"
            onClick={onOpenRoom}
            disabled={!hasRoom}
            className="border-white/10 bg-white/[0.05] text-white/80 hover:bg-white/[0.1] hover:text-white"
          />
        </div>
      </div>
    </div>
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
    presenceRows,
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
    setActiveTab,
  } = useFriends();
  const searchInputRef = useRef(null);
  const [showOfflineFriends, setShowOfflineFriends] = useState(true);

  useEffect(() => {
    if (activeTab === FRIEND_TABS.SEARCH) {
      searchInputRef.current?.focus?.();
    }
  }, [activeTab]);

  const presenceRowMap = useMemo(() => {
    return new Map(presenceRows.map((row) => [row.user_id, row]));
  }, [presenceRows]);

  const inviteLink = useMemo(() => {
    const slug = user?.user_metadata?.username || user?.id || "friends";
    if (typeof window === "undefined") {
      return `/profile/${encodeURIComponent(slug)}`;
    }
    return `${window.location.origin}/profile/${encodeURIComponent(slug)}`;
  }, [user?.id, user?.user_metadata?.username]);

  const shareMessage = useMemo(() => {
    const label =
      user?.user_metadata?.full_name ||
      user?.user_metadata?.username ||
      "my profile";
    return `Connect with ${label} on Mp Play go: ${inviteLink}`;
  }, [
    inviteLink,
    user?.user_metadata?.full_name,
    user?.user_metadata?.username,
  ]);

  const notificationCount =
    incomingRequests.length + incomingRoomInvites.length;
  const friendCount = friendEntries.length;
  const onlineCount = onlineFriends.length;
  const offlineCount = offlineFriends.length;

  const searchResultsWithState = useMemo(() => {
    return searchResults.map((person) => {
      const pairKey = makePairKey(user?.id, person.id);
      const receivedRequest = incomingRequests.some(
        (request) => request.sender_id === person.id,
      );
      const friend = friendIdSet.has(person.id);
      const pending = requestPairSet.has(pairKey);

      let label = "Add Friend";
      let disabled = !user;

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
        label,
        disabled,
        status: normalizeFriendStatus(presenceMap.get(person.id) || "offline"),
      };
    });
  }, [
    friendIdSet,
    incomingRequests,
    presenceMap,
    requestPairSet,
    searchResults,
    user,
    user?.id,
  ]);

  const statusButtons = STATUS_OPTIONS.map((status) => {
    const active = myStatus === status;
    const meta = FRIEND_STATUS_META[status];

    return (
      <Button
        key={status}
        type="button"
        variant={active ? "secondary" : "outline"}
        size="sm"
        onClick={() => updateMyStatus(status)}
        className={cn(
          "h-9 rounded-full px-4 text-xs",
          active ?
            "border-white/10 bg-white/[0.12] text-white"
          : "border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white",
        )}>
        <span className={cn("mr-2 h-2 w-2 rounded-full", meta.dotClassName)} />
        {meta.label}
      </Button>
    );
  });

  const handleCopyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast.success("Invite link copied.");
    } catch (error) {
      console.error("Failed to copy invite link:", error);
      toast.error("Could not copy invite link.");
    }
  };

  const openExternal = (url) => {
    if (typeof window === "undefined") return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const shareButtons = [
    {
      label: "Copy link",
      icon: Link2,
      onClick: handleCopyInviteLink,
    },
    {
      label: "WhatsApp",
      icon: BsWhatsapp,
      onClick: () =>
        openExternal(`https://wa.me/?text=${encodeURIComponent(shareMessage)}`),
      iconClassName: "text-[#25D366]",
    },
    {
      label: "Facebook",
      icon: Facebook,
      onClick: () =>
        openExternal(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(inviteLink)}`,
        ),
      iconClassName: "text-[#1877F2]",
    },
    {
      label: "Instagram",
      icon: Instagram,
      onClick: () => {
        void handleCopyInviteLink();
        openExternal(inviteLink);
      },
    },
  ];

  const renderLoginBanner = () => (
    <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.06] text-white/70">
          <UserRoundPlus className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">Login required</p>
          <p className="text-sm text-white/45">
            Sign in to search friends, review requests, and send room invites.
          </p>
        </div>
      </div>
    </div>
  );

  const renderSearchSection = () => (
    <div className="space-y-4">
      <div>
        <SectionPill>Add Friends</SectionPill>
        <p className="mt-2 text-sm text-white/45">
          Search by username and send a request instantly.
        </p>
      </div>

      <div className="relative">
        <UserRoundPlus className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
        <Input
          ref={searchInputRef}
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search by username"
          autoComplete="off"
          className="h-14 rounded-[28px] border-white/10 bg-white/[0.05] pl-12 pr-14 text-white placeholder:text-white/30 focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        {searchQuery.trim().length > 0 ?
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setSearchQuery("")}
            className="absolute right-2 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full text-white/45 hover:text-white">
            <X className="h-4 w-4" />
          </Button>
        : <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
        }
      </div>

      {searchLoading ?
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
              <Skeleton className="h-11 w-11 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-11 w-11 rounded-full" />
            </div>
          ))}
        </div>
      : searchQuery.trim().length >= 2 && searchResultsWithState.length > 0 ?
        <div className="space-y-2">
          {searchResultsWithState.map((person) => (
            <CompactPersonRow
              key={person.id}
              person={person}
              href={getProfileHref(person)}
              displayName={person.full_name || person.username || person.id}
              usernameLabel={`@${person.username || person.id}`}
              actionLabel={person.label}
              actionDisabled={person.disabled}
              onAction={() => sendFriendRequest(person)}
              actionTone={person.disabled ? "default" : "primary"}
              actionIcon={Plus}
            />
          ))}
        </div>
      : searchQuery.trim().length >= 2 ?
        <div className="rounded-3xl border border-white/10 bg-black/20 px-4 py-8 text-center text-sm text-white/45">
          No matching users found.
        </div>
      : <div className="rounded-3xl border border-dashed border-white/10 bg-black/20 px-4 py-8 text-center text-sm text-white/45">
          Type at least 2 characters to search by username.
        </div>
      }
    </div>
  );

  const renderRequestsSection = () => (
    <div className="space-y-4">
      <div>
        <SectionPill>Applications</SectionPill>
        <p className="mt-2 text-sm text-white/45">
          Accept or reject requests as they arrive.
        </p>
      </div>

      {loading ?
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
              <Skeleton className="h-11 w-11 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-11 w-11 rounded-full" />
              <Skeleton className="h-11 w-11 rounded-full" />
            </div>
          ))}
        </div>
      : incomingRequests.length > 0 ?
        <div className="space-y-2">
          {incomingRequests.map((request) => (
            <RequestRow
              key={request.id}
              request={request}
              sender={
                request.sender || {
                  id: request.sender_id,
                  username: request.sender_id,
                }
              }
              onAccept={acceptFriendRequest}
              onReject={rejectFriendRequest}
            />
          ))}
        </div>
      : <div className="rounded-3xl border border-dashed border-white/10 bg-black/20 px-4 py-8 text-center text-sm text-white/45">
          No incoming friend requests.
        </div>
      }
    </div>
  );

  const renderFriendsSection = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <SectionPill>Online Friends</SectionPill>
            <p className="mt-2 text-sm text-white/45">
              Friends who are online right now.
            </p>
          </div>
          <div className="text-right text-xs text-white/40">
            <p>{onlineCount} online</p>
            <p>{offlineCount} hidden below</p>
          </div>
        </div>

        {loading ?
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
                <Skeleton className="h-11 w-11 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-11 w-11 rounded-full" />
                <Skeleton className="h-11 w-11 rounded-full" />
              </div>
            ))}
          </div>
        : onlineFriends.length > 0 ?
          <div className="space-y-2">
            {onlineFriends.map((friend) => (
              <FriendRow
                key={friend.id}
                friend={friend}
                presenceRow={presenceRowMap.get(friend.id)}
                room={room}
                isInRoom={isInRoom}
                onInvite={(target) =>
                  sendRoomInvite({
                    friendId: target.id,
                    roomId: room?.id,
                  })
                }
                onOpenRoom={() => {
                  if (isInRoom && room?.id) {
                    router.push(`/room/${room.id}`);
                  }
                }}
              />
            ))}
          </div>
        : <div className="rounded-3xl border border-dashed border-white/10 bg-black/20 px-4 py-8 text-center text-sm text-white/45">
            No friends are online right now.
          </div>
        }
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <SectionPill>Offline Friends</SectionPill>
            <p className="mt-2 text-sm text-white/45">
              Friends who are offline or away.
            </p>
          </div>

          {offlineCount > 0 ?
            <button
              type="button"
              onClick={() => setShowOfflineFriends((current) => !current)}
              className="inline-flex items-center gap-2 text-sm text-white/55 transition hover:text-white">
              {showOfflineFriends ?
                <>
                  <ChevronUp className="h-4 w-4" />
                  Hide offline friends
                </>
              : <>
                  <ChevronDown className="h-4 w-4" />
                  Show {offlineCount} hidden friends
                </>
              }
            </button>
          : null}
        </div>

        {showOfflineFriends && offlineCount > 0 ?
          <div className="space-y-2">
            {offlineFriends.map((friend) => (
              <FriendRow
                key={friend.id}
                friend={friend}
                presenceRow={presenceRowMap.get(friend.id)}
                room={room}
                isInRoom={isInRoom}
                onInvite={(target) =>
                  sendRoomInvite({
                    friendId: target.id,
                    roomId: room?.id,
                  })
                }
                onOpenRoom={() => {
                  if (isInRoom && room?.id) {
                    router.push(`/room/${room.id}`);
                  }
                }}
              />
            ))}
          </div>
        : showOfflineFriends && offlineCount === 0 ?
          <div className="rounded-3xl border border-dashed border-white/10 bg-black/20 px-4 py-8 text-center text-sm text-white/45">
            No offline friends to show.
          </div>
        : null}
      </div>
    </div>
  );

  const renderPrimarySection = () => {
    if (!user) {
      return renderLoginBanner();
    }

    if (activeTab === FRIEND_TABS.REQUESTS) {
      return renderRequestsSection();
    }

    if (activeTab === FRIEND_TABS.SEARCH) {
      return renderSearchSection();
    }

    return renderFriendsSection();
  };

  return (
    <div className="flex w-full flex-col gap-4 pb-6 text-white md:pb-10 xl:flex-row">
      <aside className="order-1 w-full xl:sticky xl:top-4 xl:w-[230px] xl:self-start">
        <div className="">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <QuickNavButton
              label="MY FRIENDS"
              active={activeTab === FRIEND_TABS.FRIENDS}
              onClick={() => setActiveTab(FRIEND_TABS.FRIENDS)}
            />
            <QuickNavButton
              label="ADD"
              active={activeTab === FRIEND_TABS.SEARCH}
              onClick={() => setActiveTab(FRIEND_TABS.SEARCH)}
            />
          </div>

          <button
            type="button"
            onClick={() => setActiveTab(FRIEND_TABS.REQUESTS)}
            className={cn(
              "relative mt-3 flex w-full items-center gap-3 rounded-2xl border px-4 py-4 text-left transition-all duration-200",
              activeTab === FRIEND_TABS.REQUESTS ?
                "border-white/15 bg-white/[0.08] text-white"
              : "border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white",
            )}>
            <Users className="h-4 w-4 shrink-0" />
            <span className="text-sm font-semibold tracking-[0.08em]">
              APPLICATIONS
            </span>
            {notificationCount > 0 ?
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-lime-400 ring-4 ring-black/60" />
            : null}
          </button>

          <div className="mt-3 hidden rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-white/45 xl:block">
            <div className="flex items-center justify-between gap-3">
              <span>Notifications</span>
              <Bell className="h-4 w-4 text-white/45" />
            </div>
            <p className="mt-2">
              {notificationCount > 0 ?
                `${notificationCount} pending update${notificationCount === 1 ? "" : "s"}`
              : "Everything is caught up."}
            </p>
          </div>
        </div>
      </aside>

      <main className="order-2 min-w-0 flex-1 space-y-4">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section className="rounded-[15px] border border-white/10 p-4 md:p-5">
            {renderPrimarySection()}
          </section>

          <div className="space-y-4">
            <section className="rounded-[15px] border border-white/10  p-4 md:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <SectionPill>Top 10 Online Users</SectionPill>
                  <p className="mt-2 text-sm text-white/45">
                    Current online users across the app.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={refreshFriendsData}
                  className="rounded-full border border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </div>

              <div className="mt-4 space-y-2">
                {loading ?
                  <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
                        <Skeleton className="h-11 w-11 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-28" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                        <Skeleton className="h-11 w-11 rounded-full" />
                      </div>
                    ))}
                  </div>
                : onlineUsers.length > 0 ?
                  <div className="space-y-2">
                    {onlineUsers.map((person) => {
                      const pairKey = makePairKey(user?.id, person.id);
                      const alreadyFriend = friendIdSet.has(person.id);
                      const pending = requestPairSet.has(pairKey);
                      const canSendRequest = Boolean(
                        user && !alreadyFriend && !pending,
                      );

                      return (
                        <CompactPersonRow
                          key={person.id}
                          person={person}
                          href={getProfileHref(person)}
                          displayName={
                            person.full_name || person.username || person.id
                          }
                          usernameLabel={`@${person.username || person.id}`}
                          trailing={
                            <StatusChip
                              status={person.status}
                              className="border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                            />
                          }
                          actionLabel={
                            alreadyFriend ? "Friends"
                            : pending ?
                              "Requested"
                            : "Add Friend"
                          }
                          actionDisabled={!canSendRequest}
                          onAction={() => sendFriendRequest(person)}
                          actionTone={canSendRequest ? "primary" : "default"}
                          actionIcon={Plus}
                        />
                      );
                    })}
                  </div>
                : <div className="rounded-3xl border border-dashed border-white/10 bg-black/20 px-4 py-8 text-center text-sm text-white/45">
                    No online users right now.
                  </div>
                }
              </div>
            </section>

            <section className="rounded-[10px] border border-white/10 bg-white/[0.03] p-4 md:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <SectionPill>Room Invites</SectionPill>
                  <p className="mt-2 text-sm text-white/45">
                    Incoming invitations update in real time.
                  </p>
                </div>
                <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] px-2 text-xs font-semibold text-white/75">
                  {incomingRoomInvites.length}
                </span>
              </div>

              <div className="mt-4 space-y-2">
                {incomingRoomInvites.length > 0 ?
                  incomingRoomInvites.map((invite) => (
                    <InviteRow
                      key={invite.id}
                      invite={invite}
                      onOpen={() => router.push(`/room/${invite.room_id}`)}
                      onDismiss={() => dismissRoomInvite(invite.id)}
                    />
                  ))
                : <div className="rounded-3xl border border-dashed border-white/10 bg-black/20 px-4 py-8 text-center text-sm text-white/45">
                    No pending room invites.
                  </div>
                }
              </div>
            </section>

            <section className="rounded-[10px] border border-white/10 bg-white/[0.03] p-4 md:p-5">
              <div>
                <SectionPill>Share System</SectionPill>
                <p className="mt-2 text-sm text-white/45">
                  Copy your profile link or share it directly.
                </p>
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
                <Link2 className="h-4 w-4 shrink-0 text-white/35" />
                <Input
                  readOnly
                  value={inviteLink}
                  className="h-10 border-0 bg-transparent px-0 text-xs text-white/70 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleCopyInviteLink}
                  className="h-10 w-10 shrink-0 rounded-full border border-white/10 bg-white/[0.05] text-white/70 hover:bg-white/[0.1] hover:text-white">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-4 grid grid-cols-4 gap-3">
                {shareButtons.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={item.onClick}
                    className="flex aspect-square items-center justify-center rounded-[18px] border border-white/10 bg-white/[0.05] text-white/70 transition-all duration-200 hover:bg-white/[0.1] hover:text-white"
                    title={item.label}
                    aria-label={item.label}>
                    <item.icon className={cn("h-5 w-5", item.iconClassName)} />
                  </button>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

function FriendsShell() {
  return <FriendsContent />;
}

export default function FriendsPanel() {
  return <FriendsShell />;
}
