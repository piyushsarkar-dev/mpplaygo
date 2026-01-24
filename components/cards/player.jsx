"use client";
import { AddToPlaylist } from "@/components/playlist/add-to-playlist";
import { useMusicProvider } from "@/hooks/use-context";
import { getSongsById } from "@/lib/fetch";
import {
	Download,
	Heart,
	Play,
	SkipBack,
	SkipForward,
	Volume2,
	VolumeX,
	X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { IoPause } from "react-icons/io5";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import { Slider } from "../ui/slider";

export default function Player() {
	const [data, setData] = useState({});
	const [playing, setPlaying] = useState(false);
	const audioRef = useRef(null);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const [audioURL, setAudioURL] = useState("");
	const [isLooping, setIsLooping] = useState(false);
	const [volume, setVolume] = useState(100);
	const [muted, setMuted] = useState(false);
	const lastNonZeroVolumeRef = useRef(50);
	const { music, setMusic, current, setCurrent } = useMusicProvider();
	const userInitiatedRef = useRef(false);
	const USER_PLAY_KEY = "mpplaygo_user_initiated_play";
	const VOLUME_KEY = "mpplaygo_volume";
	const MUTED_KEY = "mpplaygo_muted";

	useEffect(() => {
		try {
			userInitiatedRef.current =
				sessionStorage.getItem(USER_PLAY_KEY) === "true";
		} catch {
			userInitiatedRef.current = false;
		}
	}, []);

	useEffect(() => {
		// Restore volume/mute from localStorage.
		try {
			const v = localStorage.getItem(VOLUME_KEY);
			const m = localStorage.getItem(MUTED_KEY);
			const parsed = v ? Number(v) : 100;
			if (!Number.isNaN(parsed)) {
				setVolume(Math.min(100, Math.max(0, parsed)));
				if (parsed > 0) lastNonZeroVolumeRef.current = parsed;
			}
			setMuted(m === "true");
		} catch {}
	}, []);

	useEffect(() => {
		// Apply volume/mute to the audio element.
		if (!audioRef.current) return;
		try {
			audioRef.current.volume = Math.min(1, Math.max(0, volume / 100));
			audioRef.current.muted = Boolean(muted);
		} catch {}
		try {
			localStorage.setItem(VOLUME_KEY, String(volume));
			localStorage.setItem(MUTED_KEY, muted ? "true" : "false");
		} catch {}
		if (volume > 0) lastNonZeroVolumeRef.current = volume;
	}, [volume, muted]);

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
			"0",
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

	const effectiveMuted = muted || volume === 0;
	const toggleMute = () => {
		if (effectiveMuted) {
			setMuted(false);
			if (volume === 0) setVolume(lastNonZeroVolumeRef.current || 50);
			return;
		}
		setMuted(true);
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
						handleTimeUpdate,
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

	// UI Redesign: Floating Glassmorphism Player
	if (!music) return <audio ref={audioRef} />;

	return (
		<main className="w-full">
			<audio
				autoPlay={false}
				onPlay={() => setPlaying(true)}
				onPause={() => setPlaying(false)}
				onLoadedData={() => setDuration(audioRef.current.duration)}
				src={audioURL}
				ref={audioRef}></audio>

			<div className="w-full max-w-6xl mx-auto h-24 bg-black/60 backdrop-blur-xl border border-white/10 rounded-[2rem] flex items-center px-4 md:px-8 shadow-2xl relative overflow-hidden group">
				{/* Background Blur Mesh (Optional aesthetic) */}
				<div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none" />

				{/* Left: Song Info */}
				<div className="flex items-center gap-4 w-[25%] min-w-[200px]">
					<div className="h-16 w-16 rounded-xl overflow-hidden relative shrink-0 shadow-lg">
						<img
							src={data.image ? data?.image[1]?.url : ""}
							alt={data?.name}
							className="h-full w-full object-cover animate-spin-slow"
							style={{
								animationPlayState:
									playing ? "running" : "paused",
								animationDuration: "10s",
							}}
						/>
					</div>
					<div className="flex flex-col justify-center overflow-hidden">
						{!data?.name ?
							<Skeleton className="h-4 w-32 mb-1" />
						:	<Link
								href={`/${music}`}
								className="text-white font-bold truncate text-base hover:underline shadow-black drop-shadow-md">
								{data?.name}
							</Link>
						}
						{!data?.artists?.primary[0]?.name ?
							<Skeleton className="h-3 w-20" />
						:	<span className="text-white/60 text-sm truncate hover:text-white cursor-pointer transition">
								{data?.artists?.primary[0]?.name}
							</span>
						}
					</div>
				</div>

				{/* Center: Controls & Progress */}
				<div className="flex-1 flex flex-col items-center justify-center gap-2 max-w-[50%] mx-auto">
					<div className="flex items-center gap-6">
						<Button
							variant="ghost"
							size="icon"
							className="text-white/70 hover:text-white"
							onClick={() => {
								if (audioRef.current)
									audioRef.current.currentTime -= 10;
							}}>
							<SkipBack className="w-6 h-6 fill-white/20" />
						</Button>

						<button
							className="h-12 w-12 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition active:scale-95 shadow-lg shadow-white/20"
							onClick={togglePlayPause}>
							{playing ?
								<IoPause className="h-5 w-5" />
							:	<Play className="h-5 w-5 ml-1" />}
						</button>

						<Button
							variant="ghost"
							size="icon"
							className="text-white/70 hover:text-white"
							onClick={() => {
								if (audioRef.current)
									audioRef.current.currentTime += 10;
							}}>
							<SkipForward className="w-6 h-6 fill-white/20" />
						</Button>
					</div>

					<div className="flex items-center gap-3 w-full text-xs font-medium font-mono text-zinc-400">
						<span className="w-10 text-right">
							{formatTime(currentTime)}
						</span>
						<div className="flex-1">
							{/* Using Slider as Progress Bar */}
							{!duration ?
								<Skeleton className="h-1 w-full" />
							:	<Slider
									thumbClassName="h-3 w-3 bg-white border-none opacity-0 group-hover:opacity-100 transition shadow-lg"
									trackClassName="h-1 bg-white/20"
									rangeClassName="bg-white group-hover:bg-primary transition shadow-[0_0_10px_rgba(255,255,255,0.5)]"
									onValueChange={handleSeek}
									value={[currentTime]}
									max={duration}
									className="w-full group cursor-pointer"
								/>
							}
						</div>
						<span className="w-10 text-left">
							{formatTime(duration)}
						</span>
					</div>
				</div>

				{/* Right: Actions */}
				<div className="flex items-center justify-end gap-2 w-[25%] min-w-[150px]">
					<AddToPlaylist
						song={{
							id: data.id,
							title: data.name,
							artist:
								data.artist || data.artists?.primary?.[0]?.name,
							image: data.image,
						}}>
						<Button
							variant="ghost"
							size="icon"
							className="text-white/60 hover:text-red-500 hover:bg-white/10 rounded-full transition-colors">
							<Heart className="w-5 h-5" />
						</Button>
					</AddToPlaylist>

					{audioURL && (
						<a
							href={audioURL}
							download={`${data?.name || "song"}.m4a`}
							target="_blank"
							rel="noreferrer">
							<Button
								size="icon"
								variant="ghost"
								className="text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors"
								title="Download">
								<Download className="w-5 h-5" />
							</Button>
						</a>
					)}

					{/* Volume */}
					<div className="hidden md:flex items-center gap-2 ml-1">
						<Button
							size="icon"
							variant="ghost"
							className="text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors"
							onClick={toggleMute}
							title={effectiveMuted ? "Unmute" : "Mute"}>
							{effectiveMuted ? (
								<VolumeX className="w-5 h-5" />
							) : (
								<Volume2 className="w-5 h-5" />
							)}
						</Button>
						<div className="w-24">
							<Slider
								value={[volume]}
								max={100}
								step={1}
								onValueChange={(v) => {
									const next = v?.[0] ?? 100;
									setVolume(next);
									if (muted && next > 0) setMuted(false);
								}}
								thumbClassName="h-3 w-3 bg-white border-none"
								trackClassName="h-1 bg-white/20"
								rangeClassName="bg-white"
								className="w-full"
							/>
						</div>
					</div>

					<Button
						size="icon"
						variant="ghost"
						className="text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors"
						onClick={() => {
							setMusic(null);
							setCurrent(0);
							localStorage.removeItem("last-played");
							localStorage.removeItem("p");
							audioRef.current.currentTime = 0;
							audioRef.current.src = null;
							setAudioURL(null);
						}}>
						<X className="w-5 h-5" />
					</Button>
				</div>
			</div>
		</main>
	);
}
