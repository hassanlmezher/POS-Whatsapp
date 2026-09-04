import "server-only";
import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  AdminTenantError,
  createBusinessWithOwner,
  OWNER_PERMISSIONS,
  type AuthUserSummary,
  type CreateBusinessInput,
  type MembershipSummary,
  type RoleSummary,
  type TenantSummary,
} from "@/lib/admin/tenant-management";

type TenantRow = {
  id: string;
  name: string;
  slug: string;
  status: string | null;
  subscription_status: string | null;
  trial_starts_at: string | null;
  trial_ends_at: string | null;
  created_at: string;
};

type MembershipRow = {
  id: string;
  auth_user_id: string;
  tenant_id: string;
  name: string;
  role: string;
  created_at: string | null;
};

type ConnectionRow = {
  tenant_id: string;
  status: string;
  phone_number: string | null;
};

export type AdminTenantListItem = TenantRow & {
  owner: MembershipRow | null;
  ownerEmail: string | null;
  userCount: number;
  whatsappStatus: string;
};

export type AdminUserListItem = MembershipRow & {
  email: string;
  tenantName: string;
  status: string;
};

type AuthListUser = {
  id: string;
  email?: string;
  user_metadata?: { name?: unknown };
  banned_until?: string | null;
  deleted_at?: string | null;
};

const PERMISSION_DESCRIPTIONS: Record<string, string> = {
  "orders:read": "View orders and order details.",
  "orders:write": "Create and update orders.",
  "customers:read": "View customers and conversations.",
  "customers:write": "Create and update customer records.",
  "products:read": "View products, categories, and inventory.",
  "products:write": "Create and update products, categories, and inventory.",
  "settings:manage": "Manage tenant settings and integrations.",
  "team:manage": "Manage team members, roles, and permissions.",
  "reports:read": "View reports and analytics.",
  "messages:read": "View WhatsApp conversations and messages.",
  "messages:write": "Send and manage WhatsApp messages.",
};

const ROLE_PERMISSIONS: Record<string, readonly string[]> = {
  owner: OWNER_PERMISSIONS,
  admin: OWNER_PERMISSIONS,
  manager: [
    "orders:read",
    "orders:write",
    "customers:read",
    "customers:write",
    "products:read",
    "products:write",
    "reports:read",
    "messages:read",
    "messages:write",
  ],
  cashier: ["orders:read", "orders:write", "customers:read", "products:read", "messages:read", "messages:write"],
};

function matchesSearch(value: string | null | undefined, query: string) {
  return (value ?? "").toLowerCase().includes(query);
}

async function listAllAuthUsers(supabase: ReturnType<typeof createSupabaseAdminClient>) {
  const users: AuthListUser[] = [];

  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    users.push(...((data.users ?? []) as AuthListUser[]));
    if (!data.lastPage || page >= data.lastPage) break;
  }

  return users;
}

export async function getAdminOverview() {
  const supabase = createSupabaseAdminClient();
  const [{ data: tenants, error: tenantError }, { data: memberships, error: membershipError }, { data: connections }] =
    await Promise.all([
      supabase.from("tenants").select("id,status"),
      supabase.from("tenant_users").select("id"),
      supabase.from("whatsapp_connections").select("id,status").eq("status", "connected"),
    ]);

  if (tenantError || membershipError) throw new Error(tenantError?.message ?? membershipError?.message);

  const suspended = (tenants ?? []).filter((tenant: { status?: string | null }) => tenant.status === "suspended").length;
  return {
    tenants: tenants?.length ?? 0,
    users: memberships?.length ?? 0,
    connectedWhatsApp: connections?.length ?? 0,
    suspended,
    health: suspended > 0 ? "Attention" : "Ready",
  };
}

export async function getAdminTenants(search = "") {
  const supabase = createSupabaseAdminClient();
  const [authUsers, { data: tenants, error: tenantError }, { data: members, error: memberError }, { data: connections }] =
    await Promise.all([
      listAllAuthUsers(supabase),
      supabase
        .from("tenants")
        .select("id,name,slug,status,subscription_status,trial_starts_at,trial_ends_at,created_at")
        .order("created_at", { ascending: false })
        .returns<TenantRow[]>(),
      supabase
        .from("tenant_users")
        .select("id,auth_user_id,tenant_id,name,role,created_at")
        .returns<MembershipRow[]>(),
      supabase.from("whatsapp_connections").select("tenant_id,status,phone_number").returns<ConnectionRow[]>(),
    ]);

  if (tenantError || memberError) throw new Error(tenantError?.message ?? memberError?.message);

  const query = search.trim().toLowerCase();
  const userById = new Map(authUsers.map((user) => [user.id, user]));
  const connectionByTenant = new Map((connections ?? []).map((connection) => [connection.tenant_id, connection]));
  const membersByTenant = new Map<string, MembershipRow[]>();
  for (const member of members ?? []) {
    membersByTenant.set(member.tenant_id, [...(membersByTenant.get(member.tenant_id) ?? []), member]);
  }

  return (tenants ?? [])
    .map((tenant) => {
      const tenantMembers = membersByTenant.get(tenant.id) ?? [];
      const owner = tenantMembers.find((member) => member.role === "owner") ?? null;
      const connection = connectionByTenant.get(tenant.id);
      const ownerEmail = owner ? userById.get(owner.auth_user_id)?.email ?? null : null;
      return {
        ...tenant,
        owner,
        ownerEmail,
        userCount: tenantMembers.length,
        whatsappStatus: connection?.status ?? "disconnected",
      } satisfies AdminTenantListItem;
    })
    .filter(
      (tenant) =>
        !query ||
        matchesSearch(tenant.name, query) ||
        matchesSearch(tenant.owner?.name, query) ||
        matchesSearch(tenant.ownerEmail, query) ||
        matchesSearch(tenant.slug, query),
    );
}

export async function getAdminTenant(tenantId: string) {
  const supabase = createSupabaseAdminClient();
  const [authUsers, tenantResult, membersResult, connectionResult] = await Promise.all([
    listAllAuthUsers(supabase),
    supabase
      .from("tenants")
      .select("id,name,slug,status,subscription_status,trial_starts_at,trial_ends_at,created_at,updated_at")
      .eq("id", tenantId)
      .maybeSingle<(TenantRow & { updated_at: string })>(),
    supabase
      .from("tenant_users")
      .select("id,auth_user_id,tenant_id,name,role,created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: true })
      .returns<MembershipRow[]>(),
    supabase
      .from("whatsapp_connections")
      .select("tenant_id,status,phone_number")
      .eq("tenant_id", tenantId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle<ConnectionRow>(),
  ]);

  if (tenantResult.error || membersResult.error || connectionResult.error) {
    throw new Error(tenantResult.error?.message ?? membersResult.error?.message ?? connectionResult.error?.message);
  }

  if (!tenantResult.data) {
    return null;
  }

  const userById = new Map(authUsers.map((user) => [user.id, user]));
  const users = (membersResult.data ?? []).map((member) => ({
    ...member,
    email: userById.get(member.auth_user_id)?.email ?? "No email",
  }));

  return {
    tenant: tenantResult.data,
    users,
    owner: users.find((member) => member.role === "owner") ?? null,
    whatsapp: connectionResult.data ?? null,
  };
}

export async function getAdminUsers(search = "") {
  const supabase = createSupabaseAdminClient();
  const [authUsers, tenantsResult, membersResult] = await Promise.all([
    listAllAuthUsers(supabase),
    supabase.from("tenants").select("id,name").returns<Array<{ id: string; name: string }>>(),
    supabase.from("tenant_users").select("id,auth_user_id,tenant_id,name,role,created_at").returns<MembershipRow[]>(),
  ]);

  if (tenantsResult.error || membersResult.error) throw new Error(tenantsResult.error?.message ?? membersResult.error?.message);

  const query = search.trim().toLowerCase();
  const userById = new Map(authUsers.map((user) => [user.id, user]));
  const tenantById = new Map((tenantsResult.data ?? []).map((tenant) => [tenant.id, tenant.name]));

  return (membersResult.data ?? [])
    .map((member) => {
      const authUser = userById.get(member.auth_user_id);
      return {
        ...member,
        email: authUser?.email ?? "No email",
        tenantName: tenantById.get(member.tenant_id) ?? "Unknown tenant",
        status: authUser?.deleted_at ? "Deleted" : authUser?.banned_until ? "Suspended" : "Active",
      } satisfies AdminUserListItem;
    })
    .filter((user) => !query || matchesSearch(user.name, query) || matchesSearch(user.email, query) || matchesSearch(user.tenantName, query));
}

async function findAuthUserByEmail(supabase: ReturnType<typeof createSupabaseAdminClient>, email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const users = await listAllAuthUsers(supabase);
  const user = users.find((candidate) => candidate.email?.toLowerCase() === normalizedEmail);
  return user?.email ? ({ id: user.id, email: user.email } satisfies AuthUserSummary) : null;
}

async function createTenantWithUniqueSlug(supabase: SupabaseClient, input: { name: string; slug: string; trialStartsAt: string; trialEndsAt: string }) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const slug = attempt === 0 ? input.slug : `${input.slug}-${randomUUID().slice(0, 8)}`;
    const { data, error } = await supabase
      .from("tenants")
      .insert({
        name: input.name,
        slug,
        currency: "USD",
        tax_rate: 0,
        timezone: "UTC",
        status: "active",
        subscription_status: "trialing",
        trial_starts_at: input.trialStartsAt,
        trial_ends_at: input.trialEndsAt,
      })
      .select("id,name,slug")
      .single<TenantSummary>();

    if (data) return data;
    if (error?.code !== "23505") throw error;
  }

  throw new AdminTenantError("tenant-create-failed", "Could not create a unique business slug.");
}

export function createSupabaseBusinessDeps(supabase = createSupabaseAdminClient()) {
  return {
    async findAuthUserByEmail(email: string) {
      return findAuthUserByEmail(supabase, email);
    },
    async createAuthUser(input: { email: string; password: string; name: string }) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: input.email,
        password: input.password,
        email_confirm: true,
        user_metadata: { name: input.name },
      });
      if (error || !data.user?.email) throw error ?? new Error("Auth user was not created.");
      return { id: data.user.id, email: data.user.email } satisfies AuthUserSummary;
    },
    async deleteAuthUser(userId: string) {
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) throw error;
    },
    async findMembershipByAuthUserId(userId: string) {
      const { data, error } = await supabase
        .from("tenant_users")
        .select("id,auth_user_id,tenant_id,role")
        .eq("auth_user_id", userId)
        .maybeSingle<{ id: string; auth_user_id: string; tenant_id: string; role: string }>();
      if (error) throw error;
      return data ? ({ id: data.id, authUserId: data.auth_user_id, tenantId: data.tenant_id, role: data.role } satisfies MembershipSummary) : null;
    },
    async createTenant(input: { name: string; slug: string; trialStartsAt: string; trialEndsAt: string }) {
      return createTenantWithUniqueSlug(supabase, input);
    },
    async deleteTenant(tenantId: string) {
      const { error } = await supabase.from("tenants").delete().eq("id", tenantId);
      if (error) throw error;
    },
    async ensureTenantRbac(tenantId: string) {
      await supabase.from("permissions").upsert(
        Object.entries(PERMISSION_DESCRIPTIONS).map(([id, description]) => ({ id, description })),
        { onConflict: "id" },
      );
      const roleNames = Object.keys(ROLE_PERMISSIONS);
      const { error: roleError } = await supabase
        .from("roles")
        .upsert(roleNames.map((name) => ({ tenant_id: tenantId, name, is_system: true })), { onConflict: "tenant_id,name" });
      if (roleError) throw roleError;

      const { data: roles, error } = await supabase.from("roles").select("id,name").eq("tenant_id", tenantId).returns<RoleSummary[]>();
      if (error) throw error;

      const grants = (roles ?? []).flatMap((role) =>
        (ROLE_PERMISSIONS[role.name] ?? []).map((permissionId) => ({ role_id: role.id, permission_id: permissionId })),
      );
      if (grants.length) {
        const { error: grantsError } = await supabase.from("role_permissions").upsert(grants, { onConflict: "role_id,permission_id" });
        if (grantsError) throw grantsError;
      }
    },
    async getTenantRole(tenantId: string, roleName: "owner") {
      const { data, error } = await supabase
        .from("roles")
        .select("id,name")
        .eq("tenant_id", tenantId)
        .eq("name", roleName)
        .single<RoleSummary>();
      if (error || !data) throw error ?? new Error("Owner role missing.");
      return data;
    },
    async createMembership(input: { authUserId: string; tenantId: string; name: string; role: "owner" }) {
      const { data, error } = await supabase
        .from("tenant_users")
        .insert({
          auth_user_id: input.authUserId,
          tenant_id: input.tenantId,
          name: input.name,
          role: input.role,
        })
        .select("id,auth_user_id,tenant_id,role")
        .single<{ id: string; auth_user_id: string; tenant_id: string; role: string }>();
      if (error || !data) throw error ?? new Error("Membership was not created.");
      return { id: data.id, authUserId: data.auth_user_id, tenantId: data.tenant_id, role: data.role } satisfies MembershipSummary;
    },
  };
}

export async function createAdminBusiness(input: CreateBusinessInput) {
  return createBusinessWithOwner(createSupabaseBusinessDeps(), input);
}

export async function updateAdminTenantStatus(tenantId: string, status: "active" | "suspended") {
  const supabase = createSupabaseAdminClient();
  const { data: tenant, error: lookupError } = await supabase.from("tenants").select("id").eq("id", tenantId).maybeSingle<{ id: string }>();
  if (lookupError || !tenant) throw new AdminTenantError("tenant-not-found", "Business was not found.");

  const { error } = await supabase.from("tenants").update({ status, updated_at: new Date().toISOString() }).eq("id", tenantId);
  if (error) throw error;
}
