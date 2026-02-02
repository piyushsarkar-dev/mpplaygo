import Player from "@/components/cards/player";
import MobileMenu from "@/components/mobile-menu";
import Footer from "@/components/page/footer";
import Header from "@/components/page/header";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function RootLayout({ children }) {
	return (
		<main className="h-screen w-full flex flex-col bg-black p-0 gap-0 md:pt-2 md:px-2 md:pb-0 md:gap-2 overflow-hidden">
			<div className="flex-1 flex gap-2 overflow-hidden min-h-0">
				{/* Main Content */}
				<div className="flex-1 overflow-hidden relative">
					<Header />

					<ScrollArea className="h-full w-full pt-[64px] pb-24">
						<div className="px-4 md:px-6 lg:px-10 pb-6 md:pb-10 pt-0 max-w-[1920px] mx-auto animate-fade-in-up">
							{children}
						</div>
						<Footer />
					</ScrollArea>

				</div>
			</div>

			{/* Player Bar */}
			<div className="fixed bottom-6 left-6 right-6 z-50 flex justify-center pointer-events-none">
				<div className="w-full pointer-events-auto">
					<Player />
				</div>
			</div>

			<div className="md:hidden">
				<MobileMenu />
			</div>
		</main>
	);
}
