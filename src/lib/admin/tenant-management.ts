export const OWNER_PERMISSIONS = [
  "orders:read",
  "orders:write",
  "customers:read",
  "customers:write",
  "products:read",
  "products:write",
  "settings:manage",
  "team:manage",
  "reports:read",
  "messages:read",
  "messages:write",
] as const;

export type CreateBusinessInput = {
  businessName: string;
  ownerName: string;
  ownerEmail: string;
  password: string;
  trialDays: number;
};

export type AuthUserSummary = { id: string; email: string };
export type TenantSummary = { id: string; name: string; slug: string };
export type RoleSummary = { id: string; name: string };
export type MembershipSummary = { id: string; authUserId: string; tenantId: string; role: string };

export type CreateBusinessDeps = {
  findAuthUserByEmail(email: string): Promise<AuthUserSummary | null>;
  createAuthUser(input: { email: string; password: string; name: string }): Promise<AuthUserSummary>;
  deleteAuthUser(userId: string): Promise<void>;
  findMembershipByAuthUserId(userId: string): Promise<MembershipSummary | null>;
  createTenant(input: { name: string; slug: string; trialStartsAt: string; trialEndsAt: string }): Promise<TenantSummary>;
  deleteTenant(tenantId: string): Promise<void>;
  ensureTenantRbac(tenantId: string): Promise<void>;
  getTenantRole(tenantId: string, roleName: "owner"): Promise<RoleSummary>;
  createMembership(input: { authUserId: string; tenantId: string; name: string; role: "owner" }): Promise<MembershipSummary>;
};

export class AdminTenantError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "AdminTenantError";
    this.code = code;
  }
}

export function slugifyBusinessName(name: string) {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return slug || "business";
}

export function buildTrialWindow(now = new Date(), trialDays = 14) {
  const days = Number.isFinite(trialDays) && trialDays > 0 ? Math.min(Math.floor(trialDays), 365) : 14;
  const end = new Date(now);
  end.setUTCDate(end.getUTCDate() + days);
  return { startsAt: now.toISOString(), endsAt: end.toISOString(), days };
}

export function userCanAccessAdmin(input: { hasClaim: boolean; hasSuperAdminRow: boolean }) {
  return input.hasClaim || input.hasSuperAdminRow;
}

export function isTenantLifecycleStatus(value: string): value is "active" | "suspended" {
  return value === "active" || value === "suspended";
}

export function summarizePlatform(input: { tenants: unknown[]; users: unknown[]; suspendedTenants: unknown[] }) {
  return {
    tenantCount: input.tenants.length,
    userCount: input.users.length,
    suspendedTenantCount: input.suspendedTenants.length,
    health: input.suspendedTenants.length > 0 ? "Attention" : "Ready",
  };
}

export async function createBusinessWithOwner(deps: CreateBusinessDeps, input: CreateBusinessInput) {
  const existingUser = await deps.findAuthUserByEmail(input.ownerEmail);
  let ownerUser = existingUser;
  let createdUser = false;
  let tenant: TenantSummary | null = null;

  if (ownerUser) {
    const existingMembership = await deps.findMembershipByAuthUserId(ownerUser.id);
    if (existingMembership) {
      throw new AdminTenantError("duplicate-owner-email", "Owner email is already assigned to a tenant.");
    }
  } else {
    ownerUser = await deps.createAuthUser({
      email: input.ownerEmail,
      password: input.password,
      name: input.ownerName,
    });
    createdUser = true;
  }

  try {
    const trial = buildTrialWindow(new Date(), input.trialDays);
    tenant = await deps.createTenant({
      name: input.businessName,
      slug: slugifyBusinessName(input.businessName),
      trialStartsAt: trial.startsAt,
      trialEndsAt: trial.endsAt,
    });
    await deps.ensureTenantRbac(tenant.id);
    await deps.getTenantRole(tenant.id, "owner");
    const membership = await deps.createMembership({
      authUserId: ownerUser.id,
      tenantId: tenant.id,
      name: input.ownerName,
      role: "owner",
    });
    return { tenant, ownerUser, membership };
  } catch (error) {
    if (tenant) {
      await deps.deleteTenant(tenant.id).catch(() => undefined);
    }
    if (createdUser && ownerUser) {
      await deps.deleteAuthUser(ownerUser.id).catch(() => undefined);
    }
    throw error;
  }
}
