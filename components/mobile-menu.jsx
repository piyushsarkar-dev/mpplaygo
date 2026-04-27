"use client";
import FriendsTrigger from "@/components/friends/friends-trigger";
import { PlaylistDrawer } from "@/components/playlist/playlist-drawer";
import { useSupabase } from "@/components/providers/supabase-provider";
import { cn } from "@/lib/utils";
import { Home, ListMusic, User } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function MobileMenu() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile } = useSupabase();

  const navItems = [
    {
      label: "Home",
      href: "/",
      icon: Home,
      type: "link",
    },
    {
      label: "Playlist",
      icon: ListMusic,
      type: "drawer",
    },
    {
      label: "Profile",
      icon: User,
      type: "profile",
    },
  ];

  const handleProfileClick = () => {
    // Use profile.username (from Supabase context) for consistency with desktop
    if (profile?.username) {
      router.push(`/profile/${profile.username}`);
    } else if (user?.user_metadata?.username) {
      router.push(`/profile/${user.user_metadata.username}`);
    } else if (user?.id) {
      // Fallback to user ID if no username set
      router.push(`/profile/${user.id}`);
    } else {
      // Not logged in, show login or redirect to home
      router.push("/");
    }
  };

  return (
    <div className="fixed z-50 bottom-3 left-0 right-0 flex items-end justify-center pointer-events-none px-4 gap-3">
      {/* Navigation Pill - Glassmorphism Style */}
      <div className="flex glass-mobile-nav justify-between items-center px-2 py-2 h-[62px] rounded-[2rem] pointer-events-auto w-[260px]">
        {navItems.map((item) => {
          const isActive =
            item.href ?
              pathname === item.href
            : item.type === "profile" && pathname.includes("/profile");
          const Icon = item.icon;

          // Home - Regular Link
          if (item.type === "link") {
            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center h-full flex-1 rounded-[1.7rem] transition-all duration-400 gap-0.5",
                  isActive ?
                    "glass-mobile-nav-item-active text-white"
                  : "text-white/60 hover:text-white hover:bg-white/5",
                )}>
                <Icon
                  className={cn(
                    "w-5 h-5 transition-all duration-200",
                    isActive ?
                      "opacity-100 scale-110"
                    : "opacity-70 hover:scale-105",
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span
                  className={cn(
                    "text-[10px] font-medium leading-none mt-0.5",
                    isActive ? "opacity-100" : "opacity-70",
                  )}>
                  {item.label}
                </span>
              </Link>
            );
          }

          // Playlist - Reuse Desktop Drawer
          if (item.type === "drawer") {
            return (
              <PlaylistDrawer key={item.label}>
                <button
                  className={cn(
                    "flex flex-col items-center justify-center h-full flex-1 rounded-[1.7rem] transition-all duration-400 gap-0.5",
                    "text-white/60 hover:text-white hover:bg-white/5",
                  )}>
                  <Icon
                    className={cn(
                      "w-5 h-5 transition-all duration-200",
                      "opacity-70 hover:scale-105",
                    )}
                    strokeWidth={2}
                  />
                  <span
                    className={cn(
                      "text-[10px] font-medium leading-none mt-0.5",
                      "opacity-70",
                    )}>
                    {item.label}
                  </span>
                </button>
              </PlaylistDrawer>
            );
          }

          // Profile - Reuse Desktop Logic
          if (item.type === "profile") {
            return (
              <button
                key={item.label}
                onClick={handleProfileClick}
                className={cn(
                  "flex flex-col items-center justify-center h-full flex-1 rounded-[1.7rem] transition-all duration-400 gap-0.5",
                  isActive ?
                    "glass-mobile-nav-item-active text-white"
                  : "text-white/60 hover:text-white hover:bg-white/5",
                )}>
                <Icon
                  className={cn(
                    "w-5 h-5 transition-all duration-200",
                    isActive ?
                      "opacity-100 scale-110"
                    : "opacity-70 hover:scale-105",
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span
                  className={cn(
                    "text-[10px] font-medium leading-none mt-0.5",
                    isActive ? "opacity-100" : "opacity-70",
                  )}>
                  {item.label}
                </span>
              </button>
            );
          }

          return null;
        })}
      </div>

      {/* Friends Button - Separate Circle with Glass Effect */}
      <FriendsTrigger mobile />
    </div>
  );
}
