"use client";

import { useSupabase } from "@/components/providers/supabase-provider";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { toast } from "sonner";

export function AuthModal({ children }) {
	const [open, setOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [isSignUp, setIsSignUp] = useState(false);
	const { supabase } = useSupabase();

	const handleLogin = async (e) => {
		e.preventDefault();
		setIsLoading(true);

		try {
			if (isSignUp) {
				const { error } = await supabase.auth.signUp({
					email,
					password,
					options: {
						data: {
							avatar_url: `https://api.dicebear.com/7.x/miniavs/svg?seed=${email}`,
						},
					},
				});
				if (error) throw error;
				toast.success("Account created! Please check your email.");
			} else {
				const { error } = await supabase.auth.signInWithPassword({
					email,
					password,
				});
				if (error) throw error;
				toast.success("Logged in successfully!");
				setOpen(false);
			}
		} catch (error) {
			toast.error(error.message);
		} finally {
			setIsLoading(false);
		}
	};

	const handleGoogleLogin = async () => {
		try {
			const siteUrl =
				process.env.NEXT_PUBLIC_SITE_URL ??
				"https://mpplaygo.vercel.app";
			const redirectTo = `${siteUrl}/auth/callback`;

			const { error } = await supabase.auth.signInWithOAuth({
				provider: "google",
				options: {
					redirectTo,
				},
			});
			if (error) throw error;
		} catch (error) {
			toast.error(error.message);
		}
	};

	return (
		<Dialog
			open={open}
			onOpenChange={setOpen}>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>
						{isSignUp ? "Create Account" : "Login"}
					</DialogTitle>
					<DialogDescription>
						Enter your details below to{" "}
						{isSignUp ?
							"create a new account"
						:	"login to your account"}
					</DialogDescription>
				</DialogHeader>
				<div className="grid gap-4 py-4">
					<form
						onSubmit={handleLogin}
						className="grid gap-4">
						<Input
							id="email"
							placeholder="Email"
							type="email"
							disabled={isLoading}
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
						/>
						<Input
							id="password"
							placeholder="Password"
							type="password"
							disabled={isLoading}
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
						/>
						<Button
							disabled={isLoading}
							type="submit">
							{isLoading ?
								"Loading..."
							: isSignUp ?
								"Sign Up"
							:	"Login"}
						</Button>
					</form>

					<div className="relative">
						<div className="absolute inset-0 flex items-center">
							<span className="w-full border-t" />
						</div>
						<div className="relative flex justify-center text-xs uppercase">
							<span className="bg-background px-2 text-muted-foreground">
								Or continue with
							</span>
						</div>
					</div>

					<Button
						variant="outline"
						type="button"
						disabled={isLoading}
						onClick={handleGoogleLogin}
						className="flex gap-2">
						<FcGoogle className="h-5 w-5" /> Google
					</Button>

					<p
						className="text-center text-sm text-muted-foreground cursor-pointer hover:underline"
						onClick={() => setIsSignUp(!isSignUp)}>
						{isSignUp ?
							"Already have an account? Login"
						:	"Don't have an account? Sign Up"}
					</p>
				</div>
			</DialogContent>
		</Dialog>
	);
}
