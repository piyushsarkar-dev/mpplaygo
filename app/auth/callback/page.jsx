"use client";

import { useSupabase } from "@/components/providers/supabase-provider";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

function buildErrorUrl({ error, errorCode, errorDescription }) {
	const qs = new URLSearchParams();
	if (error) qs.set("error", error);
	if (errorCode) qs.set("error_code", errorCode);
	if (errorDescription) qs.set("error_description", errorDescription);
	return `/auth/auth-code-error?${qs.toString()}`;
}

export default function AuthCallbackPage() {
	const params = useSearchParams();
	const router = useRouter();
	const { supabase } = useSupabase();
	const [status, setStatus] = useState("Signing you in...");

	const nextPath = useMemo(() => {
		const next = params.get("next") ?? "/";
		// Basic safety: only allow relative redirects.
		if (!next.startsWith("/")) return "/";
		return next;
	}, [params]);

	useEffect(() => {
		let cancelled = false;

		const run = async () => {
			let finalNextPath = nextPath;
			if (finalNextPath === "/") {
				try {
					const stored = globalThis?.sessionStorage?.getItem(
						"mpplaygo.oauth.next",
					);
					if (stored && stored.startsWith("/")) {
						finalNextPath = stored;
					}
				} catch {
					// ignore storage errors
				}
			}
			try {
				globalThis?.sessionStorage?.removeItem("mpplaygo.oauth.next");
			} catch {
				// ignore storage errors
			}

			const code = params.get("code");
			const oauthError = params.get("error");
			const oauthErrorCode = params.get("error_code");
			const oauthErrorDescription = params.get("error_description");

			if (!code && (oauthError || oauthErrorCode || oauthErrorDescription)) {
				router.replace(
					buildErrorUrl({
						error: oauthError,
						errorCode: oauthErrorCode,
						errorDescription: oauthErrorDescription,
					}),
				);
				return;
			}

			if (!code) {
				router.replace(
					buildErrorUrl({
						error: "missing_code",
						errorDescription: "Missing OAuth code",
					}),
				);
				return;
			}

			setStatus("Finalizing login...");
			// With detectSessionInUrl enabled (default in @supabase/ssr browser client),
			// getSession() will process the PKCE callback URL and perform the code exchange.
			let sessionResult = await supabase.auth.getSession();
			for (let i = 0; i < 10 && !sessionResult?.data?.session && !sessionResult?.error; i += 1) {
				await new Promise((r) => setTimeout(r, 250));
				sessionResult = await supabase.auth.getSession();
			}
			const { data, error } = sessionResult;

			if (cancelled) return;

			if (error) {
				router.replace(
					buildErrorUrl({
						error: "exchange_code_for_session_failed",
						errorDescription: error.message,
					}),
				);
				return;
			}

			if (!data?.session?.user) {
				router.replace(
					buildErrorUrl({
						error: "missing_session",
						errorDescription:
							"No session returned after OAuth callback. Please try again.",
					}),
				);
				return;
			}

			router.replace(finalNextPath);
		};

		run();

		return () => {
			cancelled = true;
		};
	}, [nextPath, params, router, supabase]);

	return (
		<div className="flex flex-col items-center justify-center min-h-screen px-6">
			<h1 className="text-2xl font-bold">Signing in</h1>
			<p className="text-muted-foreground mt-2 text-center">{status}</p>
		</div>
	);
}
