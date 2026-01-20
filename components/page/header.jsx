"use client";
import { AuthModal } from "@/components/auth/auth-modal";
import { PlaylistDrawer } from "@/components/playlist/playlist-drawer";
import { useSupabase } from "@/components/providers/supabase-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Home, Library } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserProfileDropdown } from "../auth/user-profile-dropdown";
import FriendSearch from "./friend-search";
import Logo from "./logo";
import Search from "./search";

export default function Header() {
	const { user, supabase } = useSupabase();
	const router = useRouter();

	return (
		<header className="fixed top-6 left-0 right-0 z-50 px-4 md:px-8 flex justify-center pointer-events-none">
            <div className="w-full max-w-[1700px] h-20 bg-[#1A1A1A]/90 backdrop-blur-xl border border-white/5 rounded-3xl shadow-2xl flex items-center justify-between px-6 pointer-events-auto">
			    
                {/* Left Section: Logo & Nav */}
                <div className="flex items-center gap-6 shrink-0">
                    <Link href="/" className="text-xl font-bold text-white tracking-tight">
                        Mp Play go
                    </Link>

                    <div className="hidden md:flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            className="text-white/70 hover:text-white hover:bg-white/10 rounded-full w-10 h-10 transition-all duration-300">
                            <Link href="/">
                                <Home className="w-5 h-5" />
                            </Link>
                        </Button>

                        <PlaylistDrawer>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-white/70 hover:text-white hover:bg-white/10 rounded-full w-10 h-10 transition-all duration-300">
                                <Library className="w-5 h-5" />
                            </Button>
                        </PlaylistDrawer>
                    </div>
                </div>

                {/* Center Section: Main Search */}
                <div className="flex-1 max-w-3xl px-8">
                    <Search />
                </div>

                {/* Right Section: Friends & Profile */}
                <div className="flex items-center gap-6 shrink-0">
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
                    :	<AuthModal>
                            <Button className="rounded-full bg-white text-black hover:bg-white/90 font-bold px-6">
                                Login
                            </Button>
                        </AuthModal>
                    }
                </div>
            </div>
		</header>
	);
}
