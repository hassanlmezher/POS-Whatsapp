import assert from "node:assert/strict";
import test from "node:test";
import {
  AdminTenantError,
  createBusinessWithOwner,
  isTenantLifecycleStatus,
  slugifyBusinessName,
  summarizePlatform,
  userCanAccessAdmin,
  type CreateBusinessDeps,
} from "../src/lib/admin/tenant-management";

const input = {
  businessName: "Test Shop",
  ownerName: "Test Owner",
  ownerEmail: "owner@testshop.com",
  password: "secure-pass-123",
  trialDays: 14,
};

function deps(overrides: Partial<CreateBusinessDeps> = {}) {
  const calls: string[] = [];
  const tenant = { id: "tenant-1", name: "Test Shop", slug: "test-shop" };
  const owner = { id: "user-1", email: input.ownerEmail };
  const base: CreateBusinessDeps = {
    async findAuthUserByEmail() {
      calls.push("find-user");
      return null;
    },
    async createAuthUser() {
      calls.push("create-user");
      return owner;
    },
    async deleteAuthUser() {
      calls.push("delete-user");
    },
    async findMembershipByAuthUserId() {
      calls.push("find-membership");
      return null;
    },
    async createTenant() {
      calls.push("create-tenant");
      return tenant;
    },
    async deleteTenant() {
      calls.push("delete-tenant");
    },
    async ensureTenantRbac(tenantId) {
      calls.push(`rbac:${tenantId}`);
    },
    async getTenantRole(tenantId, roleName) {
      calls.push(`role:${tenantId}:${roleName}`);
      return { id: "role-1", name: roleName };
    },
    async createMembership(payload) {
      calls.push(`membership:${payload.authUserId}:${payload.tenantId}:${payload.role}`);
      return { id: "membership-1", authUserId: payload.authUserId, tenantId: payload.tenantId, role: payload.role };
    },
  };

  return { calls, deps: { ...base, ...overrides } };
}

test("super admin predicate requires claim or super_admin row", () => {
  assert.equal(userCanAccessAdmin({ hasClaim: false, hasSuperAdminRow: false }), false);
  assert.equal(userCanAccessAdmin({ hasClaim: true, hasSuperAdminRow: false }), true);
  assert.equal(userCanAccessAdmin({ hasClaim: false, hasSuperAdminRow: true }), true);
});

test("creates tenant, RBAC, owner user, and owner membership", async () => {
  const fixture = deps();
  const result = await createBusinessWithOwner(fixture.deps, input);

  assert.equal(result.tenant.id, "tenant-1");
  assert.equal(result.membership.role, "owner");
  assert.equal(result.membership.tenantId, "tenant-1");
  assert.deepEqual(fixture.calls, [
    "find-user",
    "create-user",
    "create-tenant",
    "rbac:tenant-1",
    "role:tenant-1:owner",
    "membership:user-1:tenant-1:owner",
  ]);
});

test("duplicate owner email with existing membership is rejected before tenant creation", async () => {
  const fixture = deps({
    async findAuthUserByEmail() {
      fixture.calls.push("find-user");
      return { id: "existing-user", email: input.ownerEmail };
    },
    async findMembershipByAuthUserId() {
      fixture.calls.push("find-membership");
      return { id: "existing-membership", authUserId: "existing-user", tenantId: "other-tenant", role: "owner" };
    },
  });

  await assert.rejects(() => createBusinessWithOwner(fixture.deps, input), (error) => error instanceof AdminTenantError && error.code === "duplicate-owner-email");
  assert.deepEqual(fixture.calls, ["find-user", "find-membership"]);
});

test("partial failure rolls back created tenant and newly created auth user", async () => {
  const fixture = deps({
    async createMembership() {
      fixture.calls.push("membership-failed");
      throw new Error("membership failed");
    },
  });

  await assert.rejects(() => createBusinessWithOwner(fixture.deps, input), /membership failed/);
  assert.deepEqual(fixture.calls.slice(-3), ["membership-failed", "delete-tenant", "delete-user"]);
});

test("tenant status and platform counts helpers stay deterministic", () => {
  assert.equal(slugifyBusinessName("Test Shop!!"), "test-shop");
  assert.equal(isTenantLifecycleStatus("active"), true);
  assert.equal(isTenantLifecycleStatus("deleted"), false);
  assert.deepEqual(summarizePlatform({ tenants: [{ id: 1 }], users: [{ id: 1 }, { id: 2 }], suspendedTenants: [] }), {
    tenantCount: 1,
    userCount: 2,
    suspendedTenantCount: 0,
    health: "Ready",
  });
});
