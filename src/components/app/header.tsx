"use client";

import { Bell, CircleHelp, Grid3X3, Plus } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function Header({ title }: { title?: string }) {
  return (
    <header className="sticky top-0 z-20 flex h-[98px] items-center justify-between border-b border-[#d9deea] bg-white px-8">
      <div className="w-full max-w-[520px]">
        <Input icon placeholder={`Search orders, customers, or ${title ? title.toLowerCase() : "messages"} (CMD+K)`} />
      </div>

      <div className="flex items-center gap-5 text-[#536884]">
        <button className="rounded-lg p-2 transition hover:bg-[#f4f7fb] hover:text-[#0b4edb]" aria-label="Notifications">
          <Bell className="h-6 w-6" />
        </button>
        <button className="rounded-lg p-2 transition hover:bg-[#f4f7fb] hover:text-[#0b4edb]" aria-label="Help">
          <CircleHelp className="h-6 w-6" />
        </button>
        <button className="rounded-lg p-2 transition hover:bg-[#f4f7fb] hover:text-[#0b4edb]" aria-label="Applications">
          <Grid3X3 className="h-6 w-6" />
        </button>
        <div className="h-14 w-px bg-[#d9deea]" />
        <Button className="h-12 rounded-lg px-6 text-base">
          <Plus className="h-4 w-4" />
          New Order
        </Button>
        <Avatar
          name="Alex Merchant"
          src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=120&q=80"
          className="h-11 w-11"
        />
      </div>
    </header>
  );
}
