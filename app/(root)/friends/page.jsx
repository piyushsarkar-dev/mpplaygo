"use client";

import FriendsPanel from "@/components/friends/friends-panel";
import {
  FRIEND_TABS,
  useFriends,
} from "@/components/providers/friends-provider";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function FriendsPage() {
  const searchParams = useSearchParams();
  const { setActiveTab } = useFriends();

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === FRIEND_TABS.FRIENDS) {
      setActiveTab(FRIEND_TABS.FRIENDS);
    }
    if (tab === FRIEND_TABS.REQUESTS) {
      setActiveTab(FRIEND_TABS.REQUESTS);
    }
    if (tab === FRIEND_TABS.SEARCH) {
      setActiveTab(FRIEND_TABS.SEARCH);
    }
  }, [searchParams, setActiveTab]);

  return <FriendsPanel />;
}
