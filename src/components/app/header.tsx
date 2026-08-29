"use client";

import Link from "next/link";
import { Bell, CircleHelp, Grid3X3, Plus } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";

export function Header({ title, userName }: { title?: string; userName: string }) {
  return (
    <header className="sticky top-0 z-20 flex h-[98px] items-center justify-between gap-4 border-b border-[#1d3038] bg-[#050809]/95 px-4 backdrop-blur lg:px-8">
      <div className="hidden w-full max-w-[560px] md:block">
        <Input icon placeholder={`Search orders, customers, or ${title ? title.toLowerCase() : "messages"} (CMD+K)`} />
      </div>

      <div className="ml-auto flex items-center justify-end gap-3 text-[#8fa3ad] sm:gap-5">
        <button className="rounded-lg p-2 transition hover:bg-[#10181c] hover:text-[#22ddeb]" aria-label="Notifications">
          <Bell className="h-6 w-6" />
        </button>
        <button className="hidden rounded-lg p-2 transition hover:bg-[#10181c] hover:text-[#22ddeb] sm:inline-flex" aria-label="Help">
          <CircleHelp className="h-6 w-6" />
        </button>
        <button className="hidden rounded-lg p-2 transition hover:bg-[#10181c] hover:text-[#22ddeb] sm:inline-flex" aria-label="Applications">
          <Grid3X3 className="h-6 w-6" />
        </button>
        <div className="hidden h-14 w-px bg-[#1d3038] md:block" />
        <Link
          href="/pos"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#22ddeb] px-4 text-sm font-semibold text-black shadow-[0_6px_14px_rgba(34,221,235,0.24)] transition hover:bg-[#2ff4ff] sm:px-6 sm:text-base"
        >
          <Plus className="h-4 w-4" />
          New Order
        </Link>
        <Avatar
          name={userName}
          className="h-11 w-11"
        />
      </div>
    </header>
  );
}
