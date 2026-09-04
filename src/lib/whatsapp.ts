import type { SupabaseClient } from "@supabase/supabase-js";
import { buildWhatsAppAudioMessagePayload, parseWhatsAppMediaUploadResponse, parseWhatsAppSendResponse } from "@/lib/whatsapp-audio";
import { buildWhatsAppAttachmentMessagePayload } from "@/lib/whatsapp-attachments";

type SendWhatsAppTextInput = {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  body: string;
};

export type UploadWhatsAppMediaInput = {
  phoneNumberId: string;
  accessToken: string;
  file: Blob;
  fileName: string;
  mimeType: string;
};

type SendWhatsAppAudioInput = {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  mediaId: string;
};

type SendWhatsAppAttachmentInput = {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  payload: ReturnType<typeof buildWhatsAppAttachmentMessagePayload>;
};

type WhatsAppEnvCheck = {
  ok: boolean;
  errors: string[];
  phoneNumberId: string | null;
  accessToken: string | null;
};

export type WhatsAppConnectionCredentials = {
  phoneNumberId: string;
  accessToken: string;
  phoneNumber: string | null;
  wabaId: string;
};

export type WhatsAppMediaMetadata = {
  id: string;
  url: string;
  mimeType: string | null;
  sha256: string | null;
  fileSize: number | null;
};

type MetaErrorPayload = {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
};

function getMetaError(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const error = (payload as MetaErrorPayload).error;

  return error && typeof error === "object" ? error : null;
}

function isWhatsAppAuthOrAccessError(status: number, payload: unknown) {
  const error = getMetaError(payload);
  const code = error?.code;

  return status === 401 || status === 403 || code === 190 || code === 131005;
}

export class WhatsAppApiError extends Error {
  status: number;
  payload: unknown;
  isAuthError: boolean;

  constructor(message: string, options: { status: number; payload: unknown; isAuthError: boolean }) {
    super(message);
    this.name = "WhatsAppApiError";
    this.status = options.status;
    this.payload = options.payload;
    this.isAuthError = options.isAuthError;
  }
}

export function formatWhatsAppApiErrorForUser(error: WhatsAppApiError) {
  const metaError = getMetaError(error.payload);
  const code = metaError?.code;
  const subcode = metaError?.error_subcode;

  if (code === 190 || subcode === 463) {
    return "WhatsApp access token expired. Reconnect this tenant's WhatsApp Business account.";
  }

  if (code === 131005 || /access denied/i.test(error.message)) {
    return "WhatsApp access denied. Reconnect this tenant's WhatsApp Business account.";
  }

  if (error.isAuthError) {
    return "WhatsApp authentication failed. Reconnect this tenant's WhatsApp Business account.";
  }

  return error.message;
}

export function getPreferredWebhookVerifyToken() {
  return process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ?? process.env.WHATSAPP_VERIFY_TOKEN ?? null;
}

export function validateWhatsAppSendConfig(connection: WhatsAppConnectionCredentials | null): WhatsAppEnvCheck {
  const errors: string[] = [];
  const phoneNumberId = connection?.phoneNumberId ?? null;
  const accessToken = connection?.accessToken ?? null;

  if (!phoneNumberId) {
    errors.push("The tenant does not have a connected WhatsApp phone_number_id");
  }

  if (!accessToken) {
    errors.push("The tenant does not have a WhatsApp access token");
  }

  console.info("[whatsapp/send] connection check", {
    hasPhoneNumberId: Boolean(phoneNumberId),
    hasAccessToken: Boolean(accessToken),
    accessTokenLength: accessToken?.length ?? 0,
  });

  return {
    ok: errors.length === 0,
    errors,
    phoneNumberId,
    accessToken,
  };
}

export async function getWhatsAppConnectionForTenant(supabase: SupabaseClient, tenantId: string) {
  const { data, error } = await supabase
    .from("whatsapp_connections")
    .select("phone_number_id,access_token,phone_number,waba_id")
    .eq("tenant_id", tenantId)
    .eq("status", "connected")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle<{
      phone_number_id: string;
      access_token: string;
      phone_number: string | null;
      waba_id: string;
    }>();

  if (error) {
    throw new Error(`WhatsApp connection lookup failed: ${error.message}`);
  }

  return data
    ? {
        phoneNumberId: data.phone_number_id,
        accessToken: data.access_token,
        phoneNumber: data.phone_number,
        wabaId: data.waba_id,
      } satisfies WhatsAppConnectionCredentials
    : null;
}

export async function getWhatsAppConnectionForPhoneNumberId(supabase: SupabaseClient, phoneNumberId: string | null) {
  if (!phoneNumberId) {
    return null;
  }

  const { data, error } = await supabase
    .from("whatsapp_connections")
    .select("tenant_id,access_token")
    .eq("phone_number_id", phoneNumberId)
    .eq("status", "connected")
    .maybeSingle<{ tenant_id: string; access_token: string }>();

  if (error) {
    throw new Error(`WhatsApp connection lookup failed: ${error.message}`);
  }

  return data ? { tenantId: data.tenant_id, accessToken: data.access_token } : null;
}

export function normalizeWhatsAppPhone(value: string | null | undefined) {
  const normalized = (value ?? "").replace(/[^\d]/g, "");
  return normalized.length > 0 ? normalized : null;
}

export async function sendWhatsAppTextMessage({
  phoneNumberId,
  accessToken,
  to,
  body,
}: SendWhatsAppTextInput) {
  const response = await fetch(`https://graph.facebook.com/v25.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: {
        preview_url: false,
        body,
      },
    }),
  });

  const payload = (await response.json().catch(() => null)) as MetaErrorPayload | null;

  console.info("[whatsapp/send] meta response status", response.status);

  if (!response.ok) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[whatsapp/send] meta error payload", payload);
    }

    const message = payload?.error?.message ?? "WhatsApp Cloud API request failed";
    const isAuthError = isWhatsAppAuthOrAccessError(response.status, payload);

    throw new WhatsAppApiError(message, {
      status: response.status,
      payload,
      isAuthError,
    });
  }

  return payload as { messages?: { id: string }[] };
}

export async function uploadWhatsAppMedia({
  phoneNumberId,
  accessToken,
  file,
  fileName,
}: UploadWhatsAppMediaInput) {
  const formData = new FormData();
  formData.append("messaging_product", "whatsapp");
  formData.append("file", file, fileName);

  const response = await fetch(`https://graph.facebook.com/v25.0/${phoneNumberId}/media`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  const payload = (await response.json().catch(() => null)) as MetaErrorPayload | { id?: string } | null;

  console.info("[whatsapp/media] upload response status", response.status);

  if (!response.ok) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[whatsapp/media] upload error payload", payload);
    }

    const message = (payload as MetaErrorPayload | null)?.error?.message ?? "WhatsApp media upload failed";
    const isAuthError = isWhatsAppAuthOrAccessError(response.status, payload);

    throw new WhatsAppApiError(message, {
      status: response.status,
      payload,
      isAuthError,
    });
  }

  const parsed = parseWhatsAppMediaUploadResponse(payload);

  if (!parsed) {
    throw new WhatsAppApiError("WhatsApp media upload did not return a media ID", {
      status: response.status,
      payload,
      isAuthError: false,
    });
  }

  return parsed;
}

export async function sendWhatsAppAudioMessage({
  phoneNumberId,
  accessToken,
  to,
  mediaId,
}: SendWhatsAppAudioInput) {
  const response = await fetch(`https://graph.facebook.com/v25.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildWhatsAppAudioMessagePayload(to, mediaId)),
  });

  const payload = (await response.json().catch(() => null)) as MetaErrorPayload | { messages?: { id: string }[] } | null;

  console.info("[whatsapp/send-audio] meta response status", response.status);

  if (!response.ok) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[whatsapp/send-audio] meta error payload", payload);
    }

    const message = (payload as MetaErrorPayload | null)?.error?.message ?? "WhatsApp audio send failed";
    const isAuthError = isWhatsAppAuthOrAccessError(response.status, payload);

    throw new WhatsAppApiError(message, {
      status: response.status,
      payload,
      isAuthError,
    });
  }

  const parsed = parseWhatsAppSendResponse(payload);

  if (!parsed) {
    throw new WhatsAppApiError("WhatsApp audio send did not return a message ID", {
      status: response.status,
      payload,
      isAuthError: false,
    });
  }

  return { messages: [{ id: parsed.id }] };
}

export async function sendWhatsAppAttachmentMessage({
  phoneNumberId,
  accessToken,
  payload,
}: SendWhatsAppAttachmentInput) {
  const response = await fetch(`https://graph.facebook.com/v25.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const metaPayload = (await response.json().catch(() => null)) as MetaErrorPayload | { messages?: { id: string }[] } | null;

  console.info("[whatsapp/send-attachment] meta response status", response.status);

  if (!response.ok) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[whatsapp/send-attachment] meta error payload", metaPayload);
    }

    const message = (metaPayload as MetaErrorPayload | null)?.error?.message ?? "WhatsApp attachment send failed";
    const isAuthError = isWhatsAppAuthOrAccessError(response.status, metaPayload);

    throw new WhatsAppApiError(message, {
      status: response.status,
      payload: metaPayload,
      isAuthError,
    });
  }

  const parsed = parseWhatsAppSendResponse(metaPayload);

  if (!parsed) {
    throw new WhatsAppApiError("WhatsApp attachment send did not return a message ID", {
      status: response.status,
      payload: metaPayload,
      isAuthError: false,
    });
  }

  return { messages: [{ id: parsed.id }] };
}

export async function fetchWhatsAppMediaMetadata(mediaId: string, accessToken: string) {
  const response = await fetch(`https://graph.facebook.com/v25.0/${mediaId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = (await response.json().catch(() => null)) as (MetaErrorPayload & {
    id?: string;
    url?: string;
    mime_type?: string;
    sha256?: string;
    file_size?: number | string;
  }) | null;

  console.info("[whatsapp/media] metadata response status", response.status);

  if (!response.ok || !payload?.url) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[whatsapp/media] metadata error payload", payload);
    }

    const message = payload?.error?.message ?? "WhatsApp media metadata request failed";
    const isAuthError = isWhatsAppAuthOrAccessError(response.status, payload);

    throw new WhatsAppApiError(message, {
      status: response.status,
      payload,
      isAuthError,
    });
  }

  const fileSize = Number(payload.file_size);

  return {
    id: payload.id ?? mediaId,
    url: payload.url,
    mimeType: payload.mime_type ?? null,
    sha256: payload.sha256 ?? null,
    fileSize: Number.isFinite(fileSize) ? fileSize : null,
  } satisfies WhatsAppMediaMetadata;
}

export async function downloadWhatsAppMedia(mediaUrl: string, accessToken: string) {
  const response = await fetch(mediaUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  console.info("[whatsapp/media] download response status", response.status);

  if (!response.ok) {
    const payload = await response.json().catch(() => null);

    if (process.env.NODE_ENV !== "production") {
      console.error("[whatsapp/media] download error payload", payload);
    }

    throw new WhatsAppApiError("WhatsApp media download failed", {
      status: response.status,
      payload,
      isAuthError: isWhatsAppAuthOrAccessError(response.status, payload),
    });
  }

  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    mimeType: response.headers.get("content-type"),
  };
}

export function isInsideCustomerServiceWindow(lastInboundAt: string | null) {
  if (!lastInboundAt) {
    return false;
  }

  return Date.now() - new Date(lastInboundAt).getTime() < 24 * 60 * 60 * 1000;
}
