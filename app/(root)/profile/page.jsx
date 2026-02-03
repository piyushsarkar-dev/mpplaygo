"use client";

import { useSupabase } from "@/components/providers/supabase-provider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProfileRedirect() {
	const { user } = useSupabase();
	const router = useRouter();

	useEffect(() => {
		if (user?.user_metadata?.username) {
			router.replace(`/profile/${user.user_metadata.username}`);
		} else if (user?.id) {
			// Fallback to user ID if no username
			router.replace(`/profile/${user.id}`);
		} else {
			// No user, redirect to home
			router.replace("/");
		}
	}, [user, router]);

	return (
		<div className="flex items-center justify-center min-h-screen">
			<div className="text-white/60">Loading profile...</div>
		</div>
	);
}
