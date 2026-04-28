import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const SEEDED_COMPANY_ID = process.env.NEXT_PUBLIC_SEEDED_COMPANY_ID ?? "11111111-1111-4111-8111-111111111111";

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

  if (mode === "subscribe" && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN && challenge) {
    return new Response(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Webhook verification failed" }, { status: 403 });
}

export async function POST(request: Request) {
  const payload = await request.json();
  console.log("WhatsApp webhook POST received");
  console.log(payload);

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

  const supabase = createSupabaseAdminClient();
  const { data: insertResult, error: insertError } = await supabase
    .from("whatsapp_webhook_events")
    .insert({
      company_id: null,
      phone_number_id: phoneNumberId,
      event_type: eventType,
      whatsapp_message_id: whatsappMessageId,
      payload,
      processed_at: null,
    })
    .select("id, event_type, phone_number_id, whatsapp_message_id, created_at");

  console.log("[whatsapp/webhook] Raw event insert result", insertResult);
  console.error("[whatsapp/webhook] Raw event insert error", insertError);

  if (insertError) {
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

function normalizePhone(value: string | null) {
  return value?.replace(/[^\d]/g, "") ?? null;
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

  return type ? `[${type} message]` : null;
}

async function resolveWhatsAppAccount(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  phoneNumberId: string | null,
) {
  if (!phoneNumberId) {
    return { companyId: SEEDED_COMPANY_ID, whatsappAccountId: null };
  }

  const { data: account, error } = await supabase
    .from("whatsapp_accounts")
    .select("id,company_id")
    .eq("phone_number_id", phoneNumberId)
    .eq("active", true)
    .maybeSingle<{ id: string; company_id: string }>();

  if (error) {
    console.error("[whatsapp/webhook] WhatsApp account lookup failed", { phoneNumberId, error });
  }

  return {
    companyId: account?.company_id ?? SEEDED_COMPANY_ID,
    whatsappAccountId: account?.id ?? null,
  };
}

async function persistInboundMessage(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  value: Record<string, unknown>,
  message: Record<string, unknown>,
) {
  const whatsappMessageId = asOptionalString(message.id);
  const from = normalizePhone(asOptionalString(message.from));
  const body = getMessageBody(message);

  if (!whatsappMessageId || !from || !body) {
    console.warn("[whatsapp/webhook] Skipping inbound message with missing id/from/body", {
      whatsappMessageId,
      from,
      hasBody: Boolean(body),
    });
    return false;
  }

  const phoneNumberId = getPhoneNumberId(value);
  const { companyId, whatsappAccountId } = await resolveWhatsAppAccount(supabase, phoneNumberId);
  const contact = getContact(value, from);
  const customerName = getContactName(contact, from);
  const createdAt = getMessageCreatedAt(message);

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .upsert(
      {
        company_id: companyId,
        name: customerName,
        phone: `+${from}`,
        whatsapp_phone: from,
      },
      { onConflict: "company_id,whatsapp_phone" },
    )
    .select("id")
    .single<{ id: string }>();

  if (customerError || !customer) {
    console.error("[whatsapp/webhook] Customer upsert failed", { from, customerError });
    return false;
  }

  let conversationQuery = supabase
    .from("conversations")
    .select("id,unread_count")
    .eq("company_id", companyId)
    .eq("customer_id", customer.id)
    .limit(1);

  conversationQuery = whatsappAccountId
    ? conversationQuery.eq("whatsapp_account_id", whatsappAccountId)
    : conversationQuery.is("whatsapp_account_id", null);

  const { data: existingConversations, error: conversationLookupError } =
    await conversationQuery.returns<{ id: string; unread_count: number | null }[]>();

  if (conversationLookupError) {
    console.error("[whatsapp/webhook] Conversation lookup failed", {
      customerId: customer.id,
      conversationLookupError,
    });
    return false;
  }

  let conversation = existingConversations?.[0] ?? null;

  if (!conversation) {
    const { data: insertedConversation, error: conversationInsertError } = await supabase
      .from("conversations")
      .insert({
        company_id: companyId,
        customer_id: customer.id,
        whatsapp_account_id: whatsappAccountId,
        status: "open",
        last_message: body,
        last_message_at: createdAt,
        last_inbound_at: createdAt,
        unread_count: 0,
      })
      .select("id,unread_count")
      .single<{ id: string; unread_count: number | null }>();

    if (conversationInsertError || !insertedConversation) {
      console.error("[whatsapp/webhook] Conversation insert failed", {
        customerId: customer.id,
        conversationInsertError,
      });
      return false;
    }

    conversation = insertedConversation;
  }

  const { data: insertedMessages, error: messageError } = await supabase
    .from("messages")
    .upsert(
      {
        company_id: companyId,
        conversation_id: conversation.id,
        customer_id: customer.id,
        direction: "inbound",
        body,
        status: "received",
        whatsapp_message_id: whatsappMessageId,
        created_at: createdAt,
      },
      { onConflict: "company_id,whatsapp_message_id", ignoreDuplicates: true },
    )
    .select("id");

  if (messageError) {
    console.error("[whatsapp/webhook] Inbound message insert failed", { whatsappMessageId, messageError });
    return false;
  }

  const insertedNewMessage = (insertedMessages?.length ?? 0) > 0;

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
      .eq("id", conversation.id);

    if (updateError) {
      console.error("[whatsapp/webhook] Conversation update failed", { conversationId: conversation.id, updateError });
      return false;
    }
  }

  const { error: eventCompanyError } = await supabase
    .from("whatsapp_webhook_events")
    .update({ company_id: companyId })
    .eq("whatsapp_message_id", whatsappMessageId);

  if (eventCompanyError) {
    console.error("[whatsapp/webhook] Webhook event company update failed", { whatsappMessageId, eventCompanyError });
  }

  return true;
}

function mapWebhookStatus(status: string | null) {
  if (status === "sent" || status === "delivered" || status === "read" || status === "failed") {
    return status;
  }

  return null;
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
  const updates: Record<string, string> = { status: messageStatus };

  if (messageStatus === "delivered") {
    updates.delivered_at = timestamp;
  }

  if (messageStatus === "read") {
    updates.delivered_at = timestamp;
    updates.read_at = timestamp;
  }

  const phoneNumberId = getPhoneNumberId(value);
  const { companyId } = await resolveWhatsAppAccount(supabase, phoneNumberId);
  const { error: updateError } = await supabase
    .from("messages")
    .update(updates)
    .eq("company_id", companyId)
    .eq("whatsapp_message_id", whatsappMessageId);

  if (updateError) {
    console.error("[whatsapp/webhook] Message status update failed", { whatsappMessageId, updateError });
    return false;
  }

  const { error: eventCompanyError } = await supabase
    .from("whatsapp_webhook_events")
    .update({ company_id: companyId })
    .eq("whatsapp_message_id", whatsappMessageId);

  if (eventCompanyError) {
    console.error("[whatsapp/webhook] Status event company update failed", { whatsappMessageId, eventCompanyError });
  }

  return true;
}
