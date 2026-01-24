import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

function buildErrorUrl({ error, errorCode, errorDescription }) {
	const qs = new URLSearchParams();
	if (error) qs.set("error", error);
	if (errorCode) qs.set("error_code", errorCode);
	if (errorDescription) qs.set("error_description", errorDescription);
	return `/auth/auth-code-error?${qs.toString()}`;
}

function safeNextPath(value) {
	const next = typeof value === "string" ? value : "/";
	if (!next.startsWith("/")) return "/";
	// avoid protocol-relative redirects (e.g. //evil.com)
	if (next.startsWith("//")) return "/";
	return next;
}

export default async function AuthCallbackPage({ searchParams }) {
	const code = searchParams?.code;
	const oauthError = searchParams?.error;
	const oauthErrorCode = searchParams?.error_code;
	const oauthErrorDescription = searchParams?.error_description;
	const nextPath = safeNextPath(searchParams?.next);

	if (!code && (oauthError || oauthErrorCode || oauthErrorDescription)) {
		redirect(
			buildErrorUrl({
				error: oauthError,
				errorCode: oauthErrorCode,
				errorDescription: oauthErrorDescription,
			}),
		);
	}

	if (!code) {
		redirect(
			buildErrorUrl({
				error: "missing_code",
				errorDescription: "Missing OAuth code",
			}),
		);
	}

	const cookieStore = await cookies();
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
		redirect(
			buildErrorUrl({
				error: "exchange_code_for_session_failed",
				errorDescription: error.message,
			}),
		);
	}

	redirect(nextPath);
}
