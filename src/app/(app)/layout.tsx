import type React from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/app-shell";
import {
  AuthenticationRequiredError,
  getTenantContext,
  TenantMembershipRequiredError,
} from "@/lib/tenant-context";

export default async function MerchantLayout({ children }: { children: React.ReactNode }) {
  const { membership } = await loadTenantContext();

  return (
    <AppShell userName={membership.name}>
      {children}
    </AppShell>
  );
}

async function loadTenantContext() {
  try {
    return await getTenantContext();
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      redirect("/login");
    }

    if (error instanceof TenantMembershipRequiredError) {
      redirect("/login?error=missing-membership");
    }

    throw error;
  }
}
