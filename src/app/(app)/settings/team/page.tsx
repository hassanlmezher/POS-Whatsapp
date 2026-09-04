import { redirect } from "next/navigation";
import { ShieldCheck, UsersRound } from "lucide-react";
import { updateTeamMemberRole } from "@/app/(app)/settings/team/actions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getTenantContext } from "@/lib/tenant-context";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";

export const dynamic = "force-dynamic";

type TeamPageProps = {
  searchParams: Promise<{ updated?: string; error?: string }>;
};

type TeamMember = {
  id: string;
  auth_user_id: string;
  name: string;
  role: string;
  avatar_url: string | null;
  created_at: string | null;
};

type Role = {
  id: string;
  name: string;
  is_system: boolean;
};

const errorMessages: Record<string, string> = {
  "invalid-role": "Choose a valid role.",
  "permission-denied": "You do not have permission to manage team roles.",
  "update-failed": "Team member role could not be updated.",
};

function hasTeamManagePermission(metadata: unknown, tenantId: string) {
  if (!metadata || typeof metadata !== "object") {
    return false;
  }

  const claims = metadata as { permissions?: unknown; tenant_id?: unknown };
  return claims.tenant_id === tenantId && Array.isArray(claims.permissions) && claims.permissions.includes("team:manage");
}

function formatRole(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export default async function TeamSettingsPage({ searchParams }: TeamPageProps) {
  const [{ tenant, user }, params] = await Promise.all([getTenantContext(), searchParams]);

  if (!hasTeamManagePermission(user.app_metadata, tenant.id)) {
    redirect("/login");
  }

  const supabase = createSupabaseAdminClient();
  const [{ data: members, error: membersError }, { data: roles, error: rolesError }] = await Promise.all([
    supabase
      .from("tenant_users")
      .select("id,auth_user_id,name,role,avatar_url,created_at")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: true })
      .returns<TeamMember[]>(),
    supabase
      .from("roles")
      .select("id,name,is_system")
      .eq("tenant_id", tenant.id)
      .eq("is_system", true)
      .order("is_system", { ascending: false })
      .order("name", { ascending: true })
      .returns<Role[]>(),
  ]);

  if (membersError || rolesError) {
    throw new Error(membersError?.message ?? rolesError?.message ?? "Team lookup failed");
  }

  const successMessage = params.updated === "role" ? "Role updated." : null;
  const errorMessage = params.error ? errorMessages[params.error] ?? "Team settings could not be updated." : null;

  return (
    <div className="space-y-6 p-5 lg:p-8">
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#000000]">Team Management</h1>
          <p className="mt-2 text-[#000000]">Manage employee access for {tenant.name}.</p>
        </div>
        <Badge tone="cyan" className="gap-2">
          <ShieldCheck className="h-3.5 w-3.5" />
          team:manage
        </Badge>
      </section>

      {successMessage ? <div className="rounded-lg border border-[#7c3aed]/35 bg-[#f4ecff] px-4 py-3 text-sm text-black">{successMessage}</div> : null}
      {errorMessage ? <div className="rounded-lg border border-[#7c3aed] bg-[#f4ecff] px-4 py-3 text-sm text-[#6d28d9]">{errorMessage}</div> : null}

      <Card className="overflow-hidden">
        <div className="flex items-center gap-3 border-b border-[#d8c3ff] p-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f4ecff] text-[#7c3aed] ring-1 ring-[#7c3aed]/40">
            <UsersRound className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-black">Employees</h2>
            <p className="text-sm text-[#000000]">{members?.length ?? 0} tenant member(s)</p>
          </div>
        </div>

        <div className="divide-y divide-[#d8c3ff]">
          {(members ?? []).map((member) => (
            <form key={member.id} action={updateTeamMemberRole} className="grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_260px_120px] md:items-center">
              <input type="hidden" name="membershipId" value={member.id} />
              <div className="flex min-w-0 items-center gap-4">
                <Avatar name={member.name} src={member.avatar_url} />
                <div className="min-w-0">
                  <div className="truncate font-semibold text-black">{member.name}</div>
                  <div className="truncate text-sm text-[#000000]">{member.auth_user_id}</div>
                </div>
                <Badge tone="slate">{formatRole(member.role)}</Badge>
              </div>
              <select name="roleId" defaultValue={(roles ?? []).find((role) => role.name === member.role)?.id} className="h-11 rounded-lg border border-[#d8c3ff] bg-[#ffffff] px-3 text-sm text-black outline-none focus:border-[#7c3aed] focus:ring-4 focus:ring-[#7c3aed]/15">
                {(roles ?? []).map((role) => (
                  <option key={role.id} value={role.id}>
                    {formatRole(role.name)}
                  </option>
                ))}
              </select>
              <SubmitButton pendingText="Saving..." className="h-11 rounded-lg bg-[#7c3aed] px-4 text-sm font-semibold text-black transition hover:bg-[#6d28d9]">
                Save
              </SubmitButton>
            </form>
          ))}
        </div>
      </Card>
    </div>
  );
}
