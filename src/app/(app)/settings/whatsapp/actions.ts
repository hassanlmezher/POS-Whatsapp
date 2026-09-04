"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getTenantContext } from "@/lib/tenant-context";

const schema = z.object({
  code: z.string().trim().min(1),
  phoneNumberId: z.string().trim().min(1),
  wabaId: z.string().trim().min(1),
  phoneNumber: z.string().trim().optional(),
});

function hasSettingsManage(metadata: unknown, tenantId: string) {
  if (!metadata || typeof metadata !== "object") return false;
  const claims = metadata as { permissions?: unknown; tenant_id?: unknown };
  return claims.tenant_id === tenantId && Array.isArray(claims.permissions) && claims.permissions.includes("settings:manage");
}

async function exchangeCodeForToken(code: string) {
  const appId = process.env.WHATSAPP_APP_ID ?? process.env.META_APP_ID ?? process.env.NEXT_PUBLIC_WHATSAPP_APP_ID;
  const appSecret = process.env.WHATSAPP_APP_SECRET ?? process.env.META_APP_SECRET;
  const version = process.env.WHATSAPP_API_VERSION ?? process.env.NEXT_PUBLIC_WHATSAPP_API_VERSION ?? "v25.0";

  if (!appId || !appSecret) throw new Error("missing-meta-config");

  const url = new URL(`https://graph.facebook.com/${version}/oauth/access_token`);
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("code", code);

  const response = await fetch(url);
  const payload = (await response.json().catch(() => null)) as { access_token?: string; error?: { message?: string } } | null;

  if (!response.ok || !payload?.access_token) {
    throw new Error(payload?.error?.message ?? "token-exchange-failed");
  }

  return payload.access_token;
}

async function fetchPhoneNumber(phoneNumberId: string, accessToken: string, fallback: string | undefined) {
  const version = process.env.WHATSAPP_API_VERSION ?? process.env.NEXT_PUBLIC_WHATSAPP_API_VERSION ?? "v25.0";
  const url = new URL(`https://graph.facebook.com/${version}/${phoneNumberId}`);
  url.searchParams.set("fields", "display_phone_number");

  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const payload = (await response.json().catch(() => null)) as { display_phone_number?: string } | null;
  return payload?.display_phone_number ?? fallback ?? null;
}

export async function saveWhatsAppConnection(formData: FormData) {
  const parsed = schema.safeParse({
    code: formData.get("code"),
    phoneNumberId: formData.get("phoneNumberId"),
    wabaId: formData.get("wabaId"),
    phoneNumber: formData.get("phoneNumber"),
  });

  if (!parsed.success) redirect("/settings/whatsapp?error=invalid-signup");

  const { membership, tenant, user } = await getTenantContext();
  if (membership.role !== "owner" && !hasSettingsManage(user.app_metadata, tenant.id)) {
    redirect("/login");
  }

  const supabase = createSupabaseAdminClient();

  try {
    const accessToken = await exchangeCodeForToken(parsed.data.code);
    const phoneNumber = await fetchPhoneNumber(parsed.data.phoneNumberId, accessToken, parsed.data.phoneNumber);

    const { error } = await supabase.from("whatsapp_connections").upsert(
      {
        tenant_id: tenant.id,
        phone_number_id: parsed.data.phoneNumberId,
        waba_id: parsed.data.wabaId,
        phone_number: phoneNumber,
        access_token: accessToken,
        status: "connected",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tenant_id,phone_number_id" },
    );

    if (error) throw error;
  } catch (error) {
    console.error("[settings/whatsapp] Embedded signup save failed", error);
    redirect("/settings/whatsapp?error=connect-failed");
  }

  revalidatePath("/settings/whatsapp");
  redirect("/settings/whatsapp?updated=connected");
}
