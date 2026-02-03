"use client";
import { Home, Search, ListMusic, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function MobileMenu() {
	const pathname = usePathname();

	const navItems = [
		{
			label: "Home",
			href: "/",
			icon: Home,
		},
		{
			label: "Playlist",
			href: "/playlist",
			icon: ListMusic,
		},
		{
			label: "Profile",
			href: "/profile",
			icon: User,
		},
	];

	return (
		<div className="fixed z-50 bottom-3 left-0 right-0 flex items-end justify-center pointer-events-none px-4 gap-3">
			{/* Navigation Pill */}
			<div className="flex bg-[#2a2a2a]/95 backdrop-blur-2xl border border-white/10 justify-between items-center px-2 py-2 h-[62px] rounded-[2rem] shadow-2xl pointer-events-auto w-[260px]">
				{navItems.map((item) => {
					const isActive = pathname === item.href;
					const Icon = item.icon;
					return (
						<Link
							key={item.href}
							href={item.href}
							className={cn(
								"flex flex-col items-center justify-center h-full flex-1 rounded-[1.7rem] transition-all duration-300 gap-0.5",
								isActive
									? "bg-white/10 text-white"
									: "text-neutral-400 hover:text-white hover:bg-white/5"
							)}>
							<Icon
								className={cn(
									"w-5 h-5",
									isActive ? "opacity-100" : "opacity-70"
								)}
								strokeWidth={isActive ? 2.5 : 2}
							/>
							<span
								className={cn(
									"text-[10px] font-medium leading-none mt-0.5",
									isActive ? "opacity-100" : "opacity-70"
								)}>
								{item.label}
							</span>
						</Link>
					);
				})}
			</div>

			{/* Search Button */}
			<Link
				href="/search/latest"
				className="pointer-events-auto h-[62px] w-[62px] rounded-full bg-[#3a3a3a]/95 backdrop-blur-2xl border border-white/10 flex items-center justify-center text-neutral-200 shadow-2xl transition-all active:scale-95">
				<Search className="w-6 h-6 opacity-90" />
			</Link>
		</div>
	);
}
