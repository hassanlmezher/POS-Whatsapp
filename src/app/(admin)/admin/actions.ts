"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/admin/auth";
import { AdminTenantError } from "@/lib/admin/tenant-management";
import { createAdminBusiness, updateAdminTenantStatus } from "@/lib/admin/platform";

const createBusinessSchema = z.object({
  businessName: z.string().trim().min(2),
  ownerName: z.string().trim().min(2),
  ownerEmail: z.string().trim().email().transform((email) => email.toLowerCase()),
  password: z.string().min(8),
  trialDays: z.coerce.number().int().min(1).max(365).default(14),
});

const statusSchema = z.object({
  tenantId: z.string().uuid(),
  status: z.enum(["active", "suspended"]),
  confirm: z.string().optional(),
});

function errorPath(code: string) {
  return `/admin/tenants?error=${encodeURIComponent(code)}`;
}

export async function createBusinessAction(formData: FormData) {
  await requireSuperAdmin();
  const parsed = createBusinessSchema.safeParse({
    businessName: formData.get("businessName"),
    ownerName: formData.get("ownerName"),
    ownerEmail: formData.get("ownerEmail"),
    password: formData.get("password"),
    trialDays: formData.get("trialDays") ?? 14,
  });

  if (!parsed.success) redirect(errorPath("invalid-business"));

  let tenantId: string;
  try {
    const result = await createAdminBusiness(parsed.data);
    tenantId = result.tenant.id;
    revalidatePath("/admin");
    revalidatePath("/admin/tenants");
    revalidatePath("/admin/users");
  } catch (error) {
    if (error instanceof AdminTenantError) redirect(errorPath(error.code));
    console.error("[admin] Create business failed", error);
    redirect(errorPath("create-failed"));
  }

  redirect(`/admin/tenants/${tenantId}?created=business`);
}

export async function updateTenantStatusAction(formData: FormData) {
  await requireSuperAdmin();
  const parsed = statusSchema.safeParse({
    tenantId: formData.get("tenantId"),
    status: formData.get("status"),
    confirm: formData.get("confirm"),
  });

  if (!parsed.success) redirect("/admin/tenants?error=invalid-status");
  if (parsed.data.status === "suspended" && parsed.data.confirm !== "yes") {
    redirect(`/admin/tenants/${parsed.data.tenantId}?error=confirm-required`);
  }

  try {
    await updateAdminTenantStatus(parsed.data.tenantId, parsed.data.status);
    revalidatePath("/admin");
    revalidatePath("/admin/tenants");
    revalidatePath(`/admin/tenants/${parsed.data.tenantId}`);
  } catch (error) {
    console.error("[admin] Tenant status update failed", error);
    redirect(`/admin/tenants/${parsed.data.tenantId}?error=status-failed`);
  }

  redirect(`/admin/tenants/${parsed.data.tenantId}?updated=status`);
}
