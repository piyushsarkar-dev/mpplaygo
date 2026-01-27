"use client";

/* eslint-disable @next/next/no-img-element */

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

	// Ensure we have enough items to show a full 7-card stack (-3..3)
	const validSongs =
		songs.length < 7 ? [...songs, ...songs, ...songs].slice(0, 14) : songs;

	return (
		<div className="w-full pt-2 pb-3 px-5 md:px-10 flex flex-col overflow-hidden">

			<div
				className="relative w-full h-[320px] md:h-[420px] flex items-center justify-center perspective-1000"
				role="region"
				aria-label={`${title} carousel`}
				tabIndex={0}
				onKeyDown={(e) => {
					if (e.key === "ArrowLeft") handlePrev();
					if (e.key === "ArrowRight") handleNext();
				}}>
				{/* Title overlay */}
				<h2 className="absolute top-3 left-4 md:left-6 text-sm md:text-base font-medium flex items-center gap-2 text-white bg-black/30 backdrop-blur-sm px-3 py-1 rounded">
					{title} <ArrowRight className="w-4 h-4 opacity-70 ml-1" />
				</h2>
				{/* Navigation Buttons */}
				<button
						onClick={handlePrev}
						aria-label="Previous"
						className="hidden md:block absolute left-3 md:left-3 z-50 p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md transition-all border border-white/5 group">
					<ChevronLeft className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
				</button>
				<button
						onClick={handleNext}
						aria-label="Next"
						className="hidden md:block absolute right-3 md:right-3 z-50 p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md transition-all border border-white/5 group">
					<ChevronRight className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
				</button>

				{/* Cards */}
				{validSongs.map((song, index) => {
					// Calculate relative position based heavily on array circular logic
					// We need to find the shortest distance between index and activeIndex
					const total = validSongs.length;
					let diff = (index - activeIndex) % total;
					if (diff > total / 2) diff -= total;
					if (diff < -total / 2) diff += total;

					// Only render if within visible range (-3..3) => 7 cards
					if (Math.abs(diff) > 3) return null;

					// Determine styles based on diff
					// 0 = Center
					// -1, 1 = Side
					// -2, 2 = Far Side

					const isCenter = diff === 0;
					const absDiff = Math.abs(diff);
					const brightness =
						absDiff === 0 ? 1
						: absDiff === 1 ? 0.72
						: absDiff === 2 ? 0.5
						: 0.35;

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
						xTranslate = "60%";
						scale = 0.9;
						zIndex = 40;
						rotateY = "-10deg"; // rotated away
					} else if (diff === -1) {
						xTranslate = "-60%";
						scale = 0.9;
						zIndex = 40;
						rotateY = "10deg";
					} else if (diff === 2) {
						xTranslate = "105%";
						scale = 0.75;
						zIndex = 30;
						rotateY = "-20deg";
					} else if (diff === -2) {
						xTranslate = "-105%";
						scale = 0.75;
						zIndex = 30;
						rotateY = "20deg";
					} else if (diff === 3) {
						xTranslate = "145%";
						scale = 0.62;
						zIndex = 20;
						rotateY = "-28deg";
					} else if (diff === -3) {
						xTranslate = "-145%";
						scale = 0.62;
						zIndex = 20;
						rotateY = "28deg";
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
								opacity: Math.abs(diff) > 3 ? 0 : 1,
								filter: `brightness(${brightness})`,
							}}>
							{/* Image */}
							<div className="relative w-full h-full">
								{(() => {
									const raw =
										(typeof song.image === "string" ?
											song.image
										: Array.isArray(song.image) ?
											song.image[song.image.length - 1]
												?.url ||
											song.image[song.image.length - 1]
												?.link
										:	"") ||
										"https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=60";
									const safe =
										typeof raw === "string" ?
											raw.replace(
												/^http:\/\//,
												"https://",
											)
										:	raw;
									return (
										<img
											src={safe}
											alt={song.name}
											className="w-full h-full object-cover"
											onError={(e) => {
												e.currentTarget.src =
													"https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=60";
											}}
										/>
									);
								})()}

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
