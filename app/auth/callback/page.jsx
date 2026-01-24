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

	redirect(
		`/auth/callback/exchange?code=${encodeURIComponent(code)}&next=${encodeURIComponent(
			nextPath,
		)}`,
	);
}
