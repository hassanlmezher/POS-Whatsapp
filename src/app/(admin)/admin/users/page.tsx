import { Search } from "lucide-react";
import { requireSuperAdmin } from "@/lib/admin/auth";
import { getAdminUsers } from "@/lib/admin/platform";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ q?: string }> };

function pill(value: string) {
  const active = value === "Active";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${active ? "bg-[#102229] text-[#22d3ee] ring-[#1f3f49]" : "bg-[#2b1111] text-[#fecaca] ring-[#7f1d1d]"}`}>{value}</span>;
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
  await requireSuperAdmin();
  const params = await searchParams;
  const users = await getAdminUsers(params.q ?? "");

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-5 lg:p-8">
      <div>
        <h1 className="text-2xl font-black text-white">Users</h1>
        <p className="mt-2 text-sm text-[#9bb7c1]">Platform membership view without sensitive auth/session data.</p>
      </div>
      <form className="flex gap-3">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#22d3ee]" />
          <input name="q" defaultValue={params.q ?? ""} placeholder="Search users, email, or tenant" className="h-11 w-full rounded-lg border border-[#1f3f49] bg-[#071115] pl-10 pr-3 text-sm text-white outline-none placeholder:text-[#58717a] focus:border-[#22d3ee]" />
        </label>
        <button className="h-11 rounded-lg bg-[#22d3ee] px-4 text-sm font-semibold text-[#061115]">Search</button>
      </form>
      <div className="overflow-hidden rounded-lg border border-[#1f3f49] bg-[#0b171c]">
        <div className="grid grid-cols-[1fr_1.3fr_1fr_120px_100px] gap-4 border-b border-[#1f3f49] bg-[#102229] px-5 py-3 text-xs font-black uppercase tracking-[0.12em] text-[#9bb7c1] max-lg:hidden">
          <span>Name</span><span>Email</span><span>Tenant</span><span>Role</span><span>Status</span>
        </div>
        {users.length === 0 ? <div className="p-8 text-sm text-[#9bb7c1]">No users found.</div> : null}
        {users.map((user) => (
          <div key={user.id} className="grid gap-2 border-b border-[#1f3f49] px-5 py-4 text-sm last:border-b-0 lg:grid-cols-[1fr_1.3fr_1fr_120px_100px] lg:items-center">
            <span className="font-semibold text-white">{user.name}</span>
            <span className="break-all text-[#9bb7c1]">{user.email}</span>
            <span className="text-white">{user.tenantName}</span>
            <span className="text-[#22d3ee]">{user.role}</span>
            <span>{pill(user.status)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
