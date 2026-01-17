"use client";

import { useSupabase } from "@/components/providers/supabase-provider";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

function normalizeUsername(value) {
	return String(value || "")
		.trim()
		.toLowerCase()
		.replace(/\s+/g, "-")
		.replace(/[^a-z0-9-_]/g, "");
}

export function EditProfileModal({ children }) {
	const { supabase, user, profile: myProfile, refreshProfile } = useSupabase();
	const router = useRouter();

	const [open, setOpen] = useState(false);
	const [fullName, setFullName] = useState("");
	const [username, setUsername] = useState("");
	const [gender, setGender] = useState("");

	useEffect(() => {
		if (!open) return;
		setFullName(String(myProfile?.full_name || ""));
		setUsername(String(myProfile?.username || ""));
		setGender(String(myProfile?.gender || ""));
	}, [open, myProfile?.full_name, myProfile?.username, myProfile?.gender]);

	const normalizedUsername = useMemo(
		() => normalizeUsername(username),
		[username],
	);

	const [checking, setChecking] = useState(false);
	const [isAvailable, setIsAvailable] = useState(null); // null | boolean
	const lastCheckRef = useRef(0);

	useEffect(() => {
		if (!open) return;
		setIsAvailable(null);

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
		return true;
	}, [user, normalizedUsername, isAvailable]);

	const handleSave = async (e) => {
		e?.preventDefault?.();
		if (!user) return;

		setSaving(true);
		try {
			const payload = {
				username: normalizedUsername,
				gender: gender || null,
				full_name: String(fullName || "").trim() || null,
			};

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
						"Saved username, but your profiles table is missing gender/full_name columns. Update your DB schema to save everything.",
					);
				} else {
					throw error;
				}
			}

			await refreshProfile();
			toast.success("Profile updated!");
			setOpen(false);

			// If username changed, navigate to the new route
			if (myProfile?.username && myProfile.username !== normalizedUsername) {
				router.push(`/profile/${normalizedUsername}`);
			} else {
				router.refresh();
			}
		} catch (err) {
			toast.error(err?.message || "Failed to update profile");
		} finally {
			setSaving(false);
		}
	};

	if (!user) return null;

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Edit profile</DialogTitle>
					<DialogDescription>
						Update your name, username, and gender.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSave} className="space-y-4">
					<div className="space-y-2">
						<label className="text-sm font-medium">Full name</label>
						<Input
							value={fullName}
							onChange={(e) => setFullName(e.target.value)}
							placeholder="Your name"
							disabled={saving}
						/>
					</div>

					<div className="space-y-2">
						<label className="text-sm font-medium">Username</label>
						<Input
							value={username}
							onChange={(e) => setUsername(e.target.value)}
							placeholder="e.g. piyush"
							disabled={saving}
							required
						/>
						<div className="text-xs text-muted-foreground">
							<span>Will be saved as </span>
							<span className="font-mono">{normalizedUsername || "-"}</span>
							{checking && <span> · Checking…</span>}
							{!checking && isAvailable === true && normalizedUsername.length >= 3 && (
								<span className="text-emerald-500"> · Available</span>
							)}
							{!checking && isAvailable === false && (
								<span className="text-red-500"> · Taken</span>
							)}
						</div>
					</div>

					<div className="space-y-2">
						<label className="text-sm font-medium">Gender</label>
						<div className="flex gap-2">
							{["male", "female", "other"].map((g) => (
								<Button
									key={g}
									type="button"
									variant={gender === g ? "default" : "secondary"}
									onClick={() => setGender(g)}
									disabled={saving}
									className="capitalize">
									{g}
								</Button>
							))}
						</div>
					</div>

					<DialogFooter>
						<Button type="submit" disabled={!canSubmit || saving}>
							{saving ? "Saving…" : "Save"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
