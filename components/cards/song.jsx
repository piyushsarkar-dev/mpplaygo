"use client";

/* eslint-disable @next/next/no-img-element */
import { AddToPlaylist } from "@/components/playlist/add-to-playlist";
import { MusicContext } from "@/hooks/use-context";
import { cn } from "@/lib/utils";
import { PlusCircle } from "lucide-react";
import { useContext } from "react";
import { IoPlay } from "react-icons/io5";
import { Skeleton } from "../ui/skeleton";

export default function SongCard({
	title,
	image,
	artist,
	id,
	desc,
	className,
	imageClassName,
}) {
	const ids = useContext(MusicContext);
	const USER_PLAY_KEY = "mpplaygo_user_initiated_play";
	const setLastPlayed = () => {
		// Don't clear the whole localStorage (theme/auth/etc). Only update player keys.
		localStorage.setItem("last-played", id);
		localStorage.setItem("p", "true");
		try {
			sessionStorage.setItem(USER_PLAY_KEY, "true");
		} catch {}
	};
	return (
		<div
			className={cn(
				"group h-fit w-[200px] rounded-xl bg-white/[0.03] shadow-lg hover:shadow-2xl transition-all duration-300",
				className,
			)}>
			<div className="p-3">
				<div className="relative overflow-hidden rounded-xl">
					{image ?
						<div
							className="relative"
							onClick={() => {
								ids.setMusic(id);
								setLastPlayed();
							}}>
							<img
								src={
									typeof image === "string" ?
										image.replace(/^http:\/\//, "https://")
									:	image
								}
								alt={title}
								className={cn(
									"h-[182px] w-full object-cover bg-secondary/60 rounded-xl transition-transform duration-500 group-hover:scale-[1.04]",
									imageClassName,
								)}
							/>

							<div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent opacity-80" />

							{/* Center Play on hover */}
							<button
								type="button"
								aria-label="Play"
								onClick={(e) => {
									e.stopPropagation();
									ids.setMusic(id);
									setLastPlayed();
								}}
								className="absolute inset-0 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
								<span className="h-14 w-14 rounded-full bg-green-500 shadow-xl flex items-center justify-center scale-95 group-hover:scale-100 transition-transform duration-200">
									<IoPlay className="w-6 h-6 ml-0.5 fill-black text-black" />
								</span>
							</button>

							{/* + icon in the old play button position */}
							{id && (
								<AddToPlaylist
									song={{ id, title, artist, image }}>
									<button
										type="button"
										aria-label="Add to playlist"
										onPointerDown={(e) =>
											e.stopPropagation()
										}
										onClick={(e) => e.stopPropagation()}
										className="absolute z-20 bottom-2 left-2 h-9 w-9 rounded-full bg-black/55 hover:bg-black/70 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/85 hover:text-white transition">
										<PlusCircle className="h-5 w-5" />
									</button>
								</AddToPlaylist>
							)}
						</div>
					:	<Skeleton
							className={cn(
								"w-full h-[182px] rounded-xl",
								imageClassName,
							)}
						/>
					}
				</div>

				<div className="pt-3">
					{title ?
						<div
							className="cursor-pointer"
							onClick={() => {
								ids.setMusic(id);
								setLastPlayed();
							}}>
							<h1 className="text-[15px] font-heading font-semibold text-white leading-snug">
								{title.slice(0, 28)}
								{title.length > 28 && "..."}
							</h1>
						</div>
					:	<Skeleton className="w-[70%] h-4 mt-2" />}

					{artist ?
						<p className="mt-1 text-sm text-white/60">
							{artist.slice(0, 34)}
							{artist.length > 34 && "..."}
						</p>
					:	<Skeleton className="w-24 h-3 mt-2" />}

					{desc && (
						<p className="mt-1 text-xs text-white/45">
							{desc.slice(0, 40)}
							{desc.length > 40 && "..."}
						</p>
					)}
				</div>
			</div>
		</div>
	);
}
