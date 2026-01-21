"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function CallbackPage() {
	const router = useRouter();

	useEffect(() => {
		const run = async () => {
			const url = new URL(window.location.href);
			const code = url.searchParams.get("code");
			const next = url.searchParams.get("next") ?? "/";

			if (!code) {
				router.replace(`/auth/auth-code-error${url.search ? url.search : ""}`);
				return;
			}

			const supabase = createBrowserClient(
				process.env.NEXT_PUBLIC_SUPABASE_URL,
				process.env.NEXT_PUBLIC_SUPABASE_ANON_TOKEN ??
					process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
			);

			const { error } = await supabase.auth.exchangeCodeForSession(code);
			if (error) {
				router.replace(`/auth/auth-code-error${url.search ? url.search : ""}`);
				return;
			}

			router.replace(next);
		};

		run();
	}, [router]);

	return null;
}
