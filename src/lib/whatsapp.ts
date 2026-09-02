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

export function getPreferredWebhookVerifyToken() {
  return process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ?? process.env.WHATSAPP_VERIFY_TOKEN ?? null;
}

export function getWhatsAppAccessToken() {
  return process.env.WHATSAPP_ACCESS_TOKEN?.trim() || null;
}

export function validateWhatsAppSendEnv(phoneNumberId: string | null): WhatsAppEnvCheck {
  const accessToken = getWhatsAppAccessToken();
  const errors: string[] = [];

  if (!phoneNumberId) {
    errors.push("The tenant does not have a WhatsApp phone_number_id configured");
  }

  if (!accessToken) {
    errors.push("Missing WHATSAPP_ACCESS_TOKEN");
  }

  console.info("[whatsapp/send] env check", {
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
    const isAuthError =
      response.status === 401 ||
      response.status === 403 ||
      payload?.error?.code === 190;

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
  mimeType,
}: UploadWhatsAppMediaInput) {
  const formData = new FormData();
  formData.append("messaging_product", "whatsapp");
  formData.append("type", mimeType);
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
    const isAuthError =
      response.status === 401 ||
      response.status === 403 ||
      (payload as MetaErrorPayload | null)?.error?.code === 190;

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
    const isAuthError =
      response.status === 401 ||
      response.status === 403 ||
      (payload as MetaErrorPayload | null)?.error?.code === 190;

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
    const isAuthError =
      response.status === 401 ||
      response.status === 403 ||
      (metaPayload as MetaErrorPayload | null)?.error?.code === 190;

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
    const isAuthError =
      response.status === 401 ||
      response.status === 403 ||
      payload?.error?.code === 190;

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
      isAuthError: response.status === 401 || response.status === 403,
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
