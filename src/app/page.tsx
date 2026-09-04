import { redirect } from "next/navigation";
import {
  AuthenticationRequiredError,
  getTenantContext,
  TenantMembershipRequiredError,
  TenantSuspendedError,
} from "@/lib/tenant-context";

export default async function Home() {
  try {
    await getTenantContext();
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      redirect("/login");
    }

    if (error instanceof TenantMembershipRequiredError) {
      redirect("/login?error=missing-membership");
    }

    if (error instanceof TenantSuspendedError) {
      redirect("/login?error=tenant-suspended");
    }

    throw error;
  }

  redirect("/dashboard");
}
