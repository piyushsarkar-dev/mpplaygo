"use client";
import { useSupabase } from "@/components/providers/supabase-provider";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function UserProfileDropdown() {
	const { user, profile, supabase } = useSupabase();
	const router = useRouter();

	if (!user) return null;

	const handleLogout = async () => {
		await supabase.auth.signOut();
		router.refresh();
	};

	const UserAvatar = () => (
		<div className="relative h-8 w-8 rounded-full overflow-hidden border">
			{profile?.avatar_url ?
				<img
					src={profile.avatar_url}
					alt={profile?.username || "User"}
					className="h-full w-full object-cover"
				/>
			:	<div className="h-full w-full bg-primary/10 flex items-center justify-center text-xs">
					{(profile?.username?.[0] || user.email[0]).toUpperCase()}
				</div>
			}
		</div>
	);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button className="outline-none rounded-full">
					<UserAvatar />
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				className="w-56"
				align="end"
				forceMount>
				<DropdownMenuLabel className="font-normal">
					<div className="flex flex-col space-y-1">
						<p className="text-sm font-medium leading-none">
							{profile?.username || "Loading..."}
						</p>
						<p className="text-xs leading-none text-muted-foreground">
							{user.email}
						</p>
					</div>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem asChild>
					<Link
						href={profile?.username ? `/profile/${profile.username}` : "/"}
						className="cursor-pointer">
						<User className="mr-2 h-4 w-4" />
						<span>{profile?.username ? "Profile" : "Complete profile"}</span>
					</Link>
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					onClick={handleLogout}
					className="cursor-pointer text-red-500 focus:text-red-500">
					<LogOut className="mr-2 h-4 w-4" />
					<span>Log out</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
