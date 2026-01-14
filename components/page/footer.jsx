import Link from "next/link";

export default function Footer() {
	return (
		<footer className="py-5 backdrop-blur-3xl mt-8 px-6 md:px-20 lg:px-32">
			<p className="text-sm text-muted-foreground">
				Built for educational purpose.
			</p>
			<div className="flex gap-3 items-center mt-3">
				<Link
					target="_blank"
					className="text-sm opacity-80 font-light underline hover:opacity-100"
					href="https://github.com/piyushsarkar-dev/mpplaygo">
					Source Code
				</Link>
			</div>
		</footer>
	);
}
