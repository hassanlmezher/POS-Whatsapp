import Link from "next/link";
import { notFound } from "next/navigation";
import { updateTenantStatusAction } from "@/app/(admin)/admin/actions";
import { requireSuperAdmin } from "@/lib/admin/auth";
import { getAdminTenant } from "@/lib/admin/platform";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<{ created?: string; updated?: string; error?: string }>;
};

function date(value: string | null) {
  return value ? new Date(value).toLocaleString() : "Not set";
}

function row(label: string, value: string | number | null | undefined) {
  return <div><dt className="text-xs font-black uppercase tracking-[0.12em] text-[#9bb7c1]">{label}</dt><dd className="mt-1 break-all text-white">{value ?? "Not set"}</dd></div>;
}

export default async function AdminTenantDetailPage({ params, searchParams }: PageProps) {
  await requireSuperAdmin();
  const [{ tenantId }, query] = await Promise.all([params, searchParams]);
  const details = await getAdminTenant(tenantId);
  if (!details) notFound();
  const { tenant, owner, users, whatsapp } = details;
  const notice = query.created === "business" ? "Business created." : query.updated === "status" ? "Status updated." : null;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-5 lg:p-8">
      <Link href="/admin/tenants" className="text-sm font-semibold text-[#22d3ee]">Back to tenants</Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">{tenant.name}</h1>
          <p className="mt-2 text-sm text-[#9bb7c1]">{tenant.slug}</p>
        </div>
        <span className="rounded-full bg-[#102229] px-3 py-1 text-xs font-bold text-[#22d3ee] ring-1 ring-[#1f3f49]">{tenant.status ?? "active"}</span>
      </div>
      {notice ? <div className="rounded-lg border border-[#1f3f49] bg-[#102229] px-4 py-3 text-sm text-[#c9f7ff]">{notice}</div> : null}
      {query.error ? <div className="rounded-lg border border-[#7f1d1d] bg-[#2b1111] px-4 py-3 text-sm text-[#fecaca]">Action failed.</div> : null}

      <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="rounded-lg border border-[#1f3f49] bg-[#0b171c] p-6">
          <h2 className="text-lg font-semibold text-white">Business Info</h2>
          <dl className="mt-5 grid gap-5 sm:grid-cols-2">
            {row("Owner", owner ? `${owner.name} (${owner.email})` : "No owner")}
            {row("Users", users.length)}
            {row("Created", date(tenant.created_at))}
            {row("Updated", date(tenant.updated_at))}
            {row("Subscription", tenant.subscription_status ?? "trialing")}
            {row("Trial Ends", date(tenant.trial_ends_at))}
            {row("WhatsApp", whatsapp?.status ?? "disconnected")}
            {row("WhatsApp Number", whatsapp?.phone_number)}
          </dl>
        </div>
        <div className="rounded-lg border border-[#1f3f49] bg-[#0b171c] p-6">
          <h2 className="text-lg font-semibold text-white">Lifecycle</h2>
          {tenant.status === "suspended" ? (
            <form action={updateTenantStatusAction} className="mt-5">
              <input type="hidden" name="tenantId" value={tenant.id} />
              <input type="hidden" name="status" value="active" />
              <button className="h-11 w-full rounded-lg bg-[#22d3ee] text-sm font-semibold text-[#061115]">Reactivate Business</button>
            </form>
          ) : (
            <form action={updateTenantStatusAction} className="mt-5 space-y-4">
              <input type="hidden" name="tenantId" value={tenant.id} />
              <input type="hidden" name="status" value="suspended" />
              <label className="flex gap-3 text-sm text-[#9bb7c1]"><input required type="checkbox" name="confirm" value="yes" />Confirm suspension</label>
              <button className="h-11 w-full rounded-lg bg-[#2b1111] text-sm font-semibold text-[#fecaca] ring-1 ring-[#7f1d1d]">Suspend Business</button>
            </form>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-[#1f3f49] bg-[#0b171c]">
        <div className="border-b border-[#1f3f49] p-5"><h2 className="text-lg font-semibold text-white">Users</h2></div>
        {users.length === 0 ? <div className="p-6 text-sm text-[#9bb7c1]">No users for this business.</div> : null}
        {users.map((user) => (
          <div key={user.id} className="grid gap-2 border-b border-[#1f3f49] px-5 py-4 text-sm last:border-b-0 md:grid-cols-[1fr_160px_1.4fr]">
            <span className="font-semibold text-white">{user.name}</span>
            <span className="text-[#22d3ee]">{user.role}</span>
            <span className="break-all text-[#9bb7c1]">{user.email}</span>
          </div>
        ))}
      </section>
    </div>
  );
}
