"use server";

import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getTenantContext } from "@/lib/tenant-context";

const PROFILE_AVATAR_BUCKET = process.env.PROFILE_AVATAR_BUCKET ?? "profile-avatars";
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const AVATAR_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

const profileSchema = z.object({
  name: z.string().trim().min(2),
});

const companySchema = z.object({
  name: z.string().trim().min(2),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/),
  taxRatePercent: z.coerce.number().min(0).max(100),
  timezone: z.string().trim().min(1).nullable(),
});

const companyEditRoles = new Set(["owner", "admin", "manager"]);

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
    message.includes("updated_at") ||
    message.includes("schema cache")
  );
}

function optionalString(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length ? text : null;
}

function getAvatarFile(formData: FormData) {
  const file = formData.get("avatarFile");

  if (!(file instanceof File) || file.size === 0) {
    return null;
  }

  if (!AVATAR_TYPES.has(file.type) || file.size > MAX_AVATAR_BYTES) {
    throw new Error("invalid-avatar");
  }

  return file;
}

async function ensureAvatarBucket(supabase: SupabaseClient) {
  const { error } = await supabase.storage.createBucket(PROFILE_AVATAR_BUCKET, {
    public: true,
    fileSizeLimit: MAX_AVATAR_BYTES,
    allowedMimeTypes: Array.from(AVATAR_TYPES.keys()),
  });

  if (!error) {
    return;
  }

  const message = error.message.toLowerCase();
  if (!message.includes("already exists") && !message.includes("duplicate")) {
    throw error;
  }
}

async function uploadAvatar({
  file,
  membershipId,
  supabase,
  tenantId,
}: {
  file: File;
  membershipId: string;
  supabase: SupabaseClient;
  tenantId: string;
}) {
  await ensureAvatarBucket(supabase);

  const extension = AVATAR_TYPES.get(file.type) ?? "jpg";
  const storagePath = `${tenantId}/${membershipId}/${randomUUID()}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage.from(PROFILE_AVATAR_BUCKET).upload(storagePath, buffer, {
    cacheControl: "31536000",
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from(PROFILE_AVATAR_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

export async function updateAccountProfile(formData: FormData) {
  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
  });

  if (!parsed.success) {
    redirect("/settings?error=invalid-profile");
  }

  let avatarFile: File | null = null;
  try {
    avatarFile = getAvatarFile(formData);
  } catch {
    redirect("/settings?error=invalid-avatar");
  }

  const { membership, tenant, user } = await getTenantContext();
  const supabase = createSupabaseAdminClient();
  let avatarUrl = membership.avatarUrl;

  if (avatarFile) {
    try {
      avatarUrl = await uploadAvatar({
        file: avatarFile,
        membershipId: membership.id,
        supabase,
        tenantId: tenant.id,
      });
    } catch (error) {
      console.error("[settings] Avatar upload failed", error);
      redirect("/settings?error=avatar-upload-failed");
    }
  }

  const { error } = await supabase
    .from("tenant_users")
    .update({
      name: parsed.data.name,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", membership.id)
    .eq("tenant_id", tenant.id)
    .eq("auth_user_id", user.id);

  if (error) {
    if (isMissingOptionalProfileSchema(error)) {
      if (avatarFile) {
        redirect("/settings?error=profile-schema-required");
      }

      const { error: fallbackError } = await supabase
        .from("tenant_users")
        .update({ name: parsed.data.name })
        .eq("id", membership.id)
        .eq("tenant_id", tenant.id)
        .eq("auth_user_id", user.id);

      if (fallbackError) {
        redirect("/settings?error=profile-update-failed");
      }
    } else {
      redirect("/settings?error=profile-update-failed");
    }
  }

  await supabase.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...user.user_metadata,
      avatar_url: avatarUrl,
      name: parsed.data.name,
    },
  });

  redirect("/settings?updated=profile");
}

export async function updateCompanyProfile(formData: FormData) {
  const parsed = companySchema.safeParse({
    name: formData.get("name"),
    currency: formData.get("currency"),
    taxRatePercent: formData.get("taxRatePercent"),
    timezone: optionalString(formData.get("timezone")),
  });

  if (!parsed.success) {
    redirect("/settings?error=invalid-company");
  }

  const { membership, tenant } = await getTenantContext();

  if (!companyEditRoles.has(membership.role)) {
    redirect("/settings?error=company-permission-denied");
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("tenants")
    .update({
      name: parsed.data.name,
      currency: parsed.data.currency,
      tax_rate: parsed.data.taxRatePercent / 100,
      timezone: parsed.data.timezone ?? "UTC",
      updated_at: new Date().toISOString(),
    })
    .eq("id", tenant.id);

  if (error) {
    redirect("/settings?error=company-update-failed");
  }

  redirect("/settings?updated=company");
}
