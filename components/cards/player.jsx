"use client";
import { useMusicProvider } from "@/hooks/use-context";
import { getSongsById } from "@/lib/fetch";
import { Download, Play, Repeat, Repeat1, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { IoPause } from "react-icons/io5";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import { Slider } from "../ui/slider";

export default function Player() {
	const [data, setData] = useState([]);
	const [playing, setPlaying] = useState(false);
	const audioRef = useRef(null);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const [audioURL, setAudioURL] = useState("");
	const [isLooping, setIsLooping] = useState(false);
	const { music, setMusic, current, setCurrent } = useMusicProvider();
	const userInitiatedRef = useRef(false);
	const USER_PLAY_KEY = "mpplaygo_user_initiated_play";

	useEffect(() => {
		try {
			userInitiatedRef.current =
				sessionStorage.getItem(USER_PLAY_KEY) === "true";
		} catch {
			userInitiatedRef.current = false;
		}
	}, []);

	const getSong = async () => {
		const get = await getSongsById(music);
		const data = await get.json();
		setData(data.data[0]);
		if (data?.data[0]?.downloadUrl[2]?.url) {
			setAudioURL(data?.data[0]?.downloadUrl[2]?.url);
		} else if (data?.data[0]?.downloadUrl[1]?.url) {
			setAudioURL(data?.data[0]?.downloadUrl[1]?.url);
		} else {
			setAudioURL(data?.data[0]?.downloadUrl[0]?.url);
		}
	};

	const formatTime = (time) => {
		const minutes = Math.floor(time / 60);
		const seconds = Math.floor(time % 60);
		return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
			2,
			"0"
		)}`;
	};

	const togglePlayPause = async () => {
		if (!audioRef.current) return;
		if (playing) {
			audioRef.current.pause();
			localStorage.setItem("p", "false");
			setPlaying(false);
			return;
		}
		try {
			sessionStorage.setItem(USER_PLAY_KEY, "true");
			userInitiatedRef.current = true;
		} catch {}
		localStorage.setItem("p", "true");
		try {
			await audioRef.current.play();
			setPlaying(true);
		} catch {
			setPlaying(false);
		}
	};

	const handleSeek = (e) => {
		const seekTime = e[0];
		audioRef.current.currentTime = seekTime;
		setCurrentTime(seekTime);
	};

	const loopSong = () => {
		audioRef.current.loop = !audioRef.current.loop;
		setIsLooping(!isLooping);
	};

	useEffect(() => {
		if (music) {
			getSong();
			if (current) {
				audioRef.current.currentTime = parseFloat(current + 1);
			}
			// Never autoplay on first website open. Only autoplay after a user action in this tab.
			const shouldAutoPlay =
				userInitiatedRef.current &&
				localStorage.getItem("p") === "true";
			setPlaying(Boolean(shouldAutoPlay));
			const handleTimeUpdate = () => {
				try {
					setCurrentTime(audioRef.current.currentTime);
					setDuration(audioRef.current.duration);
					setCurrent(audioRef.current.currentTime);
				} catch (e) {
					setPlaying(false);
				}
			};
			audioRef.current.addEventListener("timeupdate", handleTimeUpdate);
			return () => {
				if (audioRef.current) {
					audioRef.current.removeEventListener(
						"timeupdate",
						handleTimeUpdate
					);
				}
			};
		}
	}, [music]);

	useEffect(() => {
		if (!audioRef.current) return;
		if (!audioURL) return;
		if (playing) {
			audioRef.current.play().catch(() => setPlaying(false));
		} else {
			try {
				audioRef.current.pause();
			} catch {}
		}
	}, [audioURL, playing]);
	return (
		<main>
			<audio
				autoPlay={false}
				onPlay={() => setPlaying(true)}
				onPause={() => setPlaying(false)}
				onLoadedData={() => setDuration(audioRef.current.duration)}
				src={audioURL}
				ref={audioRef}></audio>
			{music && (
				<div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between bg-black border-t border-white/10 px-4 py-3 h-[90px]">
					{/* Left: Song Info */}
					<div className="flex items-center gap-4 w-[30%] min-w-[200px]">
						<div className="relative group">
							<img
								src={data.image ? data?.image[1]?.url : ""}
								alt={data?.name}
								className="rounded-md h-14 w-14 bg-secondary object-cover shadow-lg"
							/>
						</div>
						<div className="flex flex-col justify-center overflow-hidden">
							{!data?.name ? (
								<Skeleton className="h-4 w-32 mb-1" />
							) : (
								<Link
									href={`/${music}`}
									className="text-sm font-semibold truncate hover:underline text-white">
									{data?.name}
								</Link>
							)}
							{!data?.artists?.primary[0]?.name ? (
								<Skeleton className="h-3 w-20" />
							) : (
								<span className="text-xs text-muted-foreground truncate hover:text-white cursor-pointer transition">
									{data?.artists?.primary[0]?.name}
								</span>
							)}
						</div>
					</div>

					{/* Center: Controls & Progress */}
					<div className="flex flex-col items-center max-w-[40%] w-full gap-2">
						<div className="flex items-center gap-4">
							<Button
								size="icon"
								variant="ghost"
								className={
									!isLooping
										? "text-muted-foreground hover:text-white"
										: "text-primary hover:text-primary/80"
								}
								onClick={loopSong}>
								{!isLooping ? (
									<Repeat className="h-4 w-4" />
								) : (
									<Repeat1 className="h-4 w-4" />
								)}
							</Button>

							<Button
								size="icon"
								className="h-8 w-8 rounded-full bg-white text-black hover:scale-105 transition"
								onClick={togglePlayPause}>
								{playing ? (
									<IoPause className="h-4 w-4" />
								) : (
									<Play className="h-4 w-4 ml-0.5" />
								)}
							</Button>
						</div>

						<div className="flex items-center gap-2 w-full max-w-md">
							<span className="text-xs text-muted-foreground w-10 text-right">
								{formatTime(currentTime)}
							</span>
							<div className="flex-1">
								{/* Using Slider as Progress Bar */}
								{!duration ? (
									<Skeleton className="h-1 w-full" />
								) : (
									<Slider
										thumbClassName="h-3 w-3 bg-white border-none opacity-0 group-hover:opacity-100 transition"
										trackClassName="h-1 bg-white/20"
										rangeClassName="bg-white group-hover:bg-primary transition"
										onValueChange={handleSeek}
										value={[currentTime]}
										max={duration}
										className="w-full group cursor-pointer"
									/>
								)}
							</div>
							<span className="text-xs text-muted-foreground w-10 text-left">
								{formatTime(duration)}
							</span>
						</div>
					</div>

					{/* Right: Actions */}
					<div className="flex items-center justify-end gap-2 w-[30%] min-w-[200px]">
						{audioURL && (
							<a
								href={audioURL}
								download={`${data?.name || "song"}.m4a`}
								target="_blank"
								rel="noreferrer">
								<Button
									size="icon"
									variant="ghost"
									className="text-muted-foreground hover:text-white"
									title="Download">
									<Download className="h-5 w-5" />
								</Button>
							</a>
						)}
						<Button
							size="icon"
							variant="ghost"
							className="text-muted-foreground hover:text-white"
							onClick={() => {
								setMusic(null);
								setCurrent(0);
								localStorage.removeItem("last-played");
								localStorage.removeItem("p");
								audioRef.current.currentTime = 0;
								audioRef.current.src = null;
								setAudioURL(null);
							}}>
							<X className="h-5 w-5" />
						</Button>
					</div>
				</div>
			)}
		</main>
	);
}
