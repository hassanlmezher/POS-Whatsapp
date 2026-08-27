import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/app/login/login-form";
import {
  AuthenticationRequiredError,
  getTenantContext,
  TenantMembershipRequiredError,
} from "@/lib/tenant-context";

export const metadata: Metadata = {
  title: "Sign In | InChoufPOS",
  description: "Sign in to your InChoufPOS business workspace.",
};

type LoginPageProps = {
  searchParams: Promise<{ error?: string | string[] }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  let hasTenantContext = false;

  try {
    await getTenantContext();
    hasTenantContext = true;
  } catch (error) {
    if (!(error instanceof AuthenticationRequiredError) && !(error instanceof TenantMembershipRequiredError)) {
      throw error;
    }
  }

  if (hasTenantContext) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const queryError = Array.isArray(params.error) ? params.error[0] : params.error;
  const initialError =
    queryError === "missing-membership"
      ? "This account is not linked to a business workspace. Contact your administrator."
      : null;

  return <LoginForm initialError={initialError} year={new Date().getFullYear()} />;
}
