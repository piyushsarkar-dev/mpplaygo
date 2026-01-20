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
		<header className="fixed top-0 left-0 right-0 z-50 h-20 px-6 md:px-10 flex items-center justify-between gap-6 backdrop-blur-md bg-black/40 border-b border-white/5 shadow-2xl">
			{/* Left Section: Logo & Nav */}
			<div className="flex items-center gap-6 shrink-0">
				<Logo />

				<div className="hidden md:flex items-center gap-2">
					<Button
						variant="ghost"
						size="icon"
						asChild
						className="text-white/70 hover:text-white hover:bg-white/10 rounded-full w-10 h-10">
						<Link href="/">
							<Home className="w-5 h-5" />
						</Link>
					</Button>

					<PlaylistDrawer>
						<Button
							variant="ghost"
							size="icon"
							className="text-white/70 hover:text-white hover:bg-white/10 rounded-full w-10 h-10">
							<Library className="w-5 h-5" />
						</Button>
					</PlaylistDrawer>
				</div>
			</div>

			{/* Center Section: Main Search */}
			<div className="flex-1 max-w-2xl">
				<Search className="w-full bg-white/5 border-white/10 focus:border-white/20 h-11 rounded-2xl" />
			</div>

			{/* Right Section: Friends & Profile */}
			<div className="flex items-center gap-4 shrink-0">
				<FriendSearch />

				{user ?
					<UserProfileDropdown>
						<Avatar className="w-10 h-10 border-2 border-white/10 hover:border-white/50 transition cursor-pointer">
							<AvatarImage
								src={user?.user_metadata?.avatar_url}
								style={{ objectFit: "cover" }}
							/>
							<AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold">
								{user?.user_metadata?.full_name?.[0] || "U"}
							</AvatarFallback>
						</Avatar>
					</UserProfileDropdown>
				:	<AuthModal>
						<Button className="rounded-full bg-white text-black hover:bg-white/90 font-bold px-6">
							Login
						</Button>
					</AuthModal>
				}
			</div>
		</header>
	);
}
