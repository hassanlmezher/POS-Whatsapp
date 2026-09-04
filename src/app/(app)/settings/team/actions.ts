"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getTenantContext } from "@/lib/tenant-context";

const updateRoleSchema = z.object({
  membershipId: z.string().uuid(),
  roleId: z.string().uuid(),
});

function hasTeamManagePermission(metadata: unknown, tenantId: string) {
  if (!metadata || typeof metadata !== "object") {
    return false;
  }

  const claims = metadata as { permissions?: unknown; tenant_id?: unknown };
  return claims.tenant_id === tenantId && Array.isArray(claims.permissions) && claims.permissions.includes("team:manage");
}

export async function updateTeamMemberRole(formData: FormData) {
  const parsed = updateRoleSchema.safeParse({
    membershipId: formData.get("membershipId"),
    roleId: formData.get("roleId"),
  });

  if (!parsed.success) {
    redirect("/settings/team?error=invalid-role");
  }

  const { tenant, user } = await getTenantContext();

  if (!hasTeamManagePermission(user.app_metadata, tenant.id)) {
    redirect("/login");
  }

  const supabase = createSupabaseAdminClient();
  const { data: role, error: roleError } = await supabase
    .from("roles")
    .select("id,name")
    .eq("id", parsed.data.roleId)
    .eq("tenant_id", tenant.id)
    .eq("is_system", true)
    .single<{ id: string; name: string }>();

  if (roleError || !role) {
    redirect("/settings/team?error=invalid-role");
  }

  const { error } = await supabase
    .from("tenant_users")
    .update({ role: role.name, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.membershipId)
    .eq("tenant_id", tenant.id);

  if (error) {
    redirect("/settings/team?error=update-failed");
  }

  revalidatePath("/settings/team");
  redirect("/settings/team?updated=role");
}
