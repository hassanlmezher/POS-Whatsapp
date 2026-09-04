import { Activity, Database, ShieldCheck } from "lucide-react";
import { requireSuperAdmin } from "@/lib/admin/auth";
import { getAdminOverview } from "@/lib/admin/platform";

export const dynamic = "force-dynamic";

export default async function AdminSystemHealthPage() {
  await requireSuperAdmin();
  const overview = await getAdminOverview();
  const checks = [
    { label: "Database", value: "Reachable", icon: Database },
    { label: "RBAC", value: "Configured", icon: ShieldCheck },
    { label: "Suspended Tenants", value: String(overview.suspended), icon: Activity },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-5 lg:p-8">
      <div>
        <h1 className="text-2xl font-black text-black">System Health</h1>
        <p className="mt-2 text-sm text-[#000000]">Operational checks based on current platform data.</p>
      </div>
      <section className="grid gap-4 md:grid-cols-3">
        {checks.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-lg border border-[#d8c3ff] bg-[#ffffff] p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-[#000000]">{label}</span>
              <Icon className="h-5 w-5 text-[#7c3aed]" />
            </div>
            <div className="mt-6 text-2xl font-black text-black">{value}</div>
          </div>
        ))}
      </section>
    </div>
  );
}
