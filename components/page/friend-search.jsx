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
			className={cn("relative w-full", className)}>
			<Input
				value={query}
				onChange={(e) => {
					setQuery(e.target.value);
					setOpen(true);
				}}
				onFocus={() => setOpen(true)}
				placeholder="Search friends…"
				autoComplete="off"
				className="rounded-lg bg-secondary/50"
			/>
			{open && (loading || results.length > 0) && (
				<div className="absolute left-0 right-0 top-full mt-2 overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow">
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
