"use client";
import { Button } from "@/components/ui/button";
import {
  Credenza,
  CredenzaBody,
  CredenzaContent,
  CredenzaHeader,
  CredenzaTitle,
  CredenzaTrigger,
} from "@/components/ui/credenza";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { getSongsByQuery } from "@/lib/fetch";
import { Play, Search, SearchIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function AdvanceSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const getSongs = async () => {
    if (query.trim() === "") {
      setData([]);
      return;
    }

    setLoading(true);
    try {
      const response = await getSongsByQuery(query);
      const result = await response.json();
      if (result.data && result.data.results) {
        setData(result.data.results);
      } else {
        console.warn("Unexpected data structure:", result);
        setData([]);
      }
    } catch (error) {
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (query) {
      const handler = setTimeout(() => {
        getSongs();
      }, 400);

      return () => {
        clearTimeout(handler);
      };
    } else {
      setData([]);
    }
  }, [query]);

  return (
    <div className="px-6 !-mb-3 md:px-20 lg:px-32">
      <Credenza>
        <CredenzaTrigger asChild>
          <div className="flex items-center relative z-10 w-full">
            <div className="flex bg-secondary/50 text-foreground/80 items-center h-10 w-full rounded-lg border border-border px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
              Look for songs by name...
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="absolute right-0 rounded-xl rounded-l-none bg-none">
              <SearchIcon className="w-4 h-4" />
            </Button>
          </div>
        </CredenzaTrigger>
        <CredenzaContent>
          <CredenzaHeader>
            <CredenzaTitle className="text-left flex gap-2">
              <Input
                autoFocus={query == ""}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full"
                type="search"
                name="query"
                placeholder="Search for songs by name..."
                autoComplete="off"
              />
              <Button
                className="min-w-10"
                size="icon"
                asChild={query != ""}>
                {query != "" ?
                  <Link href={`/search/${query}`}>
                    <Search className="h-4 w-4" />
                  </Link>
                : <Search className="h-4 w-4" />}
              </Button>
            </CredenzaTitle>
          </CredenzaHeader>
          <CredenzaBody className="text-left grid gap-2 mb-5 px-0">
            {loading && (
              <div className="space-y-3 px-4 md:px-0">
                <Skeleton className="h-4 w-44" />
                <ScrollArea className="h-[390px] md:px-0 px-4">
                  <div className="flex flex-col gap-2">
                    {Array.from({ length: 6 }).map((_, idx) => (
                      <div
                        key={idx}
                        className="w-full border border-border rounded-md p-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Skeleton className="bg-secondary/50 w-8 h-8 rounded-md shrink-0" />
                          <div className="flex-1 min-w-0 space-y-2">
                            <Skeleton className="h-4 w-4/5" />
                            <Skeleton className="h-3 w-1/2" />
                          </div>
                        </div>
                        <Skeleton className="h-10 w-10 rounded-md shrink-0" />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
            {!loading && data.length === 0 && query && (
              <div className="flex items-center justify-center h-[400px]">
                <p className="text-sm text-muted-foreground">
                  No results found!
                </p>
              </div>
            )}
            {!query && !loading && (
              <div className="flex items-center justify-center h-[400px]">
                <p className="text-sm text-muted-foreground">
                  Type something to search..
                </p>
              </div>
            )}
            {query && !loading && data.length > 0 && (
              <>
                <div className="px-4 md:px-0">
                  <h1 className="text-sm text-foreground/70">
                    Search results for{" "}
                    <span className="bg-primary/70 text-primary-foreground">
                      {query}
                    </span>
                  </h1>
                </div>
                <ScrollArea className="h-[390px] md:px-0 px-4">
                  <div className="flex flex-col gap-2">
                    {data.length > 0 &&
                      data.map((song) => (
                        <Link
                          className="w-full hover:bg-secondary/30 border border-border rounded-md p-3 flex items-center justify-between gap-3"
                          key={song.id}
                          href={`/${song.id}`}>
                          <div className="flex items-center gap-3">
                            <img
                              src={
                                song.image?.[2]?.url ||
                                song.image?.[1]?.url ||
                                song.image?.[0]?.url ||
                                ""
                              }
                              alt={song.name}
                              className="bg-secondary/50 w-8 h-8 rounded-md"
                            />
                            <p className="text-sm grid">
                              {song.name.slice(0, 40)}
                              {song.name.length > 40 && "..."}
                              <span className="text-muted-foreground">
                                {song.artists?.primary?.[0]?.name || "unknown"}
                              </span>
                            </p>
                          </div>
                          <Button
                            size="icon"
                            className="min-w-10"
                            variant="outline">
                            <Play className="h-4 w-4" />
                          </Button>
                        </Link>
                      ))}
                  </div>
                </ScrollArea>
              </>
            )}
          </CredenzaBody>
        </CredenzaContent>
      </Credenza>
    </div>
  );
}
