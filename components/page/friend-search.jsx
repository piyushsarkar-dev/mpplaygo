"use client";

import { useSupabase } from "@/components/providers/supabase-provider";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export default function FriendSearch({ className }) {
	const { supabase } = useSupabase();
	const [query, setQuery] = useState("");
	const [results, setResults] = useState([]);
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const wrapperRef = useRef(null);
	const lastRequestRef = useRef(0);

	useEffect(() => {
		const onDocClick = (e) => {
			if (!wrapperRef.current) return;
			if (!wrapperRef.current.contains(e.target)) setOpen(false);
		};
		document.addEventListener("mousedown", onDocClick);
		return () => document.removeEventListener("mousedown", onDocClick);
	}, []);

	useEffect(() => {
		const trimmed = query.trim();
		setResults([]);
		if (!trimmed || trimmed.length < 2) {
			setLoading(false);
			return;
		}

		const startedAt = Date.now();
		lastRequestRef.current = startedAt;
		setLoading(true);

		const t = setTimeout(async () => {
			try {
				const { data } = await supabase
					.from("profiles")
					.select("id, username, avatar_url")
					.ilike("username", `%${trimmed}%`)
					.limit(8);
				if (lastRequestRef.current !== startedAt) return;
				setResults(data || []);
			} finally {
				if (lastRequestRef.current === startedAt) setLoading(false);
			}
		}, 350);

		return () => clearTimeout(t);
	}, [query, supabase]);

	return (
		<div
			ref={wrapperRef}
			className={cn("relative w-full max-w-[280px]", className)}>
			<div className="relative group flex items-center bg-white/5 border border-white/5 focus-within:bg-white/10 focus-within:border-white/20 rounded-full transition-all duration-300 overflow-hidden h-11">
				<Input
					value={query}
					onChange={(e) => {
						setQuery(e.target.value);
						setOpen(true);
					}}
					onFocus={() => setOpen(true)}
					placeholder="Search friends"
					autoComplete="off"
					className="flex-1 bg-transparent border-0 text-white placeholder:text-white/40 focus-visible:ring-0 focus-visible:ring-offset-0 px-5 h-full text-base font-normal rounded-full"
				/>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="22"
					height="22"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					className="mr-3 text-white/40 group-focus-within:text-white transition-colors shrink-0">
					<circle
						cx="11"
						cy="11"
						r="8"
					/>
					<path d="m21 21-4.3-4.3" />
				</svg>
			</div>

			{open && (loading || results.length > 0) && (
				<div className="absolute top-full right-0 mt-3 w-[320px] bg-[#121212] border border-white/10 rounded-2xl shadow-2xl p-2 z-[60] animate-in fade-in zoom-in-95 duration-200">
					{loading && (
						<div className="px-3 py-2 text-sm text-muted-foreground">
							Searching…
						</div>
					)}
					{results.length > 0 && (
						<div className="max-h-64 overflow-auto">
							{results.map((u) => (
								<Link
									key={u.id}
									href={`/profile/${encodeURIComponent(u.username)}`}
									onClick={() => {
										setOpen(false);
										setQuery("");
									}}
									className="flex items-center gap-3 px-3 py-2 hover:bg-secondary/40 transition">
									<div className="h-7 w-7 rounded-full overflow-hidden border bg-secondary/40">
										<img
											src={
												u.avatar_url ||
												`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
													u.username,
												)}`
											}
											alt={u.username}
											className="h-full w-full object-cover"
										/>
									</div>
									<div className="text-sm font-medium truncate">
										@{u.username}
									</div>
								</Link>
							))}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
