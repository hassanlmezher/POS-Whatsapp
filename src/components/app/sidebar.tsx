"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CircleHelp,
  ClipboardList,
  Inbox,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  Store,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/orders", label: "Orders", icon: ClipboardList },
  { href: "/pos", label: "Products", icon: Package },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[300px] flex-col border-r border-[#d9deea] bg-white lg:flex">
      <Link href="/dashboard" className="flex h-[98px] items-center gap-4 px-7">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#0b4edb] text-white shadow-[0_8px_18px_rgba(11,78,219,0.22)]">
          <Store className="h-5 w-5" />
        </div>
        <div>
          <div className="text-[25px] font-black leading-6 tracking-[-0.04em] text-[#080c1a]">Merchant OS</div>
          <div className="mt-2 text-[11px] font-black uppercase tracking-[0.24em] text-[#95a0b5]">Enterprise Portal</div>
        </div>
      </Link>

      <nav className="mt-5 flex-1 space-y-1 px-5">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-[52px] items-center gap-4 rounded-lg px-4 text-[17px] font-medium text-[#536884] transition hover:bg-[#f4f7fb] hover:text-[#0b4edb]",
                active && "bg-[#f5f7fb] text-[#0052ff]",
              )}
            >
              <Icon className="h-[22px] w-[22px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mx-5 border-t border-[#e6ebf3] py-6">
        <button className="flex h-12 w-full items-center gap-4 rounded-lg px-4 text-left text-[17px] font-medium text-[#536884] hover:bg-[#f4f7fb]">
          <CircleHelp className="h-[22px] w-[22px]" />
          Help Support
        </button>
        <button className="flex h-12 w-full items-center gap-4 rounded-lg px-4 text-left text-[17px] font-medium text-[#536884] hover:bg-[#f4f7fb]">
          <LogOut className="h-[22px] w-[22px]" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-[#d9deea] bg-white lg:hidden">
      {nav.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1 py-2 text-[10px] text-[#536884]",
              active && "bg-[#f5f7fb] text-[#0052ff]",
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
