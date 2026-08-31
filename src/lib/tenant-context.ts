import "server-only";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type Tenant = {
  id: string;
  name: string;
  slug: string;
  currency: string;
  taxRate: number;
  timezone: string | null;
  whatsappPhoneNumber: string | null;
  whatsappPhoneNumberId: string | null;
  whatsappBusinessAccountId: string | null;
  createdAt: string;
};

export type TenantMembership = {
  id: string;
  authUserId: string;
  tenantId: string;
  name: string;
  role: "owner" | "admin" | "manager" | "cashier" | "support";
  avatarUrl: string | null;
  createdAt: string;
};

export class AuthenticationRequiredError extends Error {
  constructor() {
    super("Authentication required");
    this.name = "AuthenticationRequiredError";
  }
}

export class TenantMembershipRequiredError extends Error {
  constructor() {
    super("The authenticated user is not linked to a tenant");
    this.name = "TenantMembershipRequiredError";
  }
}

type TenantMembershipRow = {
  id: string;
  auth_user_id: string;
  tenant_id: string;
  name: string;
  role: TenantMembership["role"];
  avatar_url?: string | null;
  created_at?: string | null;
};

function isMissingOptionalProfileSchema(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const record = error as { code?: unknown; message?: unknown };
  const message = typeof record.message === "string" ? record.message.toLowerCase() : "";

  return (
    record.code === "PGRST204" ||
    record.code === "42703" ||
    message.includes("avatar_url") ||
    message.includes("schema cache")
  );
}

export async function getTenantContext() {
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    throw new AuthenticationRequiredError();
  }

  const { data: membershipRowWithProfile, error: membershipProfileError } = await supabase
    .from("tenant_users")
    .select("id,auth_user_id,tenant_id,name,role,avatar_url,created_at")
    .eq("auth_user_id", authData.user.id)
    .maybeSingle<TenantMembershipRow>();

  let membershipRow = membershipRowWithProfile;
  let membershipError = membershipProfileError;

  if (membershipProfileError && isMissingOptionalProfileSchema(membershipProfileError)) {
    const fallback = await supabase
      .from("tenant_users")
      .select("id,auth_user_id,tenant_id,name,role,created_at")
      .eq("auth_user_id", authData.user.id)
      .maybeSingle<TenantMembershipRow>();

    membershipRow = fallback.data;
    membershipError = fallback.error;
  }

  if (membershipError) {
    throw new Error(`Tenant membership lookup failed: ${membershipError.message}`);
  }

  if (!membershipRow) {
    throw new TenantMembershipRequiredError();
  }

  const { data: tenantRow, error: tenantError } = await supabase
    .from("tenants")
    .select(
      "id,name,slug,currency,tax_rate,timezone,whatsapp_phone_number,whatsapp_phone_number_id,whatsapp_business_account_id,created_at",
    )
    .eq("id", membershipRow.tenant_id)
    .single<{
      id: string;
      name: string;
      slug: string;
      currency: string | null;
      tax_rate: number | string | null;
      timezone: string | null;
      whatsapp_phone_number: string | null;
      whatsapp_phone_number_id: string | null;
      whatsapp_business_account_id: string | null;
      created_at: string;
    }>();

  if (tenantError || !tenantRow) {
    throw new Error(`Tenant lookup failed: ${tenantError?.message ?? "tenant not found"}`);
  }

  return {
    supabase,
    user: authData.user as User,
    membership: {
      id: membershipRow.id,
      authUserId: membershipRow.auth_user_id,
      tenantId: membershipRow.tenant_id,
      name: membershipRow.name,
      role: membershipRow.role,
      avatarUrl: membershipRow.avatar_url ?? null,
      createdAt: membershipRow.created_at ?? authData.user.created_at,
    } satisfies TenantMembership,
    tenant: {
      id: tenantRow.id,
      name: tenantRow.name,
      slug: tenantRow.slug,
      currency: tenantRow.currency ?? "USD",
      taxRate: Number(tenantRow.tax_rate ?? 0),
      timezone: tenantRow.timezone,
      whatsappPhoneNumber: tenantRow.whatsapp_phone_number,
      whatsappPhoneNumberId: tenantRow.whatsapp_phone_number_id,
      whatsappBusinessAccountId: tenantRow.whatsapp_business_account_id,
      createdAt: tenantRow.created_at,
    } satisfies Tenant,
  };
}

export function tenantContextErrorStatus(error: unknown) {
  if (error instanceof AuthenticationRequiredError) {
    return 401;
  }

  if (error instanceof TenantMembershipRequiredError) {
    return 403;
  }

  return 500;
}
