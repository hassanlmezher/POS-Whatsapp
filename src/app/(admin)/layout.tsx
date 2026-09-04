import type React from "react";
import Link from "next/link";
import { Activity, Building2, LayoutDashboard, Users } from "lucide-react";
import { requireSuperAdmin } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireSuperAdmin();
  const nav = [
    { href: "/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/admin/tenants", label: "Tenants", icon: Building2 },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/system-health", label: "System Health", icon: Activity },
  ];

  return (
    <main className="min-h-screen bg-[#ffffff] text-black">
      <div className="border-b border-[#d8c3ff] bg-[#ffffff]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4 lg:px-8">
          <Link href="/admin" className="text-lg font-black text-black">InChouf Admin</Link>
          <nav className="flex flex-wrap gap-2">
            {nav.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className="inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-[#000000] transition hover:bg-[#f4ecff] hover:text-[#7c3aed]">
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
      {children}
    </main>
  );
}
