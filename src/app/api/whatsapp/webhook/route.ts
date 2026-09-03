import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  downloadWhatsAppMedia,
  fetchWhatsAppMediaMetadata,
  getPreferredWebhookVerifyToken,
  getWhatsAppAccessToken,
} from "@/lib/whatsapp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const WHATSAPP_AUDIO_BUCKET = process.env.WHATSAPP_AUDIO_BUCKET ?? "whatsapp-audio";

type WebhookEvent =
  | {
      type: "message";
      message: Record<string, unknown>;
      value: Record<string, unknown>;
    }
  | {
      type: "status";
      status: Record<string, unknown>;
      value: Record<string, unknown>;
    };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const verifyToken = getPreferredWebhookVerifyToken();

  if (mode === "subscribe" && token === verifyToken && challenge) {
    return new Response(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Webhook verification failed" }, { status: 403 });
}

export async function POST(request: Request) {
  console.info("[WhatsApp] webhook received");

  const rawBody = await request.text();

  if (!verifyWebhookSignature(request.headers, rawBody)) {
    console.error("[WhatsApp] webhook signature verification failed");
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  let payload: unknown;

  try {
    payload = JSON.parse(rawBody);
  } catch (error) {
    console.error("[WhatsApp] webhook JSON parse failed", error);
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const serviceRoleKeyConfigured = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const supabaseUrlConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

  if (!serviceRoleKeyConfigured || !supabaseUrlConfigured) {
    console.error("[whatsapp/webhook] Missing Supabase server env vars", {
      serviceRoleKeyConfigured,
      supabaseUrlConfigured,
    });
    return NextResponse.json(
      { error: "Supabase server env vars are missing for webhook persistence" },
      { status: 500 },
    );
  }

  const root = asRecord(payload);
  const firstEntry = asRecord(asArray(root.entry)[0]);
  const firstChange = asRecord(asArray(firstEntry.changes)[0]);
  const firstValue = asRecord(firstChange.value);
  const firstMessage = asRecord(asArray(firstValue.messages)[0]);
  const firstStatus = asRecord(asArray(firstValue.statuses)[0]);

  const phoneNumberId = asOptionalString(firstValue.metadata ? asRecord(firstValue.metadata).phone_number_id : undefined);
  const eventType = firstMessage.id ? "message" : firstStatus.id ? "status" : "unknown";
  const whatsappMessageId = asOptionalString(firstMessage.id ?? firstStatus.id);

  if (!phoneNumberId) {
    console.error("[WhatsApp] phone number ID is missing");
  }

  console.info(`[WhatsApp] receiving phone_number_id = ${phoneNumberId ?? "missing"}`);

  const supabase = createSupabaseAdminClient();
  const initialTenantId = await resolveTenant(supabase, phoneNumberId);
  const { data: insertResult, error: insertError } = await supabase
    .from("whatsapp_webhook_events")
    .insert({
      tenant_id: initialTenantId,
      phone_number_id: phoneNumberId,
      event_type: eventType,
      whatsapp_message_id: whatsappMessageId,
      payload,
      processed_at: null,
    })
    .select("id, event_type, phone_number_id, whatsapp_message_id, created_at");

  if (insertError) {
    console.error("[WhatsApp] webhook event insert failed", {
      phoneNumberId,
      eventType,
      whatsappMessageId,
      error: insertError,
    });

    return NextResponse.json(
      {
        error: "Failed to persist WhatsApp webhook event",
        details: insertError.message,
      },
      { status: 500 },
    );
  }

  const entries = asArray(root.entry);
  const events: WebhookEvent[] = entries.flatMap((entry) =>
    asArray(asRecord(entry).changes).flatMap((change) => {
      const value = asRecord(asRecord(change).value);
      return [
        ...asArray(value.messages).map((message) => ({ type: "message" as const, message: asRecord(message), value })),
        ...asArray(value.statuses).map((status) => ({ type: "status" as const, status: asRecord(status), value })),
      ];
    }),
  );

  if (events.length === 0) {
    console.info("[WhatsApp] webhook payload is not a message/status event", {
      phoneNumberId,
      eventType,
    });
  }

  const processed = {
    messages: 0,
    statuses: 0,
    skipped: 0,
  };

  for (const event of events) {
    if (event.type === "message") {
      const saved = await persistInboundMessage(supabase, event.value, event.message);
      if (saved) {
        processed.messages += 1;
      } else {
        processed.skipped += 1;
      }
    } else {
      const updated = await persistMessageStatus(supabase, event.value, event.status);
      if (updated) {
        processed.statuses += 1;
      } else {
        processed.skipped += 1;
      }
    }
  }

  if (insertResult?.[0]?.id) {
    const { error: processedAtError } = await supabase
      .from("whatsapp_webhook_events")
      .update({ processed_at: new Date().toISOString() })
      .eq("id", insertResult[0].id);

    if (processedAtError) {
      console.error("[whatsapp/webhook] Raw event processed_at update failed", processedAtError);
    }
  }

  return NextResponse.json({ received: true, events: events.length, processed });
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function isMissingMessageMediaSchema(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const record = error as { code?: unknown; message?: unknown };
  const message = typeof record.message === "string" ? record.message : "";

  return (
    record.code === "PGRST204" ||
    record.code === "42703" ||
    message.includes("message_type") ||
    message.includes("media_") ||
    message.includes("schema cache")
  );
}

function getWebhookAppSecret() {
  return process.env.WHATSAPP_APP_SECRET ?? process.env.META_APP_SECRET ?? null;
}

function verifyWebhookSignature(headers: Headers, rawBody: string) {
  const appSecret = getWebhookAppSecret();

  if (!appSecret) {
    console.warn("[WhatsApp] webhook signature validation skipped: no app secret configured");
    return true;
  }

  const signatureHeader = headers.get("x-hub-signature-256");

  if (!signatureHeader) {
    console.error("[WhatsApp] webhook signature header is missing");
    return false;
  }

  const expected = `sha256=${createHmac("sha256", appSecret).update(rawBody).digest("hex")}`;
  const actualBuffer = Buffer.from(signatureHeader);
  const expectedBuffer = Buffer.from(expected);

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer);
}

function normalizePhone(value: string | null) {
  return value?.replace(/[^\d]/g, "") ?? null;
}

function maskPhoneForLogs(value: string | null) {
  if (!value) {
    return "missing";
  }

  return `***${value.slice(-4)}`;
}

function getPhoneNumberId(value: Record<string, unknown>) {
  return asOptionalString(asRecord(value.metadata).phone_number_id);
}

function getMessageCreatedAt(message: Record<string, unknown>) {
  const timestamp = asOptionalString(message.timestamp);
  const seconds = timestamp ? Number(timestamp) : NaN;

  return Number.isFinite(seconds) && seconds > 0 ? new Date(seconds * 1000).toISOString() : new Date().toISOString();
}

function getContact(value: Record<string, unknown>, waId: string | null) {
  const contacts = asArray(value.contacts).map(asRecord);
  return contacts.find((contact) => asOptionalString(contact.wa_id) === waId) ?? contacts[0] ?? {};
}

function getContactName(contact: Record<string, unknown>, waId: string) {
  const profileName = asOptionalString(asRecord(contact.profile).name);
  return profileName ?? `WhatsApp ${waId}`;
}

function getMessageBody(message: Record<string, unknown>) {
  const type = asOptionalString(message.type);

  if (type === "text") {
    return asOptionalString(asRecord(message.text).body);
  }

  if (type === "button") {
    return asOptionalString(asRecord(message.button).text);
  }

  if (type === "interactive") {
    const interactive = asRecord(message.interactive);
    return (
      asOptionalString(asRecord(interactive.button_reply).title) ??
      asOptionalString(asRecord(interactive.list_reply).title)
    );
  }

  if (type === "audio") {
    return "🎤 Voice message";
  }

  return type ? `[${type} message]` : null;
}

function getMessageType(message: Record<string, unknown>) {
  const type = asOptionalString(message.type);

  if (type === "audio") {
    return "audio";
  }

  if (type === "text" || type === "button" || type === "interactive") {
    return "text";
  }

  return "unsupported";
}

function getAudioPayload(message: Record<string, unknown>) {
  if (asOptionalString(message.type) !== "audio") {
    return null;
  }

  const audio = asRecord(message.audio);
  return {
    mediaId: asOptionalString(audio.id),
    mimeType: asOptionalString(audio.mime_type),
    sha256: asOptionalString(audio.sha256),
    isVoice: audio.voice === true,
  };
}

function getAudioExtension(mimeType: string | null) {
  if (!mimeType) {
    return "ogg";
  }

  if (mimeType.includes("mpeg")) return "mp3";
  if (mimeType.includes("mp4")) return "m4a";
  if (mimeType.includes("aac")) return "aac";
  if (mimeType.includes("amr")) return "amr";
  if (mimeType.includes("webm")) return "webm";
  if (mimeType.includes("ogg") || mimeType.includes("opus")) return "ogg";

  return "audio";
}

async function uploadAudioMedia({
  supabase,
  tenantId,
  conversationId,
  whatsappMessageId,
  mediaId,
  webhookMimeType,
  webhookSha256,
}: {
  supabase: ReturnType<typeof createSupabaseAdminClient>;
  tenantId: string;
  conversationId: string;
  whatsappMessageId: string;
  mediaId: string;
  webhookMimeType: string | null;
  webhookSha256: string | null;
}) {
  const accessToken = getWhatsAppAccessToken();

  if (!accessToken) {
      return {
        mediaId,
        mimeType: webhookMimeType,
        sha256: webhookSha256,
        fileSize: null,
        storageBucket: null,
        storagePath: null,
        fileName: null,
      error: "Missing WHATSAPP_ACCESS_TOKEN",
    };
  }

  try {
    const metadata = await fetchWhatsAppMediaMetadata(mediaId, accessToken);
    const downloaded = await downloadWhatsAppMedia(metadata.url, accessToken);
    const mimeType = metadata.mimeType ?? downloaded.mimeType ?? webhookMimeType ?? "audio/ogg";
    const fileName = `${whatsappMessageId}.${getAudioExtension(mimeType)}`;
    const storagePath = `${tenantId}/${conversationId}/${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from(WHATSAPP_AUDIO_BUCKET)
      .upload(storagePath, downloaded.buffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      console.error("[WhatsApp] audio upload failed", {
        tenantId,
        conversationId,
        whatsappMessageId,
        storagePath,
        error: uploadError,
      });

      return {
        mediaId: metadata.id,
        mimeType,
        sha256: metadata.sha256 ?? webhookSha256,
        fileSize: metadata.fileSize,
        storageBucket: null,
        storagePath: null,
        fileName,
        error: uploadError.message,
      };
    }

    console.info("[WhatsApp] audio stored", {
      tenantId,
      conversationId,
      whatsappMessageId,
      storagePath,
      mimeType,
      fileSize: metadata.fileSize,
    });

    return {
      mediaId: metadata.id,
      mimeType,
      sha256: metadata.sha256 ?? webhookSha256,
      fileSize: metadata.fileSize,
      storageBucket: WHATSAPP_AUDIO_BUCKET,
      storagePath,
      fileName,
      error: null,
    };
  } catch (error) {
    console.error("[WhatsApp] audio retrieval failed", {
      tenantId,
      conversationId,
      whatsappMessageId,
      mediaId,
      error,
    });

    return {
      mediaId,
      mimeType: webhookMimeType,
      sha256: webhookSha256,
      fileSize: null,
      storageBucket: null,
      storagePath: null,
      fileName: null,
      error: error instanceof Error ? error.message : "Audio retrieval failed",
    };
  }
}

async function resolveTenant(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  phoneNumberId: string | null,
) {
  if (!phoneNumberId) {
    console.error("[WhatsApp] phone number ID is missing");
    return null;
  }

  const { data: tenant, error } = await supabase
    .from("tenants")
    .select("id")
    .eq("whatsapp_phone_number_id", phoneNumberId)
    .maybeSingle<{ id: string }>();

  if (error) {
    console.error("[whatsapp/webhook] Tenant lookup failed", { phoneNumberId, error });
  }

  if (!tenant?.id) {
    console.error("[WhatsApp] tenant not found:", phoneNumberId);
    return null;
  }

  console.info(`[WhatsApp] tenant resolved = ${tenant.id}`);

  return tenant.id;
}

async function persistInboundMessage(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  value: Record<string, unknown>,
  message: Record<string, unknown>,
) {
  const whatsappMessageId = asOptionalString(message.id);
  const from = normalizePhone(asOptionalString(message.from));
  const body = getMessageBody(message);
  const messageType = getMessageType(message);
  const audioPayload = getAudioPayload(message);
  const phoneNumberId = getPhoneNumberId(value);

  console.info("[WhatsApp] message id =", whatsappMessageId ?? "missing");
  console.info(`[WhatsApp] sender = ${maskPhoneForLogs(from)}`);

  if (!whatsappMessageId || !from || !body) {
    console.warn("[whatsapp/webhook] Skipping inbound message with missing id/from/body", {
      whatsappMessageId,
      from,
      hasBody: Boolean(body),
    });
    return false;
  }

  const tenantId = await resolveTenant(supabase, phoneNumberId);

  if (!tenantId) {
    console.warn("[whatsapp/webhook] No tenant matches metadata.phone_number_id", { phoneNumberId });
    return false;
  }

  const { data: existingMessage, error: existingMessageError } = await supabase
    .from("messages")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("whatsapp_message_id", whatsappMessageId)
    .maybeSingle<{ id: string }>();

  if (existingMessageError) {
    console.error("[WhatsApp] existing message lookup failed", { whatsappMessageId, error: existingMessageError });
    return false;
  }

  if (existingMessage) {
    console.info(`[WhatsApp] message saved = duplicate`, { whatsappMessageId, inserted: false });
    return true;
  }

  const contact = getContact(value, from);
  const customerName = getContactName(contact, from);
  const createdAt = getMessageCreatedAt(message);

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .upsert(
      {
        tenant_id: tenantId,
        name: customerName,
        phone: `+${from}`,
        whatsapp_phone: from,
      },
      { onConflict: "tenant_id,whatsapp_phone" },
    )
    .select("id")
    .single<{ id: string }>();

  if (customerError || !customer) {
    console.error("[WhatsApp] customer upsert failed", { from, error: customerError });
    return false;
  }

  const conversationQuery = supabase
    .from("conversations")
    .select("id,unread_count")
    .eq("tenant_id", tenantId)
    .eq("customer_id", customer.id)
    .limit(1);

  const { data: existingConversations, error: conversationLookupError } =
    await conversationQuery.returns<{ id: string; unread_count: number | null }[]>();

  if (conversationLookupError) {
    console.error("[WhatsApp] conversation lookup failed", {
      customerId: customer.id,
      error: conversationLookupError,
    });
    return false;
  }

  let conversation = existingConversations?.[0] ?? null;

  if (!conversation) {
    const { data: insertedConversation, error: conversationInsertError } = await supabase
      .from("conversations")
      .insert({
        tenant_id: tenantId,
        customer_id: customer.id,
        status: "open",
        last_message: body,
        last_message_at: createdAt,
        last_inbound_at: createdAt,
        unread_count: 0,
      })
      .select("id,unread_count")
      .single<{ id: string; unread_count: number | null }>();

    if (conversationInsertError || !insertedConversation) {
      console.error("[WhatsApp] conversation insert failed", {
        customerId: customer.id,
        error: conversationInsertError,
      });
      return false;
    }

    conversation = insertedConversation;
  }

  console.info(`[WhatsApp] conversation created/found = ${conversation.id}`);

  const audioMedia = audioPayload?.mediaId
    ? await uploadAudioMedia({
        supabase,
        tenantId,
        conversationId: conversation.id,
        whatsappMessageId,
        mediaId: audioPayload.mediaId,
        webhookMimeType: audioPayload.mimeType,
        webhookSha256: audioPayload.sha256,
      })
    : null;

  const messagePayload = {
    tenant_id: tenantId,
    conversation_id: conversation.id,
    customer_id: customer.id,
    message_type: messageType,
    direction: "inbound",
    body,
    status: "received",
    whatsapp_message_id: whatsappMessageId,
    media_id: audioMedia?.mediaId ?? audioPayload?.mediaId ?? null,
    media_mime_type: audioMedia?.mimeType ?? audioPayload?.mimeType ?? null,
    media_sha256: audioMedia?.sha256 ?? audioPayload?.sha256 ?? null,
    media_is_voice: audioPayload?.isVoice ?? false,
    media_duration_seconds: null,
    media_file_size: audioMedia?.fileSize ?? null,
    media_storage_bucket: audioMedia?.storageBucket ?? null,
    media_storage_path: audioMedia?.storagePath ?? null,
    media_file_name: audioMedia?.fileName ?? null,
    media_error: audioMedia?.error ?? (!audioPayload?.mediaId && messageType === "audio" ? "Missing WhatsApp audio media ID" : null),
    created_at: createdAt,
  };

  let insertResponse = await supabase
    .from("messages")
    .upsert(
      messagePayload,
      { onConflict: "tenant_id,whatsapp_message_id", ignoreDuplicates: true },
    )
    .select("id");

  if (insertResponse.error && isMissingMessageMediaSchema(insertResponse.error)) {
    console.warn("[WhatsApp] message media columns missing; falling back to legacy message insert");
    insertResponse = await supabase
      .from("messages")
      .upsert(
        {
          tenant_id: tenantId,
          conversation_id: conversation.id,
          customer_id: customer.id,
          direction: "inbound",
          body,
          status: "received",
          whatsapp_message_id: whatsappMessageId,
          created_at: createdAt,
        },
        { onConflict: "tenant_id,whatsapp_message_id", ignoreDuplicates: true },
      )
      .select("id");
  }

  const { data: insertedMessages, error: messageError } = insertResponse;

  if (messageError) {
    console.error("[WhatsApp] message insert failed", { whatsappMessageId, error: messageError });
    return false;
  }

  const insertedNewMessage = (insertedMessages?.length ?? 0) > 0;
  console.info(
    `[WhatsApp] message saved = ${insertedMessages?.[0]?.id ?? "duplicate"}`,
    { whatsappMessageId, inserted: insertedNewMessage },
  );

  if (insertedNewMessage) {
    const { error: updateError } = await supabase
      .from("conversations")
      .update({
        last_message: body,
        last_message_at: createdAt,
        last_inbound_at: createdAt,
        unread_count: (conversation.unread_count ?? 0) + 1,
        status: "open",
        updated_at: createdAt,
      })
      .eq("id", conversation.id)
      .eq("tenant_id", tenantId);

    if (updateError) {
      console.error("[WhatsApp] conversation update failed", { conversationId: conversation.id, error: updateError });
      return false;
    }
  }

  const { error: eventTenantError } = await supabase
    .from("whatsapp_webhook_events")
    .update({ tenant_id: tenantId })
    .eq("whatsapp_message_id", whatsappMessageId);

  if (eventTenantError) {
    console.error("[whatsapp/webhook] Webhook event tenant update failed", { whatsappMessageId, eventTenantError });
  }

  return true;
}

function mapWebhookStatus(status: string | null) {
  if (status === "sent" || status === "delivered" || status === "read" || status === "failed") {
    return status;
  }

  return null;
}

function getStatusErrorMessage(status: Record<string, unknown>) {
  const errors = asArray(status.errors).map(asRecord);
  const firstError = errors[0];

  if (!firstError) {
    return null;
  }

  const code = firstError.code;
  const codeText =
    typeof code === "number" || typeof code === "string"
      ? `#${code}`
      : null;
  const details = asOptionalString(asRecord(firstError.error_data).details);
  const messageParts = [
    codeText,
    asOptionalString(firstError.title),
    asOptionalString(firstError.message),
    details,
  ].filter(Boolean);

  return messageParts.length > 0 ? messageParts.join(" - ") : "WhatsApp delivery failed";
}

async function persistMessageStatus(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  value: Record<string, unknown>,
  status: Record<string, unknown>,
) {
  const whatsappMessageId = asOptionalString(status.id);
  const messageStatus = mapWebhookStatus(asOptionalString(status.status));

  if (!whatsappMessageId || !messageStatus) {
    console.warn("[whatsapp/webhook] Skipping status with missing id/status", {
      whatsappMessageId,
      status: status.status,
    });
    return false;
  }

  const timestamp = getMessageCreatedAt(status);
  const updates: Record<string, string | null> = { status: messageStatus };

  if (messageStatus === "delivered") {
    updates.delivered_at = timestamp;
  }

  if (messageStatus === "read") {
    updates.delivered_at = timestamp;
    updates.read_at = timestamp;
  }

  if (messageStatus === "failed") {
    updates.media_error = getStatusErrorMessage(status) ?? "WhatsApp delivery failed";
  }

  const phoneNumberId = getPhoneNumberId(value);
  const tenantId = await resolveTenant(supabase, phoneNumberId);

  if (!tenantId) {
    console.warn("[whatsapp/webhook] No tenant matches status metadata.phone_number_id", { phoneNumberId });
    return false;
  }

  const { error: updateError } = await supabase
    .from("messages")
    .update(updates)
    .eq("tenant_id", tenantId)
    .eq("whatsapp_message_id", whatsappMessageId);

  if (updateError) {
    console.error("[whatsapp/webhook] Message status update failed", { whatsappMessageId, updateError });
    return false;
  }

  const { error: eventTenantError } = await supabase
    .from("whatsapp_webhook_events")
    .update({ tenant_id: tenantId })
    .eq("whatsapp_message_id", whatsappMessageId);

  if (eventTenantError) {
    console.error("[whatsapp/webhook] Status event tenant update failed", { whatsappMessageId, eventTenantError });
  }

  return true;
}
