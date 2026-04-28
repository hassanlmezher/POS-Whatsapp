"use client";

import { Bell, CircleHelp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";

export function Header({ title }: { title?: string }) {
  return (
    <header className="sticky top-0 z-20 flex h-[67px] items-center justify-between border-b border-slate-200 bg-white/95 px-5 backdrop-blur lg:px-8">
      <div className="flex min-w-0 flex-1 items-center gap-6">
        {title ? <h1 className="hidden text-xl font-black text-slate-950 md:block">{title}</h1> : null}
        <div className="w-full max-w-[480px]">
          <Input icon placeholder="Search orders, customers, or items..." />
        </div>
      </div>
      <div className="flex items-center gap-3 text-slate-600">
        <button className="relative rounded-xl p-2 hover:bg-slate-100" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-red-500" />
        </button>
        <button className="rounded-xl p-2 hover:bg-slate-100" aria-label="Help">
          <CircleHelp className="h-5 w-5" />
        </button>
        <div className="mx-2 h-8 w-px bg-slate-200" />
        <span className="hidden rounded-full bg-emerald-100 px-4 py-1.5 text-xs font-black text-emerald-800 md:block">
          GreenStore POS
        </span>
        <Avatar name="Alex Merchant" src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=120&q=80" className="h-9 w-9" />
      </div>
    </header>
  );
}
