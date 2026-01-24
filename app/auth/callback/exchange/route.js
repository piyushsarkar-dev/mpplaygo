import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

function buildErrorUrl({ origin, error, errorCode, errorDescription }) {
	const qs = new URLSearchParams();
	if (error) qs.set("error", error);
	if (errorCode) qs.set("error_code", errorCode);
	if (errorDescription) qs.set("error_description", errorDescription);
	return new URL(`/auth/auth-code-error?${qs.toString()}`, origin);
}

function safeNextPath(value) {
	const next = typeof value === "string" ? value : "/";
	if (!next.startsWith("/")) return "/";
	if (next.startsWith("//")) return "/";
	return next;
}

export async function GET(request) {
	const url = new URL(request.url);
	const origin = url.origin;
	const code = url.searchParams.get("code");
	const nextPath = safeNextPath(url.searchParams.get("next"));

	if (!code) {
		return NextResponse.redirect(
			buildErrorUrl({
				origin,
				error: "missing_code",
				errorDescription: "Missing OAuth code",
			}),
		);
	}

	// Prepare the redirect response early so we can attach cookies to it.
	let response = NextResponse.redirect(new URL(nextPath, origin));

	const supabase = createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_TOKEN ??
			process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
		{
			cookies: {
				getAll() {
					return request.cookies.getAll();
				},
				setAll(cookiesToSet) {
					cookiesToSet.forEach(({ name, value, options }) => {
						response.cookies.set(name, value, options);
					});
				},
			},
		},
	);

	const { error } = await supabase.auth.exchangeCodeForSession(code);
	if (error) {
		return NextResponse.redirect(
			buildErrorUrl({
				origin,
				error: "exchange_code_for_session_failed",
				errorDescription: error.message,
			}),
		);
	}

	return response;
}
