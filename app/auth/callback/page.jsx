import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function CallbackPage({ searchParams }) {
	const code = searchParams?.code;
	const next = searchParams?.next ?? "/";
	const oauthError = searchParams?.error;
	const oauthErrorCode = searchParams?.error_code;
	const oauthErrorDescription = searchParams?.error_description;

	if (!code) {
		if (oauthError || oauthErrorCode || oauthErrorDescription) {
			const qs = new URLSearchParams();
			if (oauthError) qs.set("error", oauthError);
			if (oauthErrorCode) qs.set("error_code", oauthErrorCode);
			if (oauthErrorDescription)
				qs.set("error_description", oauthErrorDescription);
			redirect(`/auth/auth-code-error?${qs.toString()}`);
		}

		redirect(
			"/auth/auth-code-error?error=missing_code&error_description=Missing%20OAuth%20code",
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
		redirect(
			`/auth/auth-code-error?error=exchange_code_for_session_failed&error_description=${encodeURIComponent(
				error.message,
			)}`,
		);
	}

	redirect(next);
}
