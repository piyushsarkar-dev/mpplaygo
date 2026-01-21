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

	useEffect(() => {
		let cancelled = false;

		const hydrate = async () => {
			try {
				const { data: sessionData } = await supabase.auth.getSession();
				if (cancelled) return;
				if (sessionData?.session?.user) {
					const nextUser = sessionData.session.user;
					setUser(nextUser);
					await fetchProfile(nextUser.id);
					return;
				}

				const { data, error } = await supabase.auth.getUser();
				if (cancelled) return;
				if (error) {
					setUser(null);
					setProfile(null);
					return;
				}

				const nextUser = data?.user ?? null;
				setUser(nextUser);
				if (nextUser) {
					await fetchProfile(nextUser.id);
				} else {
					setProfile(null);
				}
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
		await fetchProfile(user.id);
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
