"use client";
import { SearchIcon } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

export default function Search() {
	const [query, setQuery] = useState("");
	const linkRef = useRef();
	const inpRef = useRef();
	const handleSubmit = (e) => {
		e.preventDefault();
		if (!query) {
			router.push("/");
			return;
		}
		linkRef.current.click();
		inpRef.current.blur();
		setQuery("");
	};
	return (
		<>
			<Link
				href={"/search/" + query}
				ref={linkRef}></Link>
			<form
				onSubmit={handleSubmit}
				className="flex items-center relative z-10 w-full">
				<Button
					variant="ghost"
					type="submit"
					size="icon"
					className="absolute right-0 rounded-xl rounded-l-none bg-none">
					<SearchIcon className="w-4 h-4" />
				</Button>
				<Input
					ref={inpRef}
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					autoComplete="off"
					type="search"
					className="rounded-lg bg-secondary/50"
					name="query"
					placeholder="Seacrh The Music"
				/>
			</form>
		</>
	);
}
