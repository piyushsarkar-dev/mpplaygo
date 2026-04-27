"use client";

import { useSupabase } from "@/components/providers/supabase-provider";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

export const FRIEND_TABS = {
  SEARCH: "search",
  REQUESTS: "requests",
  FRIENDS: "friends",
};

export const FRIEND_STATUS_META = {
  online: {
    label: "Online",
    chipClassName: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
    dotClassName: "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]",
  },
  offline: {
    label: "Offline",
    chipClassName: "border-white/10 bg-white/5 text-white/45",
    dotClassName: "bg-white/30",
  },
  dnd: {
    label: "Do Not Disturb",
    chipClassName: "border-rose-400/20 bg-rose-400/10 text-rose-300",
    dotClassName: "bg-rose-400 shadow-[0_0_10px_rgba(251,113,133,0.45)]",
  },
};

export function normalizeFriendStatus(value) {
  const next = String(value || "online").toLowerCase();
  if (next === "online" || next === "offline" || next === "dnd") {
    return next;
  }
  return "online";
}

const FriendsContext = createContext(undefined);

function makePairKey(leftId, rightId) {
  return [leftId, rightId].sort().join("::");
}

function sortFriendEntries(a, b) {
  const order = { online: 0, dnd: 1, offline: 2 };
  const statusDiff = order[a.status] - order[b.status];
  if (statusDiff !== 0) return statusDiff;
  return String(a.username || "").localeCompare(String(b.username || ""));
}

function uniqIds(values) {
  return [...new Set((values || []).filter(Boolean))];
}

export default function FriendsProvider({ children }) {
  const { supabase, user } = useSupabase();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(FRIEND_TABS.SEARCH);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [requests, setRequests] = useState([]);
  const [friendships, setFriendships] = useState([]);
  const [people, setPeople] = useState([]);
  const [presenceRows, setPresenceRows] = useState([]);
  const [roomInvites, setRoomInvites] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [myStatus, setMyStatus] = useState("online");
  const [loading, setLoading] = useState(false);
  const searchTimeoutRef = useRef(null);
  const searchTokenRef = useRef(0);

  const profileMap = useMemo(() => {
    return new Map(people.map((person) => [person.id, person]));
  }, [people]);

  const presenceMap = useMemo(() => {
    return new Map(
      presenceRows.map((row) => [row.user_id, normalizeFriendStatus(row.status)]),
    );
  }, [presenceRows]);

  const requestPairSet = useMemo(() => {
    return new Set(
      requests.map((request) => makePairKey(request.sender_id, request.receiver_id)),
    );
  }, [requests]);

  const requestsWithProfiles = useMemo(() => {
    return requests.map((request) => ({
      ...request,
      sender: profileMap.get(request.sender_id) || null,
      receiver: profileMap.get(request.receiver_id) || null,
    }));
  }, [profileMap, requests]);

  const incomingRequests = useMemo(() => {
    if (!user?.id) return [];
    return requestsWithProfiles.filter(
      (request) => request.receiver_id === user.id,
    );
  }, [requestsWithProfiles, user?.id]);

  const friendEntries = useMemo(() => {
    if (!user?.id) return [];
    return friendships
      .map((row) => {
        const friendId =
          row.user_low_id === user.id ? row.user_high_id : row.user_low_id;
        const person = profileMap.get(friendId) || null;
        const status = normalizeFriendStatus(
          presenceMap.get(friendId) || "offline",
        );
        return {
          id: friendId,
          friendshipId: row.id,
          username: person?.username || friendId,
          full_name: person?.full_name || "",
          avatar_url: person?.avatar_url || "",
          status,
          updatedAt: person?.created_at || row.created_at,
        };
      })
      .sort(sortFriendEntries);
  }, [friendships, presenceMap, profileMap, user?.id]);

  const friendIdSet = useMemo(() => {
    return new Set(friendEntries.map((friend) => friend.id));
  }, [friendEntries]);

  const onlineFriends = useMemo(() => {
    return friendEntries.filter((friend) => friend.status === "online");
  }, [friendEntries]);

  const offlineFriends = useMemo(() => {
    return friendEntries.filter((friend) => friend.status !== "online");
  }, [friendEntries]);

  const incomingRoomInvites = useMemo(() => {
    return roomInvites
      .map((invite) => ({
        ...invite,
        sender: profileMap.get(invite.sender_id) || null,
      }))
      .sort((a, b) =>
        String(b.created_at || "").localeCompare(String(a.created_at || "")),
      );
  }, [profileMap, roomInvites]);

  const outgoingRequestTargets = useMemo(() => {
    if (!user?.id) return new Set();
    return new Set(
      requestsWithProfiles
        .filter((request) => request.sender_id === user.id)
        .map((request) => request.receiver_id),
    );
  }, [requestsWithProfiles, user?.id]);

  const refreshFriendsData = useCallback(async () => {
    if (!user?.id) {
      setRequests([]);
      setFriendships([]);
      setPeople([]);
      setPresenceRows([]);
      setRoomInvites([]);
      setOnlineUsers([]);
      setMyStatus("online");
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [requestsRes, friendshipsRes, invitesRes, ownPresenceRes] =
        await Promise.all([
          supabase
            .from("friend_requests")
            .select("id,sender_id,receiver_id,created_at")
            .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
            .order("created_at", { ascending: false }),
          supabase
            .from("friendships")
            .select(
              "id,user_low_id,user_high_id,accepted_by,accepted_at,created_at",
            )
            .or(`user_low_id.eq.${user.id},user_high_id.eq.${user.id}`)
            .order("created_at", { ascending: false }),
          supabase
            .from("room_invites")
            .select("id,room_id,sender_id,receiver_id,status,created_at")
            .eq("receiver_id", user.id)
            .eq("status", "pending")
            .order("created_at", { ascending: false }),
          supabase
            .from("user_presence")
            .select("user_id,status,updated_at")
            .eq("user_id", user.id)
            .maybeSingle(),
        ]);

      const nextRequests = requestsRes?.data || [];
      const nextFriendships = friendshipsRes?.data || [];
      const nextInvites = invitesRes?.data || [];
      const currentStatus = normalizeFriendStatus(
        ownPresenceRes?.data?.status || "online",
      );

      if (!ownPresenceRes?.data?.user_id) {
        await supabase.from("user_presence").upsert(
          {
            user_id: user.id,
            status: currentStatus,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );
      }

      const relatedIds = uniqIds([
        ...nextRequests.map((request) =>
          request.sender_id === user.id ? request.receiver_id : request.sender_id,
        ),
        ...nextFriendships.map((row) =>
          row.user_low_id === user.id ? row.user_high_id : row.user_low_id,
        ),
        ...nextInvites.map((invite) => invite.sender_id),
      ]);

      const profilesRes = relatedIds.length
        ? await supabase
            .from("profiles")
            .select("id,username,full_name,avatar_url,created_at")
            .in("id", relatedIds)
        : { data: [] };

      const presenceRes = relatedIds.length
        ? await supabase
            .from("user_presence")
            .select("user_id,status,updated_at")
            .in("user_id", relatedIds)
        : { data: [] };

      const onlinePresenceRes = await supabase
        .from("user_presence")
        .select("user_id,status,updated_at")
        .eq("status", "online")
        .order("updated_at", { ascending: false })
        .limit(10);

      const onlinePresenceRows = (onlinePresenceRes?.data || []).filter(
        (row) => row?.user_id && row.user_id !== user.id,
      );
      const onlineUserIds = uniqIds(
        onlinePresenceRows.map((row) => row.user_id),
      );
      const onlineProfilesRes = onlineUserIds.length
        ? await supabase
            .from("profiles")
            .select("id,username,full_name,avatar_url,created_at")
            .in("id", onlineUserIds)
        : { data: [] };

      const onlineProfileMap = new Map(
        (onlineProfilesRes?.data || []).map((person) => [person.id, person]),
      );
      const onlinePresenceMap = new Map(
        onlinePresenceRows.map((row) => [row.user_id, row]),
      );

      setRequests(nextRequests);
      setFriendships(nextFriendships);
      setPeople(profilesRes?.data || []);
      setPresenceRows([
        ...(presenceRes?.data || []),
        {
          user_id: user.id,
          status: currentStatus,
          updated_at: new Date().toISOString(),
        },
      ]);
      setRoomInvites(nextInvites);
      setOnlineUsers(
        onlineUserIds
          .map((id) => {
            const person = onlineProfileMap.get(id);
            if (!person) return null;
            const row = onlinePresenceMap.get(id);
            return {
              id: person.id,
              username: person.username || person.id,
              full_name: person.full_name || "",
              avatar_url: person.avatar_url || "",
              status: normalizeFriendStatus(row?.status || "online"),
              updatedAt: row?.updated_at || person.created_at,
            };
          })
          .filter(Boolean),
      );
      setMyStatus(currentStatus);
    } catch (error) {
      console.error("Failed to load friends data:", error);
      toast.error("Friends data could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [supabase, user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setOpen(false);
      setActiveTab(FRIEND_TABS.SEARCH);
      setSearchQuery("");
      setSearchResults([]);
      setSearchLoading(false);
      setRequests([]);
      setFriendships([]);
      setPeople([]);
      setPresenceRows([]);
      setRoomInvites([]);
      setOnlineUsers([]);
      setMyStatus("online");
      return;
    }

    refreshFriendsData();

    const channel = supabase
      .channel(`friends-system:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friend_requests" },
        () => refreshFriendsData(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friendships" },
        () => refreshFriendsData(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_presence" },
        () => refreshFriendsData(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_invites" },
        () => refreshFriendsData(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshFriendsData, supabase, user?.id]);

  useEffect(() => {
    const trimmed = searchQuery.trim();

    if (activeTab !== FRIEND_TABS.SEARCH) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }

    if (trimmed.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    const token = Date.now();
    searchTokenRef.current = token;
    setSearchLoading(true);

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("id,username,full_name,avatar_url")
          .ilike("username", `%${trimmed}%`)
          .limit(12);

        if (searchTokenRef.current !== token) return;
        setSearchResults(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Friend search failed:", error);
        if (searchTokenRef.current === token) {
          setSearchResults([]);
        }
      } finally {
        if (searchTokenRef.current === token) {
          setSearchLoading(false);
        }
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
    };
  }, [activeTab, searchQuery, supabase]);

  const openFriends = useCallback((tab = FRIEND_TABS.SEARCH) => {
    setActiveTab(tab);
    setOpen(true);
  }, []);

  const closeFriends = useCallback(() => {
    setOpen(false);
    setActiveTab(FRIEND_TABS.SEARCH);
    setSearchQuery("");
    setSearchResults([]);
    setSearchLoading(false);
  }, []);

  const sendFriendRequest = useCallback(
    async (targetUser) => {
      if (!user?.id) {
        toast.error("Login required to add friends.");
        return { ok: false };
      }
      if (!targetUser?.id || targetUser.id === user.id) {
        return { ok: false };
      }

      const pairKey = makePairKey(user.id, targetUser.id);
      if (friendIdSet.has(targetUser.id)) {
        toast.message("That user is already in your friends list.");
        return { ok: false };
      }
      if (requestPairSet.has(pairKey)) {
        toast.message("A friend request is already pending.");
        return { ok: false };
      }

      const { error } = await supabase.from("friend_requests").insert({
        sender_id: user.id,
        receiver_id: targetUser.id,
      });

      if (error) {
        console.error("Failed to send friend request:", error);
        toast.error("Could not send friend request.");
        return { ok: false };
      }

      toast.success(`Friend request sent to @${targetUser.username || "user"}.`);
      refreshFriendsData();
      return { ok: true };
    },
    [friendIdSet, refreshFriendsData, requestPairSet, supabase, user?.id],
  );

  const acceptFriendRequest = useCallback(
    async (request) => {
      if (!user?.id || !request?.id) return { ok: false };

      const [lowId, highId] = [request.sender_id, request.receiver_id].sort();
      const { data: existingFriendship, error: lookupError } = await supabase
        .from("friendships")
        .select("id")
        .eq("user_low_id", lowId)
        .eq("user_high_id", highId)
        .maybeSingle();

      if (lookupError) {
        console.error("Failed to inspect existing friendship:", lookupError);
        toast.error("Could not accept friend request.");
        return { ok: false };
      }

      if (!existingFriendship?.id) {
        const { error: friendshipError } = await supabase.from("friendships").insert({
          user_low_id: lowId,
          user_high_id: highId,
          accepted_by: user.id,
          accepted_at: new Date().toISOString(),
        });

        if (friendshipError) {
          console.error("Failed to accept friend request:", friendshipError);
          toast.error("Could not accept friend request.");
          return { ok: false };
        }
      }

      const { data: deletedRequest, error: deleteError } = await supabase
        .from("friend_requests")
        .delete()
        .select("id")
        .eq("id", request.id);

      if (deleteError || !deletedRequest?.length) {
        console.error(
          "Failed to remove friend request after accept:",
          deleteError,
        );
        toast.error("Could not accept friend request.");
        return { ok: false };
      }

      setRequests((prev) => prev.filter((item) => item.id !== request.id));
      toast.success("Friend request accepted.");
      refreshFriendsData();
      return { ok: true };
    },
    [refreshFriendsData, supabase, user?.id],
  );

  const rejectFriendRequest = useCallback(
    async (requestId) => {
      if (!user?.id || !requestId) return { ok: false };

      const { data: deletedRequest, error } = await supabase
        .from("friend_requests")
        .delete()
        .select("id")
        .eq("id", requestId);

      if (error || !deletedRequest?.length) {
        console.error("Failed to reject friend request:", error);
        toast.error("Could not reject friend request.");
        return { ok: false };
      }

      setRequests((prev) => prev.filter((item) => item.id !== requestId));
      toast.message("Friend request rejected.");
      refreshFriendsData();
      return { ok: true };
    },
    [refreshFriendsData, supabase, user?.id],
  );

  const updateMyStatus = useCallback(
    async (nextStatus) => {
      if (!user?.id) {
        toast.error("Login required to update status.");
        return { ok: false };
      }

      const normalized = normalizeFriendStatus(nextStatus);
      setMyStatus(normalized);

      const { error } = await supabase.from("user_presence").upsert(
        {
          user_id: user.id,
          status: normalized,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

      if (error) {
        console.error("Failed to update presence:", error);
        toast.error("Could not update status.");
        return { ok: false };
      }

      refreshFriendsData();
      return { ok: true };
    },
    [refreshFriendsData, supabase, user?.id],
  );

  const sendRoomInvite = useCallback(
    async ({ friendId, roomId }) => {
      if (!user?.id) {
        toast.error("Login required to send invites.");
        return { ok: false };
      }
      if (!friendId || !roomId) return { ok: false };

      const { error } = await supabase.from("room_invites").insert({
        room_id: roomId,
        sender_id: user.id,
        receiver_id: friendId,
        status: "pending",
      });

      if (error) {
        console.error("Failed to send room invite:", error);
        toast.error("Could not send room invite.");
        return { ok: false };
      }

      toast.success("Room invite sent.");
      refreshFriendsData();
      return { ok: true };
    },
    [refreshFriendsData, supabase, user?.id],
  );

  const dismissRoomInvite = useCallback(
    async (inviteId) => {
      if (!user?.id || !inviteId) return { ok: false };

      const { data: deletedInvite, error } = await supabase
        .from("room_invites")
        .delete()
        .select("id")
        .eq("id", inviteId);

      if (error || !deletedInvite?.length) {
        console.error("Failed to dismiss room invite:", error);
        toast.error("Could not dismiss invite.");
        return { ok: false };
      }

      refreshFriendsData();
      return { ok: true };
    },
    [refreshFriendsData, supabase, user?.id],
  );

  return (
    <FriendsContext.Provider
      value={{
        open,
        activeTab,
        searchQuery,
        searchResults,
        searchLoading,
        requests,
        incomingRequests,
        friendships,
        people,
        presenceRows,
        roomInvites,
        incomingRoomInvites,
        onlineUsers,
        myStatus,
        loading,
        friendEntries,
        onlineFriends,
        offlineFriends,
        friendIdSet,
        requestPairSet,
        outgoingRequestTargets,
        profileMap,
        presenceMap,
        openFriends,
        closeFriends,
        setActiveTab,
        setSearchQuery,
        sendFriendRequest,
        acceptFriendRequest,
        rejectFriendRequest,
        updateMyStatus,
        sendRoomInvite,
        dismissRoomInvite,
        refreshFriendsData,
      }}>
      {children}
    </FriendsContext.Provider>
  );
}

export function useFriends() {
  const context = useContext(FriendsContext);
  if (context === undefined) {
    throw new Error("useFriends must be used inside FriendsProvider");
  }
  return context;
}