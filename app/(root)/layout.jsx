import Player from "@/components/cards/player";
import MobileMenu from "@/components/mobile-menu";
import Footer from "@/components/page/footer";
import Header from "@/components/page/header";
import Search from "@/components/page/search";
import Sidebar from "@/components/page/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function RootLayout({ children }) {
	return (
		<main className="h-screen w-full flex flex-col bg-black p-2 gap-2 overflow-hidden">
			<div className="flex-1 flex gap-2 overflow-hidden min-h-0">
				{/* Sidebar - Desktop */}
				<aside className="hidden md:block h-full">
					<Sidebar />
				</aside>

				{/* Main Content */}
				<div className="flex-1 bg-gradient-to-b from-[#1f1f1f] to-[#121212] rounded-lg flex flex-col overflow-hidden relative border border-white/5">
					<div className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
						<div className="pointer-events-auto">
							<Header />
						</div>
					</div>
					<ScrollArea className="h-full w-full">
						<div
							className="px-6 sm:hidden mt-20 mb-4 animate-fade-in-up"
							style={{ animationDelay: "0.1s" }}>
							<Search />
						</div>
						<div
							className="flex-1 pt-4 md:pt-20 animate-fade-in-up pb-20"
							style={{ animationDelay: "0.2s" }}>
							{children}
							<Footer />
						</div>
					</ScrollArea>
				</div>
			</div>

			{/* Player Bar */}
			<div className="h-auto w-full z-50">
				<Player />
			</div>

			<div className="md:hidden">
				<MobileMenu />
			</div>
		</main>
	);
}
