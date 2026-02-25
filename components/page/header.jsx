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
      {/* ── Desktop Navbar ── */}
      <div className="hidden md:grid w-full h-[64px] bg-[#0a0a0a]/95 supports-[backdrop-filter]:bg-[#0a0a0a]/80 backdrop-blur-2xl border-b border-white/[0.06] grid-cols-[1fr_minmax(0,48rem)_1fr] items-center px-5 md:px-10">
        {/* Left Section: Logo */}
        <div className="flex items-center gap-6 shrink-0 justify-self-start">
          <Link
            href="/"
            className="text-lg font-bold text-white tracking-tight hover:text-[#1DB954] transition-colors duration-300">
            Mp Play go
          </Link>
        </div>

        {/* Center Section: Nav + Search */}
        <div className="min-w-0 w-full justify-self-center">
          <div className="flex w-full items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="text-zinc-400 hover:text-white hover:bg-white/[0.08] rounded-full w-10 h-10 transition-all duration-300 shrink-0">
              <Link href="/">
                <Home className="w-[18px] h-[18px]" />
              </Link>
            </Button>

            <PlaylistDrawer>
              <Button
                variant="ghost"
                size="icon"
                className="text-zinc-400 hover:text-white hover:bg-white/[0.08] rounded-full w-10 h-10 transition-all duration-300 shrink-0">
                <List className="w-[18px] h-[18px]" />
              </Button>
            </PlaylistDrawer>

            <Button
              variant="ghost"
              size="icon"
              asChild
              className="text-zinc-400 hover:text-white hover:bg-white/[0.08] rounded-full w-10 h-10 transition-all duration-300 shrink-0"
              title="Rooms">
              <Link href="/rooms">
                <Radio className="w-[18px] h-[18px]" />
              </Link>
            </Button>

            <div className="min-w-0 flex-1">
              <Search className="max-w-none mx-0 h-10" />
            </div>
          </div>
        </div>

        {/* Right Section: Friends & Profile */}
        <div className="flex items-center gap-3 shrink-0 justify-self-end">
          <FriendSearch />

          {user ?
            <UserProfileDropdown>
              <div className="w-9 h-9 rounded-full cursor-pointer ring-2 ring-transparent hover:ring-[#1DB954]/50 transition-all duration-300">
                <Avatar className="w-full h-full rounded-full">
                  <AvatarImage
                    src={user?.user_metadata?.avatar_url}
                    style={{ objectFit: "cover" }}
                  />
                  <AvatarFallback className="bg-zinc-800 text-white font-bold text-sm">
                    {user?.user_metadata?.full_name?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
              </div>
            </UserProfileDropdown>
          : <AuthModal>
              <Button className="rounded-full bg-white text-black hover:bg-white/90 font-semibold px-5 h-9 text-sm transition-all duration-300">
                Login
              </Button>
            </AuthModal>
          }
        </div>
      </div>

      {/* ── Mobile Navbar ── */}
      <div className="flex md:hidden w-full h-[52px] bg-[#0a0a0a]/95 supports-[backdrop-filter]:bg-[#0a0a0a]/80 backdrop-blur-2xl border-b border-white/[0.06] items-center px-3 py-2 gap-2">
        {/* Profile Icon */}
        <div className="shrink-0">
          {user ?
            <UserProfileDropdown>
              <div className="w-8 h-8 rounded-full cursor-pointer ring-2 ring-transparent hover:ring-[#1DB954]/50 transition-all duration-300">
                <Avatar className="w-full h-full rounded-full">
                  <AvatarImage
                    src={user?.user_metadata?.avatar_url}
                    style={{ objectFit: "cover" }}
                  />
                  <AvatarFallback className="bg-zinc-800 text-white font-bold text-[10px]">
                    {user?.user_metadata?.full_name?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
              </div>
            </UserProfileDropdown>
          : <div className="w-8 h-8 rounded-full bg-white/[0.08] flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-zinc-800/80 flex items-center justify-center text-zinc-500">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-4 h-4">
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
            <div className="bg-[#1DB954] hover:bg-[#1ed760] transition-colors duration-300 rounded-full px-3.5 py-1 text-black font-bold text-[11px] h-7 flex items-center shadow-[0_0_12px_rgba(29,185,84,0.25)]">
              All
            </div>
          : <AuthModal>
              <Button
                variant="default"
                size="sm"
                className="rounded-full bg-white text-black hover:bg-white/90 font-semibold px-4 h-7 text-[11px] transition-all duration-300">
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
              className="w-7 h-7 rounded-full bg-white/[0.08] flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.15] transition-all duration-300">
              <Radio className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Search Bar */}
        <div className="min-w-0 w-[140px] ml-auto">
          <Search className="max-w-none h-[30px] text-xs" />
        </div>
      </div>
    </header>
  );
}
