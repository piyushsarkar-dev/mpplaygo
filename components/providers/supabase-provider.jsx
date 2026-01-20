"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";

const Context = createContext(undefined);

export default function SupabaseProvider({ children }) {
	const [supabase] = useState(() =>
		createBrowserClient(
			process.env.NEXT_PUBLIC_SUPABASE_URL,
			process.env.NEXT_PUBLIC_SUPABASE_ANON_TOKEN ??
				process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
		),
	);
	const [user, setUser] = useState(null);
	const [profile, setProfile] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const router = useRouter();

	const fetchServerSession = async () => {
		try {
			const res = await fetch("/api/me", { cache: "no-store" });
			if (!res.ok) return { user: null, profile: null };
			return await res.json();
		} catch {
			return { user: null, profile: null };
		}
	};

	useEffect(() => {
		let cancelled = false;

		const hydrate = async () => {
			try {
				const { data, error } = await supabase.auth.getUser();
				if (cancelled) return;
				if (!error && data?.user) {
					const nextUser = data.user;
					setUser(nextUser);
					await fetchProfile(nextUser.id);
					return;
				}

				// Fallback for OAuth flows where session is stored in HttpOnly cookies
				// (common when using @supabase/ssr exchangeCodeForSession on the server).
				const server = await fetchServerSession();
				if (cancelled) return;
				setUser(server?.user ?? null);
				setProfile(server?.profile ?? null);
			} finally {
				if (!cancelled) setIsLoading(false);
			}
		};

		hydrate();

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((event, session) => {
			if (session?.user) {
				setUser(session.user);
				fetchProfile(session.user.id);
			} else {
				setUser(null);
				setProfile(null);
			}
			router.refresh();
		});

		return () => {
			cancelled = true;
			subscription.unsubscribe();
		};
	}, [router, supabase]);

	const fetchProfile = async (userId) => {
		const { data } = await supabase
			.from("profiles")
			.select("*")
			.eq("id", userId)
			.single();
		if (data) setProfile(data);
	};

	const refreshProfile = async () => {
		if (!user?.id) return;
		// If we're using cookie-only session (OAuth), profile fetch via browser client
		// may not be authorized. Use server endpoint as a fallback.
		try {
			await fetchProfile(user.id);
			if (profile) return;
		} catch {
			// ignore and fallback
		}
		const server = await fetchServerSession();
		setProfile(server?.profile ?? null);
	};

	return (
		<Context.Provider
			value={{
				supabase,
				user,
				profile,
				isLoading,
				refreshProfile,
				setProfile,
			}}>
			{children}
		</Context.Provider>
	);
}

export const useSupabase = () => {
	const context = useContext(Context);
	if (context === undefined) {
		throw new Error("useSupabase must be used inside SupabaseProvider");
	}
	return context;
};
