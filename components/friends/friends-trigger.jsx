"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UserRoundPlus } from "lucide-react";
import Link from "next/link";

export default function FriendsTrigger({ mobile = false, className }) {
  if (mobile) {
    return (
      <Link
        href="/friends"
        aria-label="Open Friends"
        className={cn(
          "pointer-events-auto h-[62px] w-[62px] rounded-full glass-mobile-nav flex items-center justify-center text-white transition-all duration-400",
          className,
        )}>
        <UserRoundPlus className="h-6 w-6" />
      </Link>
    );
  }

  return (
    <Button
      variant="ghost"
      asChild
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-4 text-sm text-white/75 backdrop-blur-sm transition-all duration-300 hover:border-white/[0.14] hover:bg-white/[0.08] hover:text-white",
        className,
      )}>
      <Link href="/friends">
        <UserRoundPlus className="h-4 w-4" />
        <span>Friends</span>
      </Link>
    </Button>
  );
}
