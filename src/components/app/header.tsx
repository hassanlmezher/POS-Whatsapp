"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CircleHelp, Grid3X3, Plus } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";

const pageContext: Record<string, { title: string; description: string }> = {
  "/dashboard": {
    title: "Dashboard",
    description: "Monitor sales, conversations, and daily store performance.",
  },
  "/inbox": {
    title: "Inbox",
    description: "Reply to WhatsApp customers and manage active conversations.",
  },
  "/customers": {
    title: "Customers",
    description: "View customer profiles, order history, and contact details.",
  },
  "/orders": {
    title: "Orders",
    description: "Track sales, payments, fulfillment, and order details.",
  },
  "/pos": {
    title: "Make Order",
    description: "Build a cart, choose payment, and complete checkout.",
  },
  "/products": {
    title: "Product Catalog",
    description: "Browse tenant products available for checkout.",
  },
  "/inventory": {
    title: "Inventory",
    description: "Manage products, categories, stock, and catalog setup.",
  },
  "/settings": {
    title: "Settings",
    description: "Configure your business workspace and operating preferences.",
  },
};

function getPageContext(pathname: string, fallbackTitle?: string) {
  const directMatch = pageContext[pathname];
  if (directMatch) {
    return directMatch;
  }

  const section = Object.keys(pageContext)
    .filter((path) => path !== "/")
    .sort((a, b) => b.length - a.length)
    .find((path) => pathname.startsWith(`${path}/`));

  if (section) {
    return pageContext[section];
  }

  return {
    title: fallbackTitle ?? "InChouf POS",
    description: "Your secure business workspace is ready.",
  };
}

export function Header({
  title,
  userAvatarUrl,
  userName,
}: {
  title?: string;
  userAvatarUrl?: string | null;
  userName: string;
}) {
  const pathname = usePathname();
  const context = getPageContext(pathname, title);

  return (
    <header className="sticky top-0 z-20 flex h-[98px] items-center justify-between gap-4 border-b border-[#1d3038] bg-[#050809]/95 px-4 backdrop-blur lg:px-8">
      <div className="min-w-0">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#22ddeb]">
          InChouf POS
        </p>
        <h1 className="mt-1 truncate text-xl font-black text-[#f8fbff] sm:text-2xl">
          {context.title}
        </h1>
        <p className="mt-1 hidden max-w-[560px] truncate text-sm text-[#8fa3ad] md:block">
          {context.description}
        </p>
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
          src={userAvatarUrl}
          className="h-11 w-11"
        />
      </div>
    </header>
  );
}
