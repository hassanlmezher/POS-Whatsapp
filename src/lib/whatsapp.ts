type SendWhatsAppTextInput = {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  body: string;
};

type WhatsAppEnvCheck = {
  ok: boolean;
  errors: string[];
  phoneNumberId: string | null;
  accessToken: string | null;
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

export function validateWhatsAppSendEnv(): WhatsAppEnvCheck {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() || null;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim() || null;
  const errors: string[] = [];

  if (!phoneNumberId) {
    errors.push("Missing WHATSAPP_PHONE_NUMBER_ID");
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

export function isInsideCustomerServiceWindow(lastInboundAt: string | null) {
  if (!lastInboundAt) {
    return false;
  }

  return Date.now() - new Date(lastInboundAt).getTime() < 24 * 60 * 60 * 1000;
}
