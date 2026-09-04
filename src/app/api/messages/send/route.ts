import { NextResponse } from "next/server";
import { z } from "zod";
import {
  formatWhatsAppApiErrorForUser,
  getWhatsAppConnectionForTenant,
  isInsideCustomerServiceWindow,
  normalizeWhatsAppPhone,
  sendWhatsAppTextMessage,
  validateWhatsAppSendConfig,
  WhatsAppApiError,
} from "@/lib/whatsapp";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getTenantContext, tenantContextErrorStatus } from "@/lib/tenant-context";

const sendSchema = z.object({
  conversationId: z.string().uuid(),
  body: z.string().trim().min(1).max(4096),
});

type DbConversation = {
  id: string;
  tenant_id: string;
  customer_id: string;
  last_inbound_at: string | null;
  last_message_at: string | null;
};

type DbCustomer = {
  id: string;
  phone: string | null;
  whatsapp_phone: string | null;
};

type DbMessage = {
  id: string;
  tenant_id: string;
  conversation_id: string;
  customer_id: string;
  direction: "inbound" | "outbound";
  body: string;
  status: "received" | "sent" | "delivered" | "read" | "failed";
  whatsapp_message_id: string | null;
  created_at: string;
};

export async function POST(request: Request) {
  const parsed = sendSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid send-message payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const input = parsed.data;
    const { tenant } = await getTenantContext();
    const supabase = createSupabaseAdminClient();
    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select("id,tenant_id,customer_id,last_inbound_at,last_message_at")
      .eq("id", input.conversationId)
      .eq("tenant_id", tenant.id)
      .maybeSingle<DbConversation>();

    if (conversationError || !conversation) {
      console.error("[messages/send] Conversation lookup failed", {
        conversationId: input.conversationId,
        conversationError,
      });
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id,phone,whatsapp_phone")
      .eq("id", conversation.customer_id)
      .eq("tenant_id", tenant.id)
      .single<DbCustomer>();

    if (customerError || !customer) {
      console.error("[messages/send] Customer lookup failed", {
        customerId: conversation.customer_id,
        customerError,
      });
      return NextResponse.json({ error: "Customer not found for conversation" }, { status: 404 });
    }

    let whatsappMessageId: string | null = null;
    const status: DbMessage["status"] = "sent";
    const recipientPhone = normalizeWhatsAppPhone(customer.whatsapp_phone) ?? normalizeWhatsAppPhone(customer.phone);

    console.info("[whatsapp/send] recipient", {
      conversationId: conversation.id,
      customerId: customer.id,
      phone: customer.phone,
      whatsappPhone: customer.whatsapp_phone,
      normalizedRecipientPhone: recipientPhone,
    });

    if (!recipientPhone) {
      return NextResponse.json(
        { error: "Customer does not have a valid WhatsApp phone number." },
        { status: 400 },
      );
    }

    const env = validateWhatsAppSendConfig(await getWhatsAppConnectionForTenant(supabase, tenant.id));

    if (env.ok && env.phoneNumberId && env.accessToken) {
      if (!isInsideCustomerServiceWindow(conversation.last_inbound_at ?? conversation.last_message_at)) {
        return NextResponse.json(
          { error: "Outside the 24-hour WhatsApp service window. Use a template message." },
          { status: 409 },
        );
      }

      const result = await sendWhatsAppTextMessage({
        phoneNumberId: env.phoneNumberId,
        accessToken: env.accessToken,
        to: recipientPhone,
        body: input.body,
      });
      whatsappMessageId = result.messages?.[0]?.id ?? null;
    } else {
      console.error("[messages/send] WhatsApp connection missing.", {
        errors: env.errors,
      });
      return NextResponse.json(
        {
          error: `WhatsApp send is not configured: ${env.errors.join(", ")}.`,
        },
        { status: 500 },
      );
    }

    const { data: message, error: messageError } = await supabase
      .from("messages")
      .insert({
        tenant_id: conversation.tenant_id,
        conversation_id: conversation.id,
        customer_id: conversation.customer_id,
        direction: "outbound",
        body: input.body,
        status,
        whatsapp_message_id: whatsappMessageId,
      })
      .select("id,tenant_id,conversation_id,customer_id,direction,body,status,whatsapp_message_id,created_at")
      .single<DbMessage>();

    if (messageError || !message) {
      console.error("[messages/send] Message insert failed", {
        conversationId: conversation.id,
        messageError,
      });
      return NextResponse.json({ error: "Could not save outgoing message" }, { status: 500 });
    }

    const { error: updateError } = await supabase
      .from("conversations")
      .update({
        last_message: input.body,
        last_message_at: message.created_at,
        unread_count: 0,
        status: "open",
        updated_at: message.created_at,
      })
      .eq("id", conversation.id);

    if (updateError) {
      console.error("[messages/send] Conversation update failed", {
        conversationId: conversation.id,
        updateError,
      });
      return NextResponse.json({ error: "Message saved but conversation could not be updated" }, { status: 500 });
    }

    return NextResponse.json({
      message: {
        id: message.id,
        companyId: message.tenant_id,
        conversationId: message.conversation_id,
        customerId: message.customer_id,
        messageType: "text",
        direction: message.direction,
        body: message.body,
        status: message.status,
        whatsappMessageId: message.whatsapp_message_id,
        audio: null,
        attachment: null,
        createdAt: message.created_at,
      },
    });
  } catch (error) {
    console.error("[messages/send] Unexpected failure", error);

    if (error instanceof WhatsAppApiError) {
      return NextResponse.json(
        {
          error: formatWhatsAppApiErrorForUser(error),
          details: process.env.NODE_ENV !== "production" ? error.payload : undefined,
        },
        { status: error.status || 500 },
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unexpected send-message failure",
      },
      { status: tenantContextErrorStatus(error) },
    );
  }
}
