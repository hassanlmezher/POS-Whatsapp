import Link from "next/link";
import { Search } from "lucide-react";
import { createBusinessAction } from "@/app/(admin)/admin/actions";
import { requireSuperAdmin } from "@/lib/admin/auth";
import { getAdminTenants } from "@/lib/admin/platform";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ q?: string; error?: string }> };

const errors: Record<string, string> = {
  "invalid-business": "Check business name, owner details, password, and trial length.",
  "duplicate-owner-email": "That owner email already belongs to another tenant.",
  "create-failed": "Business could not be created.",
};

function date(value: string | null) {
  return value ? new Date(value).toLocaleDateString() : "Not set";
}

function pill(value: string) {
  const tone =
    value === "active" || value === "connected"
      ? "text-[#7c3aed] ring-[#d8c3ff] bg-[#f4ecff]"
      : "text-[#000000] ring-[#d8c3ff] bg-[#ffffff]";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${tone}`}>{value}</span>;
}

export default async function AdminTenantsPage({ searchParams }: PageProps) {
  await requireSuperAdmin();
  const params = await searchParams;
  const tenants = await getAdminTenants(params.q ?? "");

  return (
    <div className="mx-auto grid max-w-7xl gap-6 p-5 lg:grid-cols-[1fr_360px] lg:p-8">
      <section className="space-y-5">
        <div>
          <h1 className="text-2xl font-black text-black">Tenants / Businesses</h1>
          <p className="mt-2 text-sm text-[#000000]">Search, inspect, and manage tenant onboarding.</p>
        </div>
        {params.error ? <div className="rounded-lg border border-[#d8c3ff] bg-[#f4ecff] px-4 py-3 text-sm text-[#000000]">{errors[params.error] ?? "Action failed."}</div> : null}
        <form className="flex gap-3">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7c3aed]" />
            <input name="q" defaultValue={params.q ?? ""} placeholder="Search businesses or owners" className="h-11 w-full rounded-lg border border-[#d8c3ff] bg-[#ffffff] pl-10 pr-3 text-sm text-black outline-none placeholder:text-black/45 focus:border-[#7c3aed]" />
          </label>
          <button className="h-11 rounded-lg bg-[#7c3aed] px-4 text-sm font-semibold text-[#000000]">Search</button>
        </form>
        <div className="overflow-hidden rounded-lg border border-[#d8c3ff] bg-[#ffffff]">
          <div className="grid grid-cols-[1.2fr_1fr_80px_120px_120px_100px] gap-4 border-b border-[#d8c3ff] bg-[#f4ecff] px-5 py-3 text-xs font-black uppercase tracking-[0.12em] text-[#000000] max-xl:hidden">
            <span>Business</span><span>Owner</span><span>Users</span><span>WhatsApp</span><span>Trial</span><span>Status</span>
          </div>
          {tenants.length === 0 ? <div className="p-8 text-sm text-[#000000]">No businesses found.</div> : null}
          {tenants.map((tenant) => (
            <Link key={tenant.id} href={`/admin/tenants/${tenant.id}`} className="grid gap-3 border-b border-[#d8c3ff] px-5 py-4 text-sm text-[#000000] transition last:border-b-0 hover:bg-[#f4ecff] xl:grid-cols-[1.2fr_1fr_80px_120px_120px_100px] xl:items-center">
              <span><strong className="block text-black">{tenant.name}</strong><span className="text-[#000000]">{tenant.slug}</span></span>
              <span className="text-[#000000]"><strong className="block font-semibold text-black">{tenant.owner?.name ?? "No owner"}</strong>{tenant.ownerEmail ?? ""}</span>
              <span className="text-black">{tenant.userCount}</span>
              <span>{pill(tenant.whatsappStatus)}</span>
              <span className="text-[#000000]">{date(tenant.trial_ends_at)}</span>
              <span>{pill(tenant.status ?? "active")}</span>
            </Link>
          ))}
        </div>
      </section>
      <aside className="rounded-lg border border-[#d8c3ff] bg-[#ffffff] p-6">
        <h2 className="text-lg font-semibold text-black">Create Business</h2>
        <form action={createBusinessAction} className="mt-5 space-y-4">
          <input name="businessName" required minLength={2} placeholder="Business name" className="h-11 w-full rounded-lg border border-[#d8c3ff] bg-[#ffffff] px-3 text-sm text-black outline-none placeholder:text-black/45 focus:border-[#7c3aed]" />
          <input name="ownerName" required minLength={2} placeholder="Owner full name" className="h-11 w-full rounded-lg border border-[#d8c3ff] bg-[#ffffff] px-3 text-sm text-black outline-none placeholder:text-black/45 focus:border-[#7c3aed]" />
          <input name="ownerEmail" required type="email" placeholder="Owner email" className="h-11 w-full rounded-lg border border-[#d8c3ff] bg-[#ffffff] px-3 text-sm text-black outline-none placeholder:text-black/45 focus:border-[#7c3aed]" />
          <input name="password" required type="password" minLength={8} placeholder="Initial password" className="h-11 w-full rounded-lg border border-[#d8c3ff] bg-[#ffffff] px-3 text-sm text-black outline-none placeholder:text-black/45 focus:border-[#7c3aed]" />
          <input name="trialDays" required type="number" min={1} max={365} defaultValue={14} className="h-11 w-full rounded-lg border border-[#d8c3ff] bg-[#ffffff] px-3 text-sm text-black outline-none focus:border-[#7c3aed]" />
          <button className="h-11 w-full rounded-lg bg-[#7c3aed] text-sm font-semibold text-[#000000]">Create Business</button>
        </form>
      </aside>
    </div>
  );
}
