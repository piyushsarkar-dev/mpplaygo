import { Suspense } from "react";
import AuthCodeErrorClient from "./auth-code-error-client";

export default function AuthCodeError() {
	return (
		<Suspense
			fallback={
				<div className="flex flex-col items-center justify-center min-h-screen px-6">
					<h1 className="text-2xl font-bold">Authentication Error</h1>
					<p className="text-muted-foreground mt-2 text-center">
						There was an issue signing you in.
					</p>
				</div>
			}>
			<AuthCodeErrorClient />
		</Suspense>
	);
}
