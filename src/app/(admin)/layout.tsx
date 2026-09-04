import type React from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    redirect("/login");
  }

  const hasSuperAdminClaim = data.user.app_metadata?.is_super_admin === true;

  if (!hasSuperAdminClaim) {
    const { data: superAdmin, error: superAdminError } = await supabase
      .from("super_admins")
      .select("id")
      .eq("id", data.user.id)
      .maybeSingle<{ id: string }>();

    if (superAdminError || !superAdmin) {
      redirect("/login");
    }
  }

  return <main className="min-h-screen bg-[#030607] text-[#f8fbff]">{children}</main>;
}
