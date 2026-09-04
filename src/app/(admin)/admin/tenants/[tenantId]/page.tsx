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
  return <div><dt className="text-xs font-black uppercase tracking-[0.12em] text-[#000000]">{label}</dt><dd className="mt-1 break-all text-black">{value ?? "Not set"}</dd></div>;
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
      <Link href="/admin/tenants" className="text-sm font-semibold text-[#7c3aed]">Back to tenants</Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-black">{tenant.name}</h1>
          <p className="mt-2 text-sm text-[#000000]">{tenant.slug}</p>
        </div>
        <span className="rounded-full bg-[#f4ecff] px-3 py-1 text-xs font-bold text-[#7c3aed] ring-1 ring-[#d8c3ff]">{tenant.status ?? "active"}</span>
      </div>
      {notice ? <div className="rounded-lg border border-[#d8c3ff] bg-[#f4ecff] px-4 py-3 text-sm text-[#000000]">{notice}</div> : null}
      {query.error ? <div className="rounded-lg border border-[#d8c3ff] bg-[#f4ecff] px-4 py-3 text-sm text-[#000000]">Action failed.</div> : null}

      <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="rounded-lg border border-[#d8c3ff] bg-[#ffffff] p-6">
          <h2 className="text-lg font-semibold text-black">Business Info</h2>
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
        <div className="rounded-lg border border-[#d8c3ff] bg-[#ffffff] p-6">
          <h2 className="text-lg font-semibold text-black">Lifecycle</h2>
          {tenant.status === "suspended" ? (
            <form action={updateTenantStatusAction} className="mt-5">
              <input type="hidden" name="tenantId" value={tenant.id} />
              <input type="hidden" name="status" value="active" />
              <button className="h-11 w-full rounded-lg bg-[#7c3aed] text-sm font-semibold text-[#000000]">Reactivate Business</button>
            </form>
          ) : (
            <form action={updateTenantStatusAction} className="mt-5 space-y-4">
              <input type="hidden" name="tenantId" value={tenant.id} />
              <input type="hidden" name="status" value="suspended" />
              <label className="flex gap-3 text-sm text-[#000000]"><input required type="checkbox" name="confirm" value="yes" />Confirm suspension</label>
              <button className="h-11 w-full rounded-lg bg-[#f4ecff] text-sm font-semibold text-[#000000] ring-1 ring-[#d8c3ff]">Suspend Business</button>
            </form>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-[#d8c3ff] bg-[#ffffff]">
        <div className="border-b border-[#d8c3ff] p-5"><h2 className="text-lg font-semibold text-black">Users</h2></div>
        {users.length === 0 ? <div className="p-6 text-sm text-[#000000]">No users for this business.</div> : null}
        {users.map((user) => (
          <div key={user.id} className="grid gap-2 border-b border-[#d8c3ff] px-5 py-4 text-sm last:border-b-0 md:grid-cols-[1fr_160px_1.4fr]">
            <span className="font-semibold text-black">{user.name}</span>
            <span className="text-[#7c3aed]">{user.role}</span>
            <span className="break-all text-[#000000]">{user.email}</span>
          </div>
        ))}
      </section>
    </div>
  );
}
