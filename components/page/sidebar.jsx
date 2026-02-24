"use client";
import { cn } from "@/lib/utils";
import { Home, Library, PlusSquare, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./logo";

export default function Sidebar() {
	const pathname = usePathname();

	const routes = [
		{
			icon: Home,
			label: "Home",
			href: "/",
			active: pathname === "/",
		},
		{
			icon: Search,
			label: "Search",
			href: "/search/latest", // Assuming this is the search page or a default search route
			active: pathname.includes("/search"),
		},
	];

	return (
		<div className="flex flex-col h-full bg-background text-primary-foreground gap-2 p-2 w-[280px]">
			<div className="bg-card rounded-lg p-6 flex flex-col gap-6">
				<Logo />
				<div className="flex flex-col gap-y-4">
					{routes.map((route) => (
						<Link
							key={route.label}
							href={route.href}
							className={cn(
								"flex flex-row h-auto items-center w-full gap-x-4 text-md font-medium cursor-pointer transition text-muted-foreground hover:text-white",
								route.active && "text-white",
							)}>
							<route.icon className={cn("h-6 w-6")} />
							{route.label}
						</Link>
					))}
				</div>
			</div>

			<div className="bg-card rounded-lg flex-1 overflow-y-auto p-2">
				<div className="p-4 flex items-center justify-between text-muted-foreground hover:text-white transition cursor-pointer">
					<div className="flex items-center gap-x-2">
						<Library className="h-6 w-6" />
						<span className="font-medium text-md">
							Your Library
						</span>
					</div>
					<PlusSquare className="h-5 w-5 hover:text-white" />
				</div>
				<div className="mt-4 px-2 flex flex-col gap-y-2">
					<div className="rounded-md bg-white/5 p-4 hover:bg-white/10 transition cursor-pointer group">
						<p className="font-semibold text-white">
							Create Playlist
						</p>
						<p className="text-sm text-muted-foreground mt-1">
							It&apos;s easy, we&apos;ll help you
						</p>
						<button className="mt-4 px-4 py-1.5 bg-white text-black font-bold rounded-full text-sm hover:scale-105 transition">
							Create playlist
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
