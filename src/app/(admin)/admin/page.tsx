import type { Metadata } from "next";
import Link from "next/link";
import { Activity, Building2, MessageCircle, ShieldCheck, Users } from "lucide-react";
import { requireSuperAdmin } from "@/lib/admin/auth";
import { getAdminOverview } from "@/lib/admin/platform";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin | InChouf POS",
  description: "Platform administration for InChouf POS.",
};

export default async function AdminPage() {
  await requireSuperAdmin();
  const overview = await getAdminOverview();
  const stats = [
    { label: "Tenants", value: overview.tenants, icon: Building2, href: "/admin/tenants" },
    { label: "Users", value: overview.users, icon: Users, href: "/admin/users" },
    { label: "WhatsApp", value: overview.connectedWhatsApp, icon: MessageCircle, href: "/admin/tenants" },
    { label: "Health", value: overview.health, icon: Activity, href: "/admin/system-health" },
  ];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 p-5 lg:p-8">
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white">Platform Overview</h1>
          <p className="mt-2 text-sm text-[#9bb7c1]">Manage businesses, users, access, and platform readiness.</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-[#102229] px-3 py-1 text-xs font-bold text-[#22d3ee] ring-1 ring-[#1f3f49]">
          <ShieldCheck className="h-3.5 w-3.5" />
          Super Admin
        </span>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, href }) => (
          <Link key={label} href={href} className="rounded-lg border border-[#1f3f49] bg-[#0b171c] p-6 transition hover:border-[#22d3ee] hover:bg-[#102229]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-[#9bb7c1]">{label}</span>
              <Icon className="h-5 w-5 text-[#22d3ee]" />
            </div>
            <div className="mt-6 text-3xl font-black text-white">{value}</div>
          </Link>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="rounded-lg border border-[#1f3f49] bg-[#0b171c] p-6">
          <h2 className="text-lg font-semibold text-white">Admin Workflow</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Link href="/admin/tenants" className="rounded-lg bg-[#102229] p-4 text-sm font-semibold text-[#22d3ee] ring-1 ring-[#1f3f49]">Create Business</Link>
            <Link href="/admin/users" className="rounded-lg bg-[#102229] p-4 text-sm font-semibold text-[#22d3ee] ring-1 ring-[#1f3f49]">Review Users</Link>
            <Link href="/admin/system-health" className="rounded-lg bg-[#102229] p-4 text-sm font-semibold text-[#22d3ee] ring-1 ring-[#1f3f49]">Check Health</Link>
          </div>
        </div>
        <div className="rounded-lg border border-[#1f3f49] bg-[#0b171c] p-6">
          <h2 className="text-lg font-semibold text-white">Health Summary</h2>
          <p className="mt-3 text-sm leading-6 text-[#9bb7c1]">
            {overview.suspended > 0
              ? `${overview.suspended} suspended tenant${overview.suspended === 1 ? "" : "s"} need review.`
              : "Core platform checks are ready."}
          </p>
        </div>
      </section>
    </div>
  );
}
