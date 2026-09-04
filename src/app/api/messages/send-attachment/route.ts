import { NextResponse } from "next/server";
import { z } from "zod";
import {
  formatWhatsAppApiErrorForUser,
  getWhatsAppConnectionForTenant,
  isInsideCustomerServiceWindow,
  normalizeWhatsAppPhone,
  sendWhatsAppAttachmentMessage,
  uploadWhatsAppMedia,
  validateWhatsAppSendConfig,
  WhatsAppApiError,
} from "@/lib/whatsapp";
import {
  buildAttachmentStoragePath,
  buildWhatsAppAttachmentMessagePayload,
  sanitizeFileName,
  validateAttachmentUpload,
  WHATSAPP_MEDIA_BUCKET,
  type AttachmentKind,
} from "@/lib/whatsapp-attachments";
import { conversationBelongsToTenant } from "@/lib/whatsapp-audio";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getTenantContext, tenantContextErrorStatus } from "@/lib/tenant-context";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const formSchema = z.object({
  conversationId: z.string().uuid(),
  messageId: z.string().uuid(),
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

type DbAttachmentMessage = {
  id: string;
  tenant_id: string;
  conversation_id: string;
  customer_id: string;
  message_type: AttachmentKind;
  direction: "inbound" | "outbound";
  body: string;
  status: "received" | "sent" | "delivered" | "read" | "failed";
  whatsapp_message_id: string | null;
  media_id: string | null;
  media_mime_type: string | null;
  media_sha256: string | null;
  media_file_size: number | string | null;
  media_storage_bucket: string | null;
  media_storage_path: string | null;
  media_file_name: string | null;
  media_error: string | null;
  created_at: string;
};

function asOptionalString(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asAttachmentFile(value: FormDataEntryValue | null) {
  return value instanceof File ? value : null;
}

function mapAttachmentMessage(row: DbAttachmentMessage) {
  const fileSize = Number(row.media_file_size);
  const hasStorage = Boolean(row.media_storage_bucket && row.media_storage_path);

  return {
    id: row.id,
    companyId: row.tenant_id,
    conversationId: row.conversation_id,
    customerId: row.customer_id,
    messageType: row.message_type,
    direction: row.direction,
    body: row.body,
    status: row.status,
    whatsappMessageId: row.whatsapp_message_id,
    audio: null,
    attachment: {
      mediaId: row.media_id,
      mimeType: row.media_mime_type,
      sha256: row.media_sha256,
      fileSize: Number.isFinite(fileSize) ? fileSize : null,
      fileName: row.media_file_name,
      storageBucket: row.media_storage_bucket,
      storagePath: row.media_storage_path,
      error: row.media_error,
      url: hasStorage ? `/api/messages/${row.id}/attachment` : null,
    },
    createdAt: row.created_at,
  };
}

async function persistAttachmentMessage(input: {
  supabase: ReturnType<typeof createSupabaseAdminClient>;
  messageId: string;
  tenantId: string;
  conversationId: string;
  customerId: string;
  kind: AttachmentKind;
  status: "sent" | "failed";
  whatsappMessageId?: string | null;
  mediaId?: string | null;
  mimeType: string;
  fileSize: number;
  storagePath: string;
  fileName: string;
  mediaError?: string | null;
}) {
  const { data: message, error: messageError } = await input.supabase
    .from("messages")
    .upsert(
      {
        id: input.messageId,
        tenant_id: input.tenantId,
        conversation_id: input.conversationId,
        customer_id: input.customerId,
        message_type: input.kind,
        direction: "outbound",
        body: "📎 Attachment",
        status: input.status,
        whatsapp_message_id: input.whatsappMessageId ?? null,
        media_id: input.mediaId ?? null,
        media_mime_type: input.mimeType,
        media_sha256: null,
        media_is_voice: false,
        media_duration_seconds: null,
        media_file_size: input.fileSize,
        media_storage_bucket: WHATSAPP_MEDIA_BUCKET,
        media_storage_path: input.storagePath,
        media_file_name: input.fileName,
        media_error: input.mediaError ?? null,
      },
      { onConflict: "id" },
    )
    .select(
      "id,tenant_id,conversation_id,customer_id,message_type,direction,body,status,whatsapp_message_id,media_id,media_mime_type,media_sha256,media_file_size,media_storage_bucket,media_storage_path,media_file_name,media_error,created_at",
    )
    .single<DbAttachmentMessage>();

  if (messageError || !message) {
    console.error("[messages/send-attachment] Attachment message persistence failed", {
      conversationId: input.conversationId,
      messageId: input.messageId,
      status: input.status,
      error: messageError,
    });
    return null;
  }

  const { error: updateError } = await input.supabase
    .from("conversations")
    .update({
      last_message: input.status === "sent" ? "📎 Attachment" : "📎 Attachment failed",
      last_message_at: message.created_at,
      unread_count: 0,
      status: "open",
      updated_at: message.created_at,
    })
    .eq("id", input.conversationId)
    .eq("tenant_id", input.tenantId);

  if (updateError) {
    console.error("[messages/send-attachment] Conversation update failed", {
      conversationId: input.conversationId,
      updateError,
    });
  }

  return message;
}

export async function POST(request: Request) {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart form data" }, { status: 400 });
  }

  const file = asAttachmentFile(formData.get("file"));
  const parsed = formSchema.safeParse({
    conversationId: asOptionalString(formData.get("conversationId")),
    messageId: asOptionalString(formData.get("messageId")),
  });

  if (!parsed.success || !file) {
    return NextResponse.json(
      { error: "Invalid send-attachment payload", details: parsed.success ? undefined : parsed.error.flatten() },
      { status: 400 },
    );
  }

  const validation = validateAttachmentUpload({
    mimeType: file.type,
    size: file.size,
  });

  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: validation.status });
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

    if (conversationError || !conversation || !conversationBelongsToTenant(conversation, tenant.id)) {
      console.warn("[messages/send-attachment] Conversation rejected", {
        conversationId: input.conversationId,
        tenantId: tenant.id,
        error: conversationError,
      });
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const { data: existingMessage, error: existingMessageError } = await supabase
      .from("messages")
      .select(
        "id,tenant_id,conversation_id,customer_id,message_type,direction,body,status,whatsapp_message_id,media_id,media_mime_type,media_sha256,media_file_size,media_storage_bucket,media_storage_path,media_file_name,media_error,created_at",
      )
      .eq("id", input.messageId)
      .eq("tenant_id", tenant.id)
      .eq("conversation_id", conversation.id)
      .maybeSingle<DbAttachmentMessage>();

    if (existingMessageError) {
      console.error("[messages/send-attachment] Existing message lookup failed", {
        messageId: input.messageId,
        error: existingMessageError,
      });
      return NextResponse.json({ error: "Could not validate attachment retry" }, { status: 500 });
    }

    if (
      existingMessage &&
      existingMessage.message_type !== "image" &&
      existingMessage.message_type !== "document"
    ) {
      return NextResponse.json({ error: "Message id already belongs to a non-attachment message" }, { status: 409 });
    }

    if (existingMessage && existingMessage.status !== "failed") {
      return NextResponse.json({ message: mapAttachmentMessage(existingMessage), idempotent: true });
    }

    if (existingMessage && existingMessage.status === "failed" && existingMessage.message_type !== validation.kind) {
      return NextResponse.json({ error: "Attachment retry must use the same file type" }, { status: 409 });
    }

    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id,phone,whatsapp_phone")
      .eq("id", conversation.customer_id)
      .eq("tenant_id", tenant.id)
      .single<DbCustomer>();

    if (customerError || !customer) {
      console.error("[messages/send-attachment] Customer lookup failed", {
        customerId: conversation.customer_id,
        customerError,
      });
      return NextResponse.json({ error: "Customer not found for conversation" }, { status: 404 });
    }

    const recipientPhone = normalizeWhatsAppPhone(customer.whatsapp_phone) ?? normalizeWhatsAppPhone(customer.phone);

    if (!recipientPhone) {
      return NextResponse.json(
        { error: "Customer does not have a valid WhatsApp phone number." },
        { status: 400 },
      );
    }

    const env = validateWhatsAppSendConfig(await getWhatsAppConnectionForTenant(supabase, tenant.id));

    if (!env.ok || !env.phoneNumberId || !env.accessToken) {
      console.error("[messages/send-attachment] WhatsApp send is not configured", {
        tenantId: tenant.id,
        errors: env.errors,
      });
      return NextResponse.json(
        { error: `WhatsApp send is not configured: ${env.errors.join(", ")}` },
        { status: 500 },
      );
    }

    if (!isInsideCustomerServiceWindow(conversation.last_inbound_at ?? conversation.last_message_at)) {
      return NextResponse.json(
        { error: "Outside the 24-hour WhatsApp service window. Use a template message." },
        { status: 409 },
      );
    }

    const fileName = sanitizeFileName(file.name || `${input.messageId}`);
    const buffer = Buffer.from(await file.arrayBuffer());
    const storagePath = buildAttachmentStoragePath({
      tenantId: tenant.id,
      conversationId: conversation.id,
      messageId: input.messageId,
      fileName,
    });

    const { error: storageError } = await supabase.storage
      .from(WHATSAPP_MEDIA_BUCKET)
      .upload(storagePath, buffer, {
        contentType: validation.mimeType,
        upsert: true,
      });

    if (storageError) {
      console.error("[messages/send-attachment] Supabase attachment storage upload failed", {
        conversationId: conversation.id,
        messageId: input.messageId,
        storagePath,
        error: storageError,
      });
      return NextResponse.json({ error: "Could not store attachment" }, { status: 500 });
    }

    let mediaId: string | null = null;

    try {
      const mediaUpload = await uploadWhatsAppMedia({
        phoneNumberId: env.phoneNumberId,
        accessToken: env.accessToken,
        file: new Blob([new Uint8Array(buffer)], { type: validation.mimeType }),
        fileName,
        mimeType: validation.mimeType,
      });
      mediaId = mediaUpload.id;

      const sent = await sendWhatsAppAttachmentMessage({
        phoneNumberId: env.phoneNumberId,
        accessToken: env.accessToken,
        to: recipientPhone,
        payload: buildWhatsAppAttachmentMessagePayload({
          to: recipientPhone,
          mediaId,
          kind: validation.kind,
          fileName,
        }),
      });

      const savedMessage = await persistAttachmentMessage({
        supabase,
        messageId: input.messageId,
        tenantId: tenant.id,
        conversationId: conversation.id,
        customerId: customer.id,
        kind: validation.kind,
        status: "sent",
        whatsappMessageId: sent.messages[0]?.id ?? null,
        mediaId,
        mimeType: validation.mimeType,
        fileSize: buffer.byteLength,
        storagePath,
        fileName,
      });

      if (!savedMessage) {
        return NextResponse.json({ error: "Attachment sent but could not be saved" }, { status: 500 });
      }

      console.info("[messages/send-attachment] attachment sent", {
        tenantId: tenant.id,
        conversationId: conversation.id,
        messageId: input.messageId,
        mediaId,
        kind: validation.kind,
      });

      return NextResponse.json({ message: mapAttachmentMessage(savedMessage) });
    } catch (error) {
      const errorMessage =
        error instanceof WhatsAppApiError
          ? formatWhatsAppApiErrorForUser(error)
          : error instanceof Error
            ? error.message
            : "Attachment send failed";
      const savedMessage = await persistAttachmentMessage({
        supabase,
        messageId: input.messageId,
        tenantId: tenant.id,
        conversationId: conversation.id,
        customerId: customer.id,
        kind: validation.kind,
        status: "failed",
        whatsappMessageId: null,
        mediaId,
        mimeType: validation.mimeType,
        fileSize: buffer.byteLength,
        storagePath,
        fileName,
        mediaError: errorMessage,
      });

      console.error("[messages/send-attachment] WhatsApp attachment send failed", {
        tenantId: tenant.id,
        conversationId: conversation.id,
        messageId: input.messageId,
        mediaId,
        error,
      });

      const status = error instanceof WhatsAppApiError ? error.status || 500 : 502;
      return NextResponse.json(
        {
          error: errorMessage,
          message: savedMessage ? mapAttachmentMessage(savedMessage) : undefined,
        },
        { status },
      );
    }
  } catch (error) {
    console.error("[messages/send-attachment] Unexpected failure", error);

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
        error: error instanceof Error ? error.message : "Unexpected send-attachment failure",
      },
      { status: tenantContextErrorStatus(error) },
    );
  }
}
