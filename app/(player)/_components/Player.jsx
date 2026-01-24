"use client";
import Next from "@/components/cards/next";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { useMusicProvider, useNextMusicProvider } from "@/hooks/use-context";
import { getSongsById } from "@/lib/fetch";
import { Download, Play, Repeat, Repeat1, Share2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { IoPause } from "react-icons/io5";
import { toast } from "sonner";

export default function Player({ id }) {
	const [data, setData] = useState([]);
	const [playing, setPlaying] = useState(false);
	const audioRef = useRef(null);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const [isDownloading, setIsDownloading] = useState(false);
	const [isLooping, setIsLooping] = useState(false);
	const [audioURL, setAudioURL] = useState("");
	const params = useSearchParams();
	const next = useNextMusicProvider();
	const { current, setCurrent, setDownloadProgress, downloadProgress } =
		useMusicProvider();
	const USER_PLAY_KEY = "mpplaygo_user_initiated_play";
	const QUEUE_KEY = "mpplaygo_queue";
	const userInitiatedRef = useRef(false);

	useEffect(() => {
		try {
			userInitiatedRef.current =
				sessionStorage.getItem(USER_PLAY_KEY) === "true";
		} catch {
			userInitiatedRef.current = false;
		}
	}, []);

	useEffect(() => {
		// If an artist queue is active, set the Next card from the queue.
		try {
			const raw = sessionStorage.getItem(QUEUE_KEY);
			if (!raw) return;
			const queue = JSON.parse(raw);
			if (queue?.type !== "artist" || !Array.isArray(queue?.items)) return;
			const idx = queue.items.findIndex(
				(x) => String(x?.id) === String(id)
			);
			const nextItem = idx >= 0 ? queue.items[idx + 1] : null;
			if (nextItem?.id) {
				next.setNextData({
					id: nextItem.id,
					name: nextItem.name,
					artist: nextItem.artist || "unknown",
					image: nextItem.image,
				});
			} else {
				next.setNextData(null);
			}
		} catch {
			// ignore queue parsing issues
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [id]);

	const getSong = async () => {
		const get = await getSongsById(id);
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

	const downloadSong = async () => {
		if (isDownloading) {
			setDownloadProgress(0);
			setIsDownloading(false);
			return;
		}
		setIsDownloading(true);
		setDownloadProgress(0);

		const response = await fetch(audioURL);
		if (!response.ok) throw new Error("Failed to fetch");

		const contentLength = response.headers.get("Content-Length");
		if (!contentLength) {
			console.warn(
				"No Content-Length header, can't show progress accurately."
			);
		}

		const total = contentLength ? parseInt(contentLength, 10) : 0;
		let loaded = 0;

		const reader = response.body.getReader();
		const chunks = [];

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			if (value) {
				chunks.push(value);
				loaded += value.length;

				if (total) {
					const progress = Math.round((loaded / total) * 100);
					setDownloadProgress(progress);
				}
			}
		}

		// Combine chunks into a blob
		const blob = new Blob(chunks);
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${data.name}.mp3`;
		a.click();
		URL.revokeObjectURL(url);

		toast.success("Downloaded!");
		setIsDownloading(false);
		setDownloadProgress(0);
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

	const handleShare = () => {
		try {
			navigator.share({
				url: `https://${window.location.host}/${data.id}`,
			});
		} catch (e) {
			toast.error("Something went wrong!");
		}
	};

	useEffect(() => {
		getSong();
		localStorage.setItem("last-played", id);
		// No autoplay on page open unless user initiated play in this tab.
		const shouldAutoPlay =
			userInitiatedRef.current && localStorage.getItem("p") === "true";
		setPlaying(Boolean(shouldAutoPlay));
		if (current) {
			audioRef.current.currentTime = parseFloat(current + 1);
		}
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
	}, []);

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
	useEffect(() => {
		if (isLooping || duration === 0) return;
		if (currentTime !== duration) return;

		// Prefer artist queue navigation (no mixing).
		try {
			const raw = sessionStorage.getItem(QUEUE_KEY);
			if (raw) {
				const queue = JSON.parse(raw);
				if (queue?.type === "artist" && Array.isArray(queue?.items)) {
					const idx = queue.items.findIndex(
						(x) => String(x?.id) === String(id)
					);
					const nextItem = idx >= 0 ? queue.items[idx + 1] : null;
					if (nextItem?.id) {
						try {
							sessionStorage.setItem(USER_PLAY_KEY, "true");
							localStorage.setItem("p", "true");
						} catch {}
						window.location.href = `https://${window.location.host}/${nextItem.id}`;
						return;
					}
					// End of queue
					try {
						sessionStorage.removeItem(QUEUE_KEY);
					} catch {}
					return;
				}
			}
		} catch {}

		// Fallback to recommendation-based next.
		if (next?.nextData?.id) {
			window.location.href = `https://${window.location.host}/${next.nextData.id}`;
		}
	}, [currentTime, duration, isLooping, id, next?.nextData?.id]);
	return (
		<div className="mb-3 mt-10">
			<audio
				onPlay={() => setPlaying(true)}
				onPause={() => setPlaying(false)}
				onLoadedData={() => setDuration(audioRef.current.duration)}
				autoPlay={false}
				src={audioURL}
				ref={audioRef}></audio>
			<div className="grid gap-6 w-full">
				<div className="sm:flex px-6 md:px-20 lg:px-32 grid gap-5 w-full">
					<div>
						{data.length <= 0 ? (
							<Skeleton className="md:w-[130px] aspect-square rounded-2xl md:h-[150px]" />
						) : (
							<div className="relative">
								<img
									src={data.image[2].url}
									className="sm:h-[150px] h-full aspect-square bg-secondary/50 rounded-2xl sm:w-[200px] w-full sm:mx-0 mx-auto object-cover"
								/>
								<img
									src={data.image[2].url}
									className="hidden dark:block absolute top-0 left-0 w-[110%] h-[110%] blur-3xl -z-10 opacity-50"
								/>
							</div>
						)}
					</div>
					{data.length <= 0 ? (
						<div className="flex flex-col justify-between w-full">
							<div>
								<Skeleton className="h-4 w-36 mb-2" />
								<Skeleton className="h-3 w-16 mb-4" />
							</div>
							<div>
								<Skeleton className="h-4 w-full rounded-full mb-2" />
								<div className="w-full flex items-center justify-between">
									<Skeleton className="h-[9px] w-6" />
									<Skeleton className="h-[9px] w-6" />
								</div>
								<div className="flex items-center gap-3 mt-3">
									<Skeleton className="h-10 w-10" />
									<Skeleton className="h-10 w-10" />
									<Skeleton className="h-10 w-10" />
								</div>
							</div>
						</div>
					) : (
						<div className="flex flex-col justify-between w-full">
							<div className="sm:mt-0 mt-3">
								<h1 className="text-xl font-bold md:max-w-lg">
									{data.name}
								</h1>
								<p className="text-sm text-muted-foreground">
									by{" "}
									<Link
										href={
											"/search/" +
											`${encodeURI(
												data.artists.primary[0].name
													.toLowerCase()
													.split(" ")
													.join("+")
											)}`
										}
										className="text-foreground">
										{data.artists.primary[0]?.name ||
											"unknown"}
									</Link>
								</p>
							</div>
							<div className="grid gap-2 w-full mt-5 sm:mt-0">
								<Slider
									onValueChange={handleSeek}
									value={[currentTime]}
									max={duration}
									className="w-full"
								/>
								<div className="w-full flex items-center justify-between">
									<span className="text-sm">
										{formatTime(currentTime)}
									</span>
									<span className="text-sm">
										{formatTime(duration)}
									</span>
								</div>
								<div className="flex items-center mt-1 justify-between w-full sm:mt-2">
									<Button
										variant={
											playing ? "default" : "secondary"
										}
										className="gap-1 rounded-full"
										onClick={togglePlayPause}>
										{playing ? (
											<IoPause className="h-4 w-4" />
										) : (
											<Play className="h-4 w-4" />
										)}
										{playing ? "Pause" : "Play"}
									</Button>
									<div className="flex items-center gap-2 sm:gap-3 sm:mt-0">
										<Button
											size="icon"
											variant="ghost"
											onClick={loopSong}>
											{!isLooping ? (
												<Repeat className="h-4 w-4" />
											) : (
												<Repeat1 className="h-4 w-4" />
											)}
										</Button>
										<Button
											size="icon"
											variant={
												!isDownloading
													? "ghost"
													: "secondary"
											}
											onClick={downloadSong}>
											{isDownloading ? (
												downloadProgress
											) : (
												<Download className="h-4 w-4" />
											)}
										</Button>
										<Button
											size="icon"
											variant="ghost"
											onClick={handleShare}>
											<Share2 className="h-4 w-4" />
										</Button>
									</div>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
			{next.nextData && (
				<div className="mt-10 -mb-3 px-6 md:px-20 lg:px-32">
					<Next
						name={next.nextData.name}
						artist={next.nextData.artist}
						image={next.nextData.image}
						id={next.nextData.id}
					/>
				</div>
			)}
		</div>
	);
}
