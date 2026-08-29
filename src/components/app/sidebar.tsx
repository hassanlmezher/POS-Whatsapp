"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  CircleHelp,
  ClipboardList,
  Inbox,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  Users,
} from "lucide-react";
import { LoadingScreen } from "@/components/app/loading-screen";
import { cn } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const APP_NAME = "InChouf POS";
const UNREAD_POLL_INTERVAL_MS = 5000;

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/orders", label: "Orders", icon: ClipboardList },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/settings", label: "Settings", icon: Settings },
];

function useUnreadInboxCount(isInboxActive: boolean) {
  const [unreadInboxCount, setUnreadInboxCount] = useState(0);

  const refreshUnreadInboxCount = useCallback(async () => {
    try {
      const response = await fetch("/api/inbox/unread", { cache: "no-store" });

      if (!response.ok) {
        return;
      }

      const payload = await response.json() as { unreadConversationCount?: number };
      setUnreadInboxCount(Number(payload.unreadConversationCount ?? 0));
    } catch {
      // Keep the last known count if the lightweight background refresh fails.
    }
  }, []);

  useEffect(() => {
    const initialRefreshId = window.setTimeout(() => {
      void refreshUnreadInboxCount();
    }, 0);
    const intervalId = window.setInterval(() => {
      void refreshUnreadInboxCount();
    }, UNREAD_POLL_INTERVAL_MS);

    function handleVisibilityRefresh() {
      if (document.visibilityState === "visible") {
        void refreshUnreadInboxCount();
      }
    }

    window.addEventListener("focus", refreshUnreadInboxCount);
    document.addEventListener("visibilitychange", handleVisibilityRefresh);

    return () => {
      window.clearTimeout(initialRefreshId);
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshUnreadInboxCount);
      document.removeEventListener("visibilitychange", handleVisibilityRefresh);
    };
  }, [refreshUnreadInboxCount]);

  useEffect(() => {
    if (isInboxActive) {
      return;
    }

    const routeRefreshId = window.setTimeout(() => {
      void refreshUnreadInboxCount();
    }, 0);

    return () => {
      window.clearTimeout(routeRefreshId);
    };
  }, [isInboxActive, refreshUnreadInboxCount]);

  return isInboxActive ? 0 : unreadInboxCount;
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const isInboxActive = pathname === "/inbox" || pathname.startsWith("/inbox/");
  const unreadInboxCount = useUnreadInboxCount(isInboxActive);

  async function signOut() {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);

    try {
      const { error } = await createSupabaseBrowserClient().auth.signOut();

      if (error) {
        throw error;
      }

      router.replace("/login");
      router.refresh();
    } catch {
      setIsSigningOut(false);
    }
  }

  return (
    <>
      {isSigningOut ? <LoadingScreen message="Signing you out..." /> : null}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[300px] flex-col border-r border-[#1d3038] bg-[#050809] lg:flex">
        <Link href="/dashboard" className="flex h-[112px] items-center gap-4 px-6">
          <Image
            src="/inchouf-pos-mark.png"
            alt={APP_NAME}
            width={64}
            height={64}
            priority
            className="h-16 w-16 shrink-0 rounded-lg bg-black object-cover ring-1 ring-[#22ddeb]/30 shadow-[0_12px_28px_rgba(34,221,235,0.16)]"
          />
          <div className="min-w-0">
            <div className="max-w-[190px] truncate text-[21px] font-black leading-6 text-[#f8fbff]">{APP_NAME}</div>
            <div className="mt-2 text-[11px] font-black uppercase tracking-[0.24em] text-[#95a0b5]">Enterprise Portal</div>
          </div>
        </Link>

        <nav className="mt-5 flex-1 space-y-1 px-5">
          {nav.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              pathname.startsWith(`${item.href}/`) ||
              (item.href === "/inventory" && pathname === "/pos");

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex h-[52px] items-center gap-4 rounded-lg px-4 text-[17px] font-medium text-[#8fa3ad] transition hover:bg-[#10181c] hover:text-[#22ddeb]",
                  active && "bg-[#0d1519] text-[#22ddeb]",
                )}
              >
                <Icon className="h-[22px] w-[22px]" />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.href === "/inbox" && !isInboxActive && unreadInboxCount > 0 ? (
                  <span className="ml-auto inline-flex min-w-6 items-center justify-center rounded-full bg-[#22ddeb] px-2 py-0.5 text-xs font-black text-black shadow-[0_0_16px_rgba(34,221,235,0.35)]">
                    {unreadInboxCount > 99 ? "99+" : unreadInboxCount}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="mx-5 border-t border-[#18282e] py-6">
          <button className="flex h-12 w-full items-center gap-4 rounded-lg px-4 text-left text-[17px] font-medium text-[#8fa3ad] hover:bg-[#10181c]">
            <CircleHelp className="h-[22px] w-[22px]" />
            Help Support
          </button>
          <button
            onClick={signOut}
            disabled={isSigningOut}
            className="flex h-12 w-full items-center gap-4 rounded-lg px-4 text-left text-[17px] font-medium text-[#8fa3ad] hover:bg-[#10181c] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogOut className="h-[22px] w-[22px]" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const isInboxActive = pathname === "/inbox" || pathname.startsWith("/inbox/");
  const unreadInboxCount = useUnreadInboxCount(isInboxActive);

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-[#1d3038] bg-[#050809] lg:hidden">
      {nav.map((item) => {
        const Icon = item.icon;
        const active =
          pathname === item.href ||
          pathname.startsWith(`${item.href}/`) ||
          (item.href === "/inventory" && pathname === "/pos");

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1 py-2 text-[10px] text-[#8fa3ad]",
              active && "bg-[#0d1519] text-[#22ddeb]",
            )}
          >
            <span className="relative">
              <Icon className="h-4 w-4" />
              {item.href === "/inbox" && !isInboxActive && unreadInboxCount > 0 ? (
                <span className="absolute -right-3 -top-2 inline-flex min-w-4 items-center justify-center rounded-full bg-[#22ddeb] px-1 text-[9px] font-black leading-4 text-black">
                  {unreadInboxCount > 99 ? "99+" : unreadInboxCount}
                </span>
              ) : null}
            </span>
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
