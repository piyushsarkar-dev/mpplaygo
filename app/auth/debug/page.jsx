"use client";

import { useSupabase } from "@/components/providers/supabase-provider";
import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";

function readCookies() {
	try {
		return document.cookie
			.split(";")
			.map((c) => c.trim())
			.filter(Boolean);
	} catch {
		return [];
	}
}

export default function AuthDebugPage() {
	const { supabase } = useSupabase();
	const [result, setResult] = useState(null);
	const [error, setError] = useState(null);

	const runtime = useMemo(() => {
		const origin = globalThis?.location?.origin ?? "";
		const href = globalThis?.location?.href ?? "";
		const envSiteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
		const computedSiteUrl = origin || envSiteUrl;
		const redirectTo = `${computedSiteUrl}/auth/callback`;

		const cookies = readCookies();
		const supabaseCookies = cookies.filter(
			(c) => c.startsWith("sb-") || c.includes("code-verifier"),
		);

		let storedNext = null;
		try {
			storedNext = globalThis?.sessionStorage?.getItem("mpplaygo.oauth.next");
		} catch {
			storedNext = null;
		}

		return {
			origin,
			href,
			envSiteUrl,
			redirectTo,
			supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
			storedNext,
			supabaseCookies,
		};
	}, []);

	const handleGoogleLogin = async () => {
		setError(null);
		setResult(null);
		try {
			try {
				const nextPath =
					globalThis?.location?.pathname &&
					globalThis?.location?.search != null
						? `${globalThis.location.pathname}${globalThis.location.search}`
						: "/";
				globalThis?.sessionStorage?.setItem("mpplaygo.oauth.next", nextPath);
			} catch {
				// ignore
			}

			const { error: signInError } = await supabase.auth.signInWithOAuth({
				provider: "google",
				options: {
					redirectTo: runtime.redirectTo,
				},
			});
			if (signInError) throw signInError;
		} catch (e) {
			setError(e?.message ?? String(e));
		}
	};

	const handleCheckSession = async () => {
		setError(null);
		setResult(null);
		try {
			const [{ data: sessionData, error: sessionError }, { data: userData, error: userError }] =
				await Promise.all([supabase.auth.getSession(), supabase.auth.getUser()]);

			setResult({
				session: sessionData?.session
					? {
						userId: sessionData.session.user?.id ?? null,
						email: sessionData.session.user?.email ?? null,
						expiresAt: sessionData.session.expires_at ?? null,
					}
					: null,
				sessionError: sessionError?.message ?? null,
				user: userData?.user
					? {
						userId: userData.user.id ?? null,
						email: userData.user.email ?? null,
					}
					: null,
				userError: userError?.message ?? null,
				cookiesNow: readCookies().filter(
					(c) => c.startsWith("sb-") || c.includes("code-verifier"),
				),
			});
		} catch (e) {
			setError(e?.message ?? String(e));
		}
	};

	return (
		<div className="min-h-screen px-6 py-10 max-w-3xl mx-auto">
			<h1 className="text-2xl font-bold">Auth Debug</h1>
			<p className="text-muted-foreground mt-2">
				Use this page to capture the exact runtime URLs and cookie state.
			</p>

			<div className="mt-6 space-y-3 rounded-xl border border-white/10 bg-secondary/10 p-4 text-sm">
				<div>
					<div className="text-muted-foreground">Browser origin</div>
					<div className="font-mono break-words">{runtime.origin || "-"}</div>
				</div>
				<div>
					<div className="text-muted-foreground">Current URL</div>
					<div className="font-mono break-words">{runtime.href || "-"}</div>
				</div>
				<div>
					<div className="text-muted-foreground">NEXT_PUBLIC_SITE_URL</div>
					<div className="font-mono break-words">{runtime.envSiteUrl || "-"}</div>
				</div>
				<div>
					<div className="text-muted-foreground">Computed redirectTo</div>
					<div className="font-mono break-words">{runtime.redirectTo}</div>
				</div>
				<div>
					<div className="text-muted-foreground">NEXT_PUBLIC_SUPABASE_URL</div>
					<div className="font-mono break-words">{runtime.supabaseUrl || "-"}</div>
				</div>
				<div>
					<div className="text-muted-foreground">Stored next path</div>
					<div className="font-mono break-words">{runtime.storedNext || "-"}</div>
				</div>
				<div>
					<div className="text-muted-foreground">Supabase-related cookies</div>
					<div className="font-mono break-words">
						{runtime.supabaseCookies.length ? runtime.supabaseCookies.join("\n") : "-"}
					</div>
				</div>
			</div>

			<div className="mt-6 flex gap-3">
				<Button onClick={handleGoogleLogin}>Start Google OAuth</Button>
				<Button variant="secondary" onClick={handleCheckSession}>
					Check session
				</Button>
			</div>

			{error && (
				<div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm">
					<div className="font-semibold">Error</div>
					<div className="font-mono break-words mt-2">{error}</div>
				</div>
			)}

			{result && (
				<pre className="mt-6 whitespace-pre-wrap rounded-xl border border-white/10 bg-secondary/10 p-4 text-xs">
					{JSON.stringify(result, null, 2)}
				</pre>
			)}
		</div>
	);
}
