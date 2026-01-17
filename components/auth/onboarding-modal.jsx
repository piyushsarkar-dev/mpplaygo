"use client";

import { useSupabase } from "@/components/providers/supabase-provider";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

function normalizeUsername(value) {
	return String(value || "")
		.trim()
		.toLowerCase()
		.replace(/\s+/g, "-")
		.replace(/[^a-z0-9-_]/g, "");
}

function getAuthProvider(user) {
	const fromIdentities = user?.identities?.[0]?.provider;
	const fromMeta = user?.app_metadata?.provider;
	return fromIdentities || fromMeta || null;
}

export function OnboardingModal() {
	const { supabase, user, profile, isLoading, refreshProfile } =
		useSupabase();

	const provider = useMemo(() => getAuthProvider(user), [user]);
	const requiresFullName = provider === "email";

	const needsOnboarding = useMemo(() => {
		if (!user) return false;
		if (isLoading) return false;
		if (!profile) return true;
		const missingUsername = !profile?.username;
		const missingGender =
			profile?.gender == null || String(profile.gender).trim() === "";
		return missingUsername || missingGender;
	}, [user, isLoading, profile]);

	const [open, setOpen] = useState(false);
	useEffect(() => {
		if (needsOnboarding) setOpen(true);
	}, [needsOnboarding]);

	const [fullName, setFullName] = useState("");
	const [username, setUsername] = useState("");
	const [gender, setGender] = useState("");
	const didPrefillRef = useRef(false);

	useEffect(() => {
		if (!open) return;
		if (profile?.username && !username) setUsername(profile.username);
		if (profile?.gender && !gender) setGender(profile.gender);

		if (!fullName) {
			const initial =
				profile?.full_name ||
				user?.user_metadata?.full_name ||
				user?.user_metadata?.name ||
				user?.email?.split("@")[0] ||
				"";
			setFullName(String(initial || ""));
		}

		// Prefill a *suggested* username (still editable) when empty.
		if (!didPrefillRef.current && !profile?.username && !username) {
			const base =
				user?.user_metadata?.preferred_username ||
				user?.user_metadata?.user_name ||
				user?.user_metadata?.full_name ||
				user?.user_metadata?.name ||
				user?.email?.split("@")[0] ||
				"";
			const suggested = normalizeUsername(base);
			if (suggested && suggested.length >= 3) setUsername(suggested);
			didPrefillRef.current = true;
		}
	}, [open, profile, user, requiresFullName, username, gender, fullName]);

	const [checking, setChecking] = useState(false);
	const [isAvailable, setIsAvailable] = useState(null); // null | boolean
	const [suggestions, setSuggestions] = useState([]);
	const lastCheckRef = useRef(0);

	const normalizedUsername = useMemo(
		() => normalizeUsername(username),
		[username],
	);

	useEffect(() => {
		if (!open) return;
		setIsAvailable(null);
		setSuggestions([]);

		const candidate = normalizedUsername;
		if (!candidate || candidate.length < 3) {
			setChecking(false);
			return;
		}

		const startedAt = Date.now();
		lastCheckRef.current = startedAt;
		setChecking(true);

		const t = setTimeout(async () => {
			try {
				const { data, error } = await supabase
					.from("profiles")
					.select("id")
					.eq("username", candidate)
					.maybeSingle();

				if (lastCheckRef.current !== startedAt) return;
				if (error) {
					setIsAvailable(null);
					return;
				}

				const takenByOther = data?.id && data.id !== user?.id;
				setIsAvailable(!takenByOther);

				if (takenByOther) {
					const base = candidate;
					const candidates = Array.from({ length: 8 }).map((_, i) => {
						const n = i + 1;
						return `${base}${n}`;
					});
					candidates.push(
						`${base}_${Math.floor(100 + Math.random() * 900)}`,
					);
					candidates.push(
						`${base}${Math.floor(10 + Math.random() * 90)}`,
					);

					const uniq = Array.from(new Set(candidates)).slice(0, 10);
					const { data: existing } = await supabase
						.from("profiles")
						.select("username")
						.in("username", uniq);

					if (lastCheckRef.current !== startedAt) return;
					const taken = new Set(
						(existing || []).map((x) => x.username),
					);
					setSuggestions(
						uniq.filter((u) => !taken.has(u)).slice(0, 4),
					);
				}
			} finally {
				if (lastCheckRef.current === startedAt) setChecking(false);
			}
		}, 450);

		return () => clearTimeout(t);
	}, [open, normalizedUsername, supabase, user?.id]);

	const [saving, setSaving] = useState(false);

	const canSubmit = useMemo(() => {
		if (!user) return false;
		if (!normalizedUsername || normalizedUsername.length < 3) return false;
		if (isAvailable === false) return false;
		if (!gender) return false;
		if (requiresFullName && !String(fullName).trim()) return false;
		return true;
	}, [
		user,
		normalizedUsername,
		isAvailable,
		gender,
		requiresFullName,
		fullName,
	]);

	const handleSubmit = async (e) => {
		e?.preventDefault?.();
		if (!user) return;

		setSaving(true);
		try {
			const payload = {
				username: normalizedUsername,
				gender,
			};
			const trimmedFullName = String(fullName || "").trim();
			if (trimmedFullName) payload.full_name = trimmedFullName;

			let { error } = await supabase
				.from("profiles")
				.update(payload)
				.eq("id", user.id);

			if (error) {
				// If the DB schema doesn't have gender/full_name yet, fallback to username-only
				const msg = String(error.message || "");
				if (
					msg.includes("column") &&
					(msg.includes("gender") || msg.includes("full_name"))
				) {
					const fallback = await supabase
						.from("profiles")
						.update({ username: normalizedUsername })
						.eq("id", user.id);
					if (fallback.error) throw fallback.error;
					toast.warning(
						"Saved username, but your profiles table is missing gender/full_name columns. Update your DB schema to finish onboarding.",
					);
				} else {
					throw error;
				}
			}

			await refreshProfile();
			toast.success("Profile saved!");
			setOpen(false);
		} catch (err) {
			toast.error(err?.message || "Failed to save profile");
		} finally {
			setSaving(false);
		}
	};

	if (!user) return null;

	return (
		<Dialog
			open={open}
			onOpenChange={(nextOpen) => {
				// Force modal while onboarding is required
				if (needsOnboarding) {
					setOpen(true);
					return;
				}
				setOpen(nextOpen);
			}}>
			<DialogContent
				className={cn("sm:max-w-[520px] [&>button]:hidden")}
				onPointerDownOutside={(e) => {
					if (needsOnboarding) e.preventDefault();
				}}
				onEscapeKeyDown={(e) => {
					if (needsOnboarding) e.preventDefault();
				}}>
				<DialogHeader>
					<DialogTitle>Finish setting up your profile</DialogTitle>
					<DialogDescription>
						Pick a unique username and tell us a bit about you.
					</DialogDescription>
				</DialogHeader>

				<form
					onSubmit={handleSubmit}
					className="grid gap-4">
					<div className="grid gap-2">
						<label className="text-sm text-muted-foreground">
							Full name
						</label>
						<Input
							value={fullName}
							onChange={(e) => setFullName(e.target.value)}
							placeholder="Your name"
							disabled={saving}
							required={requiresFullName}
						/>
					</div>

					<div className="grid gap-2">
						<label className="text-sm text-muted-foreground">
							Username
						</label>
						<Input
							value={username}
							onChange={(e) => setUsername(e.target.value)}
							placeholder="e.g. piyush"
							disabled={saving}
							required
						/>
						<div className="text-xs text-muted-foreground">
							<span>Will be saved as </span>
							<span className="font-mono">
								{normalizedUsername || "-"}
							</span>
							{checking && <span> · Checking…</span>}
							{!checking &&
								isAvailable === true &&
								normalizedUsername.length >= 3 && (
									<span className="text-emerald-500">
										{" "}
										· Available
									</span>
								)}
							{!checking && isAvailable === false && (
								<span className="text-red-500"> · Taken</span>
							)}
						</div>
					</div>

					{isAvailable === false && suggestions.length > 0 && (
						<div className="grid gap-2">
							<div className="text-xs text-muted-foreground">
								Suggestions
							</div>
							<div className="flex flex-wrap gap-2">
								{suggestions.map((s) => (
									<Button
										key={s}
										type="button"
										variant="secondary"
										onClick={() => setUsername(s)}
										disabled={saving}>
										{s}
									</Button>
								))}
							</div>
						</div>
					)}

					<div className="grid gap-2">
						<label className="text-sm text-muted-foreground">
							Gender
						</label>
						<div className="flex gap-2">
							{["male", "female", "other"].map((g) => (
								<Button
									key={g}
									type="button"
									variant={
										gender === g ? "default" : "secondary"
									}
									onClick={() => setGender(g)}
									disabled={saving}
									className="capitalize">
									{g}
								</Button>
							))}
						</div>
					</div>

					<Button
						type="submit"
						disabled={!canSubmit || saving}>
						{saving ? "Saving…" : "Continue"}
					</Button>
				</form>
			</DialogContent>
		</Dialog>
	);
}
