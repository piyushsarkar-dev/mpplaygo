"use client";
import { Clock, SearchIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { getSongsByQuery } from "@/lib/fetch";

export default function Search() {
	const router = useRouter();
	const [query, setQuery] = useState("");
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [suggestions, setSuggestions] = useState([]);
	const [recent, setRecent] = useState([]);
	const containerRef = useRef(null);
	const inpRef = useRef(null);

	const trimmed = useMemo(() => query.trim(), [query]);

	useEffect(() => {
		// recent searches from localStorage
		try {
			const raw = localStorage.getItem("recentSearches");
			const parsed = raw ? JSON.parse(raw) : [];
			if (Array.isArray(parsed)) setRecent(parsed.filter((v) => typeof v === "string"));
		} catch {
			// ignore
		}
	}, []);

	useEffect(() => {
		if (!open) return;
		if (trimmed.length < 1) {
			setSuggestions([]);
			setLoading(false);
			return;
		}

		let cancelled = false;
		const handle = setTimeout(async () => {
			setLoading(true);
			try {
				const res = await getSongsByQuery(trimmed);
				const json = await res.json();
				const results = json?.data?.results;
				if (!cancelled) {
					setSuggestions(Array.isArray(results) ? results.slice(0, 8) : []);
				}
			} catch {
				if (!cancelled) setSuggestions([]);
			} finally {
				if (!cancelled) setLoading(false);
			}
		}, 250);

		return () => {
			cancelled = true;
			clearTimeout(handle);
		};
	}, [trimmed, open]);

	const persistRecent = (value) => {
		const v = value.trim();
		if (!v) return;
		const next = [v, ...recent.filter((x) => x !== v)].slice(0, 8);
		setRecent(next);
		try {
			localStorage.setItem("recentSearches", JSON.stringify(next));
		} catch {
			// ignore
		}
	};

	const runSearch = (value) => {
		const q = (value ?? "").trim();
		if (!q) {
			router.push("/");
			return;
		}
		persistRecent(q);
		router.push(`/search/${encodeURIComponent(q)}`);
		setOpen(false);
		inpRef.current?.blur?.();
	};

	const handleSubmit = (e) => {
		e.preventDefault();
		runSearch(trimmed);
	};

	useEffect(() => {
		const onPointerDown = (e) => {
			if (!containerRef.current) return;
			if (!containerRef.current.contains(e.target)) setOpen(false);
		};
		document.addEventListener("pointerdown", onPointerDown);
		return () => document.removeEventListener("pointerdown", onPointerDown);
	}, []);

	return (
		<div ref={containerRef} className="relative z-10 w-full">
			<form onSubmit={handleSubmit} className="flex items-center relative w-full">
				<Button
					variant="ghost"
					type="submit"
					size="icon"
					className="absolute right-0 rounded-xl rounded-l-none bg-none">
					<SearchIcon className="w-4 h-4" />
				</Button>
				<Input
					ref={inpRef}
					value={query}
					onFocus={() => setOpen(true)}
					onChange={(e) => {
						setQuery(e.target.value);
						setOpen(true);
					}}
					autoComplete="off"
					type="search"
					className="rounded-lg bg-secondary/50"
					name="query"
					placeholder="Seacrh The Music"
				/>
			</form>

			{open && (trimmed.length > 0 || recent.length > 0) && (
				<div className="absolute left-0 right-0 mt-2 overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow">
					{trimmed.length === 0 ? (
						<div className="p-2">
							{recent.map((r) => (
								<button
									type="button"
									key={r}
									onMouseDown={(e) => e.preventDefault()}
									onClick={() => runSearch(r)}
									className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-accent">
									<Clock className="h-4 w-4 opacity-70" />
									<span className="flex-1 truncate">{r}</span>
								</button>
							))}
						</div>
					) : (
						<div className="p-2">
							{loading && (
								<div className="px-3 py-2 text-sm text-muted-foreground">Searching…</div>
							)}
							{!loading && suggestions.length === 0 && (
								<button
									type="button"
									onMouseDown={(e) => e.preventDefault()}
									onClick={() => runSearch(trimmed)}
									className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-accent">
									<SearchIcon className="h-4 w-4 opacity-70" />
									<span className="flex-1 truncate">Search “{trimmed}”</span>
								</button>
							)}
							{suggestions.map((song) => (
								<button
									type="button"
									key={song.id}
									onMouseDown={(e) => e.preventDefault()}
									onClick={() => runSearch(song.name)}
									className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-accent">
									<SearchIcon className="h-4 w-4 opacity-70" />
									<span className="grid flex-1 min-w-0">
										<span className="truncate">{song.name}</span>
										<span className="truncate text-xs text-muted-foreground">
											{song?.artists?.primary?.[0]?.name || "unknown"}
										</span>
									</span>
									{song?.image?.[1]?.url && (
										<img
											alt={song.name}
											src={song.image[1].url}
											className="h-9 w-9 rounded-md bg-secondary/50 object-cover"
										/>
									)}
								</button>
							))}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
