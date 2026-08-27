import { redirect } from "next/navigation";
import {
  AuthenticationRequiredError,
  getTenantContext,
  TenantMembershipRequiredError,
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

    throw error;
  }

  redirect("/dashboard");
}
