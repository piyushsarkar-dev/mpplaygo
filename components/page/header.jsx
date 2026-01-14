"use client";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ModeToggle } from "../ModeToggle";
import { Button } from "../ui/button";
import Logo from "./logo";
import Search from "./search";

export default function Header() {
	const path = usePathname();
	return (
		<header className="sticky top-0 z-40 grid gap-2 py-4 px-5 md:px-20 lg:px-32 bg-background/30 backdrop-blur-md border-b border-white/5 supports-[backdrop-filter]:bg-background/10">
			<div className="flex items-center sm:justify-between w-full gap-2">
				{path == "/" ? (
					<div className="flex items-center gap-1">
						<Logo />
						<ModeToggle />
					</div>
				) : (
					<div className="flex justify-between w-full items-center gap-1">
						<Logo />
						<Button
							className="rounded-full sm:hidden h-8 px-3"
							asChild>
							<Link
								href="/"
								className="flex items-center gap-1">
								<ChevronLeft className="w-4 h-4" />
								Back
							</Link>
						</Button>
					</div>
				)}
				<div className="hidden sm:flex items-center gap-3 w-full max-w-md">
					<Search />
					{path != "/" && (
						<Button
							className="h-10 px-3"
							asChild>
							<Link
								href="/"
								className="flex items-center gap-1">
								<ChevronLeft className="w-4 h-4" />
								Back
							</Link>
						</Button>
					)}
				</div>
			</div>
		</header>
	);
}
