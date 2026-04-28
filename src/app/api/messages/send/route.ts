import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  isInsideCustomerServiceWindow,
  normalizeWhatsAppPhone,
  sendWhatsAppTextMessage,
  validateWhatsAppSendEnv,
  WhatsAppApiError,
} from "@/lib/whatsapp";

const sendSchema = z.object({
  conversationId: z.string().uuid(),
  body: z.string().trim().min(1).max(4096),
});

type DbConversation = {
  id: string;
  company_id: string;
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
  company_id: string;
  conversation_id: string;
  customer_id: string;
  direction: "inbound" | "outbound";
  body: string;
  status: "received" | "sent" | "delivered" | "read" | "failed";
  whatsapp_message_id: string | null;
  created_at: string;
};

function normalizeSupabaseUrl(value?: string) {
  if (!value) {
    return value;
  }

  return new URL(value).origin;
}

function getSupabase() {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return null;
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function POST(request: Request) {
  const parsed = sendSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid send-message payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const supabase = getSupabase();

  if (!supabase) {
    console.error("[messages/send] Missing Supabase env vars. Cannot persist outgoing message.");
    return NextResponse.json(
      { error: "Supabase is not configured, so the outgoing message cannot be saved." },
      { status: 500 },
    );
  }

  try {
    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select("id,company_id,customer_id,last_inbound_at,last_message_at")
      .eq("id", input.conversationId)
      .single<DbConversation>();

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

    const env = validateWhatsAppSendEnv();

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
      console.error("[messages/send] WhatsApp env vars missing.", {
        errors: env.errors,
      });
      return NextResponse.json(
        {
          error: `WhatsApp send is not configured: ${env.errors.join(", ")}. Restart the dev server after updating .env.local.`,
        },
        { status: 500 },
      );
    }

    const { data: message, error: messageError } = await supabase
      .from("messages")
      .insert({
        company_id: conversation.company_id,
        conversation_id: conversation.id,
        customer_id: conversation.customer_id,
        direction: "outbound",
        body: input.body,
        status,
        whatsapp_message_id: whatsappMessageId,
      })
      .select("id,company_id,conversation_id,customer_id,direction,body,status,whatsapp_message_id,created_at")
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
        companyId: message.company_id,
        conversationId: message.conversation_id,
        customerId: message.customer_id,
        direction: message.direction,
        body: message.body,
        status: message.status,
        whatsappMessageId: message.whatsapp_message_id,
        createdAt: message.created_at,
      },
    });
  } catch (error) {
    console.error("[messages/send] Unexpected failure", error);

    if (error instanceof WhatsAppApiError) {
      if (error.isAuthError) {
        return NextResponse.json(
          {
            error: "WhatsApp authentication failed. Regenerate WHATSAPP_ACCESS_TOKEN in Meta API Setup and restart dev server.",
            details: process.env.NODE_ENV !== "production" ? error.payload : undefined,
          },
          { status: 401 },
        );
      }

      return NextResponse.json(
        {
          error: error.message,
          details: process.env.NODE_ENV !== "production" ? error.payload : undefined,
        },
        { status: error.status || 500 },
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unexpected send-message failure",
      },
      { status: 500 },
    );
  }
}
