"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

export default function AuthCodeErrorClient() {
	const params = useSearchParams();
	const error = params.get("error");
	const errorCode = params.get("error_code");
	const description = params.get("error_description");

	const hint = useMemo(() => {
		const d = (description || "").toLowerCase();
		if (d.includes("database error saving new user")) {
			return "This is almost always a Supabase trigger (handle_new_user) failing. Most commonly it writes a non-unique value into profiles.username (e.g. full_name), causing a unique constraint violation.";
		}
		return null;
	}, [description]);

	return (
		<div className="flex flex-col items-center justify-center min-h-screen px-6">
			<h1 className="text-2xl font-bold">Authentication Error</h1>
			<p className="text-muted-foreground mt-2 text-center">
				There was an issue signing you in.
			</p>

			{(error || errorCode || description) && (
				<div className="mt-6 w-full max-w-2xl rounded-xl border border-white/10 bg-secondary/10 p-4">
					<div className="text-sm">
						<div className="text-muted-foreground">Error</div>
						<div className="font-mono break-words">{error || "-"}</div>
					</div>
					<div className="text-sm mt-3">
						<div className="text-muted-foreground">Error code</div>
						<div className="font-mono break-words">{errorCode || "-"}</div>
					</div>
					<div className="text-sm mt-3">
						<div className="text-muted-foreground">Description</div>
						<div className="font-mono break-words">{description || "-"}</div>
					</div>
					{hint && (
						<div className="text-sm mt-3 text-muted-foreground">{hint}</div>
					)}
				</div>
			)}

			<div className="mt-6 flex gap-3">
				<Button asChild variant="secondary">
					<Link href="/">Go home</Link>
				</Button>
				<Button asChild>
					<Link href="/">Try again</Link>
				</Button>
			</div>
		</div>
	);
}
