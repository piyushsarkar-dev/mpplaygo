"use client";
import { AuthModal } from "@/components/auth/auth-modal";
import { PlaylistDrawer } from "@/components/playlist/playlist-drawer";
import { useSupabase } from "@/components/providers/supabase-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Home, List, Radio } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserProfileDropdown } from "../auth/user-profile-dropdown";
import FriendSearch from "./friend-search";
import Search from "./search";

export default function Header() {
  const { user, supabase } = useSupabase();
  const router = useRouter();

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="hidden md:grid w-full h-[72px] bg-black/80 supports-[backdrop-filter]:bg-black/40 backdrop-blur-xl grid-cols-[1fr_minmax(0,48rem)_1fr] items-center px-5 md:px-10">
        {/* Left Section: Logo & Nav */}
        <div className="flex items-center gap-6 shrink-0 justify-self-start">
          <Link
            href="/"
            className="text-xl font-bold text-white tracking-tight">
            Mp Play go
          </Link>
        </div>

        {/* Center Section: Main Search */}
        <div className="min-w-0 w-full justify-self-center">
          <div className="flex w-full items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="text-white/70 hover:text-white hover:bg-white/10 rounded-full w-10 h-10 transition-all duration-300 shrink-0">
              <Link href="/">
                <Home className="w-5 h-5" />
              </Link>
            </Button>

            <PlaylistDrawer>
              <Button
                variant="ghost"
                size="icon"
                className="text-white/70 hover:text-white hover:bg-white/10 rounded-full w-10 h-10 transition-all duration-300 shrink-0">
                <List className="w-5 h-5" />
              </Button>
            </PlaylistDrawer>

            <Button
              variant="ghost"
              size="icon"
              asChild
              className="text-white/70 hover:text-white hover:bg-white/10 rounded-full w-10 h-10 transition-all duration-300 shrink-0"
              title="Rooms">
              <Link href="/rooms">
                <Radio className="w-5 h-5" />
              </Link>
            </Button>

            <div className="min-w-0 flex-1">
              <Search className="max-w-none mx-0 h-11" />
            </div>
          </div>
        </div>

        {/* Right Section: Friends & Profile */}
        <div className="flex items-center gap-4 shrink-0 justify-self-end">
          <FriendSearch />

          {user ?
            <UserProfileDropdown>
              <div className="w-10 h-10 rounded-full cursor-pointer hover:opacity-80 transition-opacity">
                <Avatar className="w-full h-full rounded-full">
                  <AvatarImage
                    src={user?.user_metadata?.avatar_url}
                    style={{ objectFit: "cover" }}
                  />
                  <AvatarFallback className="bg-neutral-800 text-white font-bold">
                    {user?.user_metadata?.full_name?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
              </div>
            </UserProfileDropdown>
          : <AuthModal>
              <Button className="rounded-full bg-white text-black hover:bg-white/90 font-bold px-6 h-10">
                Login
              </Button>
            </AuthModal>
          }
        </div>
      </div>

      {/* Mobile Header */}
      <div className="flex md:hidden w-full h-[52px] bg-black/80 supports-[backdrop-filter]:bg-black/40 backdrop-blur-xl items-center px-3 py-2 gap-2.5">
        {/* Profile Icon */}
        <div className="shrink-0">
          {user ?
            <UserProfileDropdown>
              <div className="w-9 h-9 rounded-full cursor-pointer hover:opacity-80 transition-opacity">
                <Avatar className="w-full h-full rounded-full">
                  <AvatarImage
                    src={user?.user_metadata?.avatar_url}
                    style={{ objectFit: "cover" }}
                  />
                  <AvatarFallback className="bg-neutral-800 text-white font-bold text-xs">
                    {user?.user_metadata?.full_name?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
              </div>
            </UserProfileDropdown>
          : <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-neutral-800/50 flex items-center justify-center text-white/50">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-5 h-5">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle
                    cx="12"
                    cy="7"
                    r="4"
                  />
                </svg>
              </div>
            </div>
          }
        </div>

        {/* Login / All Pill */}
        <div className="shrink-0">
          {user ?
            <div className="bg-[#1DB954] hover:bg-[#1ed760] transition-colors rounded-full px-4 py-1.5 text-black font-bold text-xs h-8 flex items-center">
              All
            </div>
          : <AuthModal>
              <Button
                variant="default"
                size="sm"
                className="rounded-full bg-[#1DB954] text-black hover:bg-[#1ed760] font-bold px-4 h-8 text-xs">
                Login
              </Button>
            </AuthModal>
          }
        </div>

        {/* Rooms (mobile) */}
        {user && (
          <div className="shrink-0">
            <Link
              href="/rooms"
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-all">
              <Radio className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Search Bar */}
        <div className="min-w-0 w-[140px] ml-auto">
          <Search className="max-w-none h-[32px] text-xs" />
        </div>
      </div>
    </header>
  );
}
