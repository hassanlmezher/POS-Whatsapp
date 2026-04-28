"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeDollarSign,
  ClipboardList,
  Inbox,
  LayoutDashboard,
  Settings,
  Store,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pos", label: "POS", icon: BadgeDollarSign },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/orders", label: "Orders", icon: ClipboardList },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[270px] flex-col border-r border-slate-200 bg-white lg:flex">
      <div className="flex h-28 items-center gap-3 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 text-white">
          <Store className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xl font-black tracking-tight text-slate-950">Merchant OS</div>
          <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">Retail Management</div>
        </div>
      </div>

      <nav className="mt-3 flex-1 space-y-1">
        {nav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex h-14 items-center gap-4 px-6 text-sm font-medium text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-600",
                active && "bg-emerald-50 text-emerald-600",
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
              {active ? <span className="absolute right-0 h-full w-1 bg-emerald-500" /> : null}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 p-6">
        <div className="flex items-center gap-3">
          <Avatar name="Alex Merchant" src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=120&q=80" />
          <div>
            <div className="text-sm font-bold text-slate-950">Alex Merchant</div>
            <div className="text-xs text-slate-500">Store Manager</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function MobileNav() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-slate-200 bg-white lg:hidden">
      {nav.map((item) => {
        const Icon = item.icon;

        return (
          <Link key={item.href} href={item.href} className="flex flex-col items-center gap-1 py-2 text-[10px] text-slate-500">
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
