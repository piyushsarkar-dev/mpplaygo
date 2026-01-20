"use client";
import { Clock, SearchIcon, X } from "lucide-react";
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
	const [activeIndex, setActiveIndex] = useState(-1);
	const containerRef = useRef(null);
	const inpRef = useRef(null);

	const trimmed = useMemo(() => query.trim(), [query]);
	const filteredRecent = useMemo(() => {
		if (!trimmed) return recent;
		const t = trimmed.toLowerCase();
		return recent.filter((r) => r.toLowerCase().includes(t));
	}, [recent, trimmed]);

	const suggestionItems = useMemo(() => {
		const uniq = new Set();
		return (Array.isArray(suggestions) ? suggestions : [])
			.filter((s) => {
				const name = (s?.name ?? "").trim();
				if (!name) return false;
				const key = name.toLowerCase();
				if (uniq.has(key)) return false;
				uniq.add(key);
				return true;
			})
			.slice(0, 8);
	}, [suggestions]);

	const totalOptions = useMemo(() => {
		const hasSearchAction = Boolean(trimmed);
		return filteredRecent.length + suggestionItems.length + (hasSearchAction ? 1 : 0);
	}, [filteredRecent.length, suggestionItems.length, trimmed]);

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
			setActiveIndex(-1);
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
					setActiveIndex(-1);
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

	const removeRecent = (value) => {
		const next = recent.filter((x) => x !== value);
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
		setActiveIndex(-1);
		inpRef.current?.blur?.();
	};

	const handleSubmit = (e) => {
		e.preventDefault();
		runSearch(trimmed);
	};

	const clearQuery = () => {
		setQuery("");
		setSuggestions([]);
		setLoading(false);
		setActiveIndex(-1);
		setOpen(true);
		requestAnimationFrame(() => inpRef.current?.focus?.());
	};

	useEffect(() => {
		const onPointerDown = (e) => {
			if (!containerRef.current) return;
			if (!containerRef.current.contains(e.target)) setOpen(false);
		};
		document.addEventListener("pointerdown", onPointerDown);
		return () => document.removeEventListener("pointerdown", onPointerDown);
	}, []);

	const onKeyDown = (e) => {
		if (e.key === "Escape") {
			setOpen(false);
			setActiveIndex(-1);
			inpRef.current?.blur?.();
			return;
		}
		if (!open) return;
		if (e.key === "ArrowDown") {
			e.preventDefault();
			if (!totalOptions) return;
			setActiveIndex((i) => (i + 1) % totalOptions);
			return;
		}
		if (e.key === "ArrowUp") {
			e.preventDefault();
			if (!totalOptions) return;
			setActiveIndex((i) => (i <= 0 ? totalOptions - 1 : i - 1));
			return;
		}
		if (e.key === "Enter" && activeIndex >= 0) {
			e.preventDefault();
			// order: filteredRecent -> suggestions -> searchAction
			if (activeIndex < filteredRecent.length) {
				runSearch(filteredRecent[activeIndex]);
				return;
			}
			const afterRecent = activeIndex - filteredRecent.length;
			if (afterRecent < suggestionItems.length) {
				runSearch(suggestionItems[afterRecent]?.name);
				return;
			}
			runSearch(trimmed);
		}
	};

	return (
		<div ref={containerRef} className="relative z-10 w-full max-w-2xl mx-auto">
			<form onSubmit={handleSubmit} className="relative group flex items-center bg-white/5 border border-white/5 focus-within:bg-white/10 focus-within:border-white/20 rounded-2xl transition-all duration-300 overflow-hidden h-12">
				<Input
					ref={inpRef}
					value={query}
					onFocus={() => setOpen(true)}
					onChange={(e) => {
						setQuery(e.target.value);
						setOpen(true);
						setActiveIndex(-1);
					}}
					onKeyDown={onKeyDown}
					autoComplete="off"
					type="search"
					className="flex-1 bg-transparent border-0 text-white placeholder:text-white/40 focus-visible:ring-0 focus-visible:ring-offset-0 px-4 h-full text-base font-normal"
					name="query"
					placeholder="Search here"
				/>
                <Button
                    variant="ghost"
                    type="submit"
                    size="icon"
                    className="mr-1 text-white/40 hover:text-white transition rounded-xl hover:bg-white/10 w-10 h-10">
                    <SearchIcon className="w-5 h-5" />
                </Button>
                {trimmed.length > 0 && (
                    <Button
                        variant="ghost"
                        type="button"
                        size="icon"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={clearQuery}
                        className="mr-1 text-white/40 hover:text-white transition rounded-full hover:bg-white/10 w-8 h-8 absolute right-10">
                        <X className="w-4 h-4" />
                    </Button>
                )}
			</form>

			{open && (trimmed.length > 0 || recent.length > 0) && (
				<div className="absolute top-full left-0 right-0 mt-3 bg-[#121212] border border-white/10 rounded-2xl shadow-2xl p-2 z-[60] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
					<div className="p-2">
						{loading && (
							<div className="px-3 py-2 text-sm text-muted-foreground">Searching…</div>
						)}

						{/* Recent (YouTube-like history) */}
						{filteredRecent.length > 0 && (
							<div className="mb-1">
								{filteredRecent.map((r, idx) => {
									const optionIndex = idx;
									const active = optionIndex === activeIndex;
									return (
										<div key={r} className="flex items-center">
											<button
												type="button"
												onMouseDown={(e) => e.preventDefault()}
												onMouseEnter={() => setActiveIndex(optionIndex)}
												onClick={() => runSearch(r)}
												className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-accent ${
													active ? "bg-accent" : ""
												}`}
											>
												<Clock className="h-4 w-4 opacity-70" />
												<span className="flex-1 truncate">{r}</span>
											</button>
											<Button
												variant="ghost"
												size="icon"
												type="button"
												onMouseDown={(e) => e.preventDefault()}
												onClick={() => removeRecent(r)}
												className="h-8 w-8 shrink-0 rounded-lg"
											>
												<X className="h-4 w-4 opacity-70" />
											</Button>
										</div>
									);
								})}
							</div>
						)}

						{/* Live suggestions */}
						{suggestionItems.map((song, idx) => {
							const optionIndex = filteredRecent.length + idx;
							const active = optionIndex === activeIndex;
							return (
								<button
									type="button"
									key={song.id ?? song.name ?? idx}
									onMouseDown={(e) => e.preventDefault()}
									onMouseEnter={() => setActiveIndex(optionIndex)}
									onClick={() => runSearch(song.name)}
									className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-accent ${
										active ? "bg-accent" : ""
									}`}
								>
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
							);
						})}

						{/* Fallback search action */}
						{trimmed.length > 0 && !loading && (
							<button
								type="button"
								onMouseDown={(e) => e.preventDefault()}
								onMouseEnter={() => setActiveIndex(filteredRecent.length + suggestionItems.length)}
								onClick={() => runSearch(trimmed)}
								className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-accent ${
									activeIndex === filteredRecent.length + suggestionItems.length
										? "bg-accent"
										: ""
								}`}
							>
								<SearchIcon className="h-4 w-4 opacity-70" />
								<span className="flex-1 truncate">Search “{trimmed}”</span>
							</button>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
