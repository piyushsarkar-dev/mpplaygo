import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request) {
	const { searchParams, origin } = new URL(request.url);
	const code = searchParams.get("code");
	const next = searchParams.get("next") ?? "/";

	// If the provider redirected back with an error, surface it.
	const oauthError = searchParams.get("error");
	const oauthErrorCode = searchParams.get("error_code");
	const oauthErrorDescription = searchParams.get("error_description");
	if (!code && (oauthError || oauthErrorCode || oauthErrorDescription)) {
		return NextResponse.redirect(
			`${origin}/auth/auth-code-error?${searchParams.toString()}`,
		);
	}

	if (!code) {
		return NextResponse.redirect(
			`${origin}/auth/auth-code-error?error=missing_code&error_description=Missing%20OAuth%20code`,
		);
	}

	const cookieStore = cookies();
	const supabase = createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_TOKEN ??
			process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
		{
			cookies: {
				getAll() {
					return cookieStore.getAll();
				},
				setAll(cookiesToSet) {
					cookiesToSet.forEach(({ name, value, options }) =>
						cookieStore.set(name, value, options),
					);
				},
			},
		},
	);

	const { error } = await supabase.auth.exchangeCodeForSession(code);
	if (error) {
		const qs = new URLSearchParams();
		qs.set("error", "exchange_code_for_session_failed");
		qs.set("error_description", error.message);
		return NextResponse.redirect(
			`${origin}/auth/auth-code-error?${qs.toString()}`,
		);
	}

	return NextResponse.redirect(`${origin}${next}`);
}
