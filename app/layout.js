import MusicProvider from "@/components/providers/music-provider";
import SupabaseProvider from "@/components/providers/supabase-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Outfit, Syne } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import { Toaster } from "sonner";
import "./globals.css";

const syne = Syne({
	subsets: ["latin"],
	variable: "--font-syne",
	display: "swap",
});

const outfit = Outfit({
	subsets: ["latin"],
	variable: "--font-outfit",
	display: "swap",
});

export const metadata = {
	title: "MpPlaygo",
	description: "Open-Source music streamer.",
	icons: {
		icon: [
			{ url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
			{ url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
		],
		apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
	},
	manifest: "/manifest.json",
};

export default function RootLayout({ children }) {
	return (
		<html lang="en">
			<body
				className={`${syne.variable} ${outfit.variable} font-sans antialiased`}>
				<SupabaseProvider>
					<ThemeProvider
						attribute="class"
						defaultTheme="dark"
						enableSystem
						disableTransitionOnChange>
						<div className="fixed inset-0 -z-10 h-full w-full bg-background bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,0,255,0.15),rgba(255,255,255,0))] pointer-events-none" />
						<NextTopLoader
							color="hsl(var(--primary))"
							initialPosition={0.08}
							crawlSpeed={200}
							height={3}
							crawl={true}
							showSpinner={false}
							easing="ease"
							speed={200}
							shadow="0 0 10px hsl(var(--primary)),0 0 15px hsl(var(--primary))"
							template='<div class="bar" role="bar"><div class="peg"></div></div>
        <div class="spinner" role="spinner"><div class="spinner-icon"></div></div>'
							zIndex={1600}
							showAtBottom={false}
						/>
						<MusicProvider>{children}</MusicProvider>
						{/* <MobileMenu/> */}
						<Toaster
							position="top-center"
							visibleToasts={1}
						/>
					</ThemeProvider>{" "}
				</SupabaseProvider>{" "}
			</body>
		</html>
	);
}
