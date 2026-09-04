import "server-only";
import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export function hasSuperAdminClaim(metadata: unknown) {
  return Boolean(metadata && typeof metadata === "object" && (metadata as { is_super_admin?: unknown }).is_super_admin === true);
}

export async function requireSuperAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    redirect("/login");
  }

  if (hasSuperAdminClaim(data.user.app_metadata)) {
    return data.user as User;
  }

  const { data: superAdmin, error: superAdminError } = await supabase
    .from("super_admins")
    .select("id")
    .eq("id", data.user.id)
    .maybeSingle<{ id: string }>();

  if (superAdminError || !superAdmin) {
    redirect("/login");
  }

  return data.user as User;
}
