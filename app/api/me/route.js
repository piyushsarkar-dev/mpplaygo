import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
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

	const { data: userData } = await supabase.auth.getUser();
	const user = userData?.user ?? null;

	if (!user) {
		return NextResponse.json(
			{ user: null, profile: null },
			{ status: 200 },
		);
	}

	let profile = null;
	try {
		const { data } = await supabase
			.from("profiles")
			.select("*")
			.eq("id", user.id)
			.maybeSingle();
		profile = data ?? null;

		// Google often uses `picture` instead of `avatar_url`.
		const meta = user.user_metadata ?? {};
		const bestAvatar = meta.avatar_url ?? meta.picture ?? null;

		if (profile && !profile.avatar_url && bestAvatar) {
			const { data: updated } = await supabase
				.from("profiles")
				.update({ avatar_url: bestAvatar })
				.eq("id", user.id)
				.select("*")
				.maybeSingle();
			profile = updated ?? profile;
		}
	} catch {
		// ignore profile errors; user is still valid
	}

	return NextResponse.json({ user, profile }, { status: 200 });
}
