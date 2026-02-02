import { Home, Search } from "lucide-react";
import Link from "next/link";

export default function MobileMenu() {
	return (
		<div className="fixed z-50 bottom-2 left-0 right-0 flex items-center justify-center pointer-events-none">
			<div className="flex bg-primary justify-center w-fit gap-2 items-center p-2 h-fit rounded-full shadow-lg pointer-events-auto">
				<Link
					className="rounded-full h-[38px] w-[50px] flex items-center justify-center bg-background text-foreground text-sm gap-2 transition-all hover:scale-105 active:scale-95"
					href="/">
					<Home className="w-5 h-5" />
				</Link>
				<Link
					className="rounded-full h-[38px] w-[50px] flex items-center justify-center bg-background text-foreground text-sm gap-2 transition-all hover:scale-105 active:scale-95"
					href="/search/latest">
					<Search className="w-5 h-5" />
				</Link>
			</div>
		</div>
	);
}
