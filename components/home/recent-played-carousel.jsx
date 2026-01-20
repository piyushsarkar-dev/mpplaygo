"use client";

import { useMusicProvider } from "@/hooks/use-context";
import { cn } from "@/lib/utils";
import { ArrowRight, ChevronLeft, ChevronRight, Play } from "lucide-react";
import { useState } from "react";

export default function RecentPlayedCarousel({
	songs,
	title = "Recent Played",
}) {
	const [activeIndex, setActiveIndex] = useState(0);
	const { setMusic } = useMusicProvider();

	if (!songs || songs.length === 0) return null;

	const handleNext = () => {
		setActiveIndex((prev) => (prev + 1) % songs.length);
	};

	const handlePrev = () => {
		setActiveIndex((prev) => (prev - 1 + songs.length) % songs.length);
	};

	// Determine the input range to display
	// We want to show a center item, and maybe 2 on left, 2 on right.
	// If items < 5, handling might be tricky with this logic, but let's assume > 5 or duplicate.
	// Ideally we repeat items if fewer than 5.

	const validSongs =
		songs.length < 5 ? [...songs, ...songs, ...songs].slice(0, 10) : songs;

	return (
		<div className="w-full py-8 flex flex-col items-center overflow-hidden">
			<div className="w-full max-w-[1700px] px-8 md:px-12 mb-6 flex items-center justify-between">
				<h2 className="text-xl md:text-2xl font-bold flex items-center gap-2 text-white">
					{title} <ArrowRight className="w-5 h-5 opacity-70" />
				</h2>
			</div>

			<div className="relative w-full max-w-6xl h-[350px] md:h-[450px] flex items-center justify-center perspective-1000">
				{/* Navigation Buttons */}
				<button
					onClick={handlePrev}
					className="absolute left-4 md:left-0 z-50 p-4 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md transition-all border border-white/5 group">
					<ChevronLeft className="w-8 h-8 text-white group-hover:scale-110 transition-transform" />
				</button>
				<button
					onClick={handleNext}
					className="absolute right-4 md:right-0 z-50 p-4 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md transition-all border border-white/5 group">
					<ChevronRight className="w-8 h-8 text-white group-hover:scale-110 transition-transform" />
				</button>

				{/* Cards */}
				{validSongs.map((song, index) => {
					// Calculate relative position based heavily on array circular logic
					// We need to find the shortest distance between index and activeIndex
					const total = validSongs.length;
					let diff = (index - activeIndex) % total;
					if (diff > total / 2) diff -= total;
					if (diff < -total / 2) diff += total;

					// Only render if within visible range (e.g. -2 to 2)
					if (Math.abs(diff) > 2) return null;

					// Determine styles based on diff
					// 0 = Center
					// -1, 1 = Side
					// -2, 2 = Far Side

					const isCenter = diff === 0;
					const brightness =
						isCenter ? 1
						: diff === 0 ? 1
						: 0.4;

					let xTranslate = "0%";
					let scale = 1;
					let zIndex = 10;
					let rotateY = "0deg";

					if (diff === 0) {
						xTranslate = "0%";
						scale = 1.25; // "boro boro"
						zIndex = 50;
						rotateY = "0deg";
					} else if (diff === 1) {
						xTranslate = "65%";
						scale = 0.9;
						zIndex = 40;
						rotateY = "-10deg"; // rotated away
					} else if (diff === -1) {
						xTranslate = "-65%";
						scale = 0.9;
						zIndex = 40;
						rotateY = "10deg";
					} else if (diff === 2) {
						xTranslate = "110%";
						scale = 0.75;
						zIndex = 30;
						rotateY = "-20deg";
					} else if (diff === -2) {
						xTranslate = "-110%";
						scale = 0.75;
						zIndex = 30;
						rotateY = "20deg";
					}

					return (
						<div
							key={`${song.id}-${index}`}
							onClick={() =>
								isCenter ? setMusic(song.id)
								: diff > 0 ? handleNext()
								: handlePrev()
							}
							className={cn(
								"absolute transition-all duration-500 ease-out cursor-pointer rounded-3xl overflow-hidden shadow-2xl bg-[#282828] border border-white/5",
								isCenter ?
									"w-[280px] h-[280px] md:w-[350px] md:h-[350px]"
								:	"w-[260px] h-[260px] md:w-[320px] md:h-[320px]",
							)}
							style={{
								transform: `translateX(${xTranslate}) scale(${scale}) perspective(1000px) rotateY(${rotateY})`,
								zIndex: zIndex,
								opacity: Math.abs(diff) > 2 ? 0 : 1,
								filter: `brightness(${isCenter ? 1 : 0.5})`,
							}}>
							{/* Image */}
							<div className="relative w-full h-full">
								<img
									src={
										(typeof song.image === "string" ?
											song.image
										: Array.isArray(song.image) ?
											song.image[song.image.length - 1]
												?.url ||
											song.image[song.image.length - 1]
												?.link
										:	"") ||
										"https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=60"
									}
									alt={song.name}
									className="w-full h-full object-cover"
									onError={(e) => {
										e.target.src =
											"https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=60";
									}}
								/>

								{/* Overlay Gradient */}
								<div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

								{/* Info (Only for center) */}
								<div
									className={cn(
										"absolute bottom-0 left-0 right-0 p-6 text-left transition-opacity duration-300",
										isCenter ? "opacity-100" : "opacity-0",
									)}>
									<h3 className="text-white font-bold text-xl md:text-2xl truncate mb-1">
										{song.name}
									</h3>
									<p className="text-white/60 text-sm md:text-base truncate">
										{song.artist || song.primaryArtists}
									</p>
								</div>

								{/* Play Button Overlay (Center Only) */}
								{isCenter && (
									<div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity group">
										<div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
											<Play className="w-8 h-8 text-black fill-black ml-1" />
										</div>
									</div>
								)}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
