import { execFile } from "child_process";
import { randomUUID } from "crypto";
import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { promisify } from "util";
import ffmpegPath from "ffmpeg-static";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  isInsideCustomerServiceWindow,
  normalizeWhatsAppPhone,
  sendWhatsAppAudioMessage,
  uploadWhatsAppMedia,
  validateWhatsAppSendEnv,
  WhatsAppApiError,
} from "@/lib/whatsapp";
import {
  buildAudioMessageDatabasePayload,
  buildAudioStoragePath,
  canRetryAudioMessage,
  conversationBelongsToTenant,
  getAudioExtension,
  getConfiguredMaxAudioBytes,
  shouldReturnExistingAudioMessage,
  shouldTranscodeAudioForWhatsApp,
  validateAudioUpload,
} from "@/lib/whatsapp-audio";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getTenantContext, tenantContextErrorStatus } from "@/lib/tenant-context";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const executeFile = promisify(execFile);
const WHATSAPP_AUDIO_BUCKET = process.env.WHATSAPP_AUDIO_BUCKET ?? "whatsapp-audio";

const formSchema = z.object({
  conversationId: z.string().uuid(),
  messageId: z.string().uuid(),
  durationSeconds: z.coerce.number().min(0.5).max(600).nullable(),
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

type DbAudioMessage = {
  id: string;
  tenant_id: string;
  conversation_id: string;
  customer_id: string;
  message_type: string;
  direction: "inbound" | "outbound";
  body: string;
  status: "received" | "sent" | "delivered" | "read" | "failed";
  whatsapp_message_id: string | null;
  media_id: string | null;
  media_mime_type: string | null;
  media_sha256: string | null;
  media_is_voice: boolean | null;
  media_duration_seconds: number | string | null;
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

function asAudioFile(value: FormDataEntryValue | null) {
  return value instanceof File ? value : null;
}

function mapAudioMessage(row: DbAudioMessage) {
  const duration = Number(row.media_duration_seconds);
  const fileSize = Number(row.media_file_size);
  const hasStorage = Boolean(row.media_storage_bucket && row.media_storage_path);

  return {
    id: row.id,
    companyId: row.tenant_id,
    conversationId: row.conversation_id,
    customerId: row.customer_id,
    messageType: "audio" as const,
    direction: row.direction,
    body: "🎤 Voice message",
    status: row.status,
    whatsappMessageId: row.whatsapp_message_id,
    audio: {
      mediaId: row.media_id,
      mimeType: row.media_mime_type,
      sha256: row.media_sha256,
      isVoice: row.media_is_voice ?? true,
      durationSeconds: Number.isFinite(duration) ? duration : null,
      fileSize: Number.isFinite(fileSize) ? fileSize : null,
      fileName: row.media_file_name,
      storageBucket: row.media_storage_bucket,
      storagePath: row.media_storage_path,
      error: row.media_error,
      url: hasStorage ? `/api/messages/${row.id}/audio` : null,
    },
    attachment: null,
    createdAt: row.created_at,
  };
}

async function prepareAudioForWhatsApp(input: {
  buffer: Buffer;
  mimeType: string;
  messageId: string;
}) {
  if (!shouldTranscodeAudioForWhatsApp(input.mimeType)) {
    return {
      buffer: input.buffer,
      mimeType: input.mimeType,
      fileName: `${input.messageId}.${getAudioExtension(input.mimeType)}`,
      wasTranscoded: false,
    };
  }

  if (!ffmpegPath) {
    throw new Error("Server audio transcoder is not available.");
  }

  const tempDir = await mkdtemp(join(tmpdir(), "inchouf-audio-"));
  const inputPath = join(tempDir, `${randomUUID()}.${getAudioExtension(input.mimeType)}`);
  const outputPath = join(tempDir, `${input.messageId}.mp3`);

  try {
    await writeFile(inputPath, input.buffer);
    await executeFile(
      ffmpegPath,
      [
        "-y",
        "-i",
        inputPath,
        "-vn",
        "-ac",
        "1",
        "-ar",
        "16000",
        "-b:a",
        "48k",
        outputPath,
      ],
      { timeout: 30000 },
    );

    return {
      buffer: await readFile(outputPath),
      mimeType: "audio/mpeg",
      fileName: `${input.messageId}.mp3`,
      wasTranscoded: true,
    };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function persistAudioMessage(input: {
  supabase: ReturnType<typeof createSupabaseAdminClient>;
  messageId: string;
  tenantId: string;
  conversationId: string;
  customerId: string;
  status: "sent" | "failed";
  whatsappMessageId?: string | null;
  mediaId?: string | null;
  mimeType: string;
  durationSeconds: number | null;
  fileSize: number;
  storagePath: string;
  fileName: string;
  mediaError?: string | null;
}) {
  const payload = buildAudioMessageDatabasePayload({
    messageId: input.messageId,
    tenantId: input.tenantId,
    conversationId: input.conversationId,
    customerId: input.customerId,
    status: input.status,
    whatsappMessageId: input.whatsappMessageId ?? null,
    mediaId: input.mediaId ?? null,
    mimeType: input.mimeType,
    durationSeconds: input.durationSeconds,
    fileSize: input.fileSize,
    storageBucket: WHATSAPP_AUDIO_BUCKET,
    storagePath: input.storagePath,
    fileName: input.fileName,
    mediaError: input.mediaError ?? null,
  });

  const { data: message, error: messageError } = await input.supabase
    .from("messages")
    .upsert(payload, { onConflict: "id" })
    .select(
      "id,tenant_id,conversation_id,customer_id,message_type,direction,body,status,whatsapp_message_id,media_id,media_mime_type,media_sha256,media_is_voice,media_duration_seconds,media_file_size,media_storage_bucket,media_storage_path,media_file_name,media_error,created_at",
    )
    .single<DbAudioMessage>();

  if (messageError || !message) {
    console.error("[messages/send-audio] Audio message persistence failed", {
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
      last_message: input.status === "sent" ? "🎤 Voice message" : "🎤 Voice message failed",
      last_message_at: message.created_at,
      unread_count: 0,
      status: "open",
      updated_at: message.created_at,
    })
    .eq("id", input.conversationId)
    .eq("tenant_id", input.tenantId);

  if (updateError) {
    console.error("[messages/send-audio] Conversation update failed", {
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

  const audio = asAudioFile(formData.get("audio"));
  const parsed = formSchema.safeParse({
    conversationId: asOptionalString(formData.get("conversationId")),
    messageId: asOptionalString(formData.get("messageId")),
    durationSeconds: asOptionalString(formData.get("durationSeconds")),
  });

  if (!parsed.success || !audio) {
    return NextResponse.json(
      { error: "Invalid send-audio payload", details: parsed.success ? undefined : parsed.error.flatten() },
      { status: 400 },
    );
  }

  const maxBytes = getConfiguredMaxAudioBytes();
  const validation = validateAudioUpload({
    mimeType: audio.type,
    size: audio.size,
    maxBytes,
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
      console.warn("[messages/send-audio] Conversation rejected", {
        conversationId: input.conversationId,
        tenantId: tenant.id,
        error: conversationError,
      });
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const tenantConversation = conversation;

    const { data: existingMessage, error: existingMessageError } = await supabase
      .from("messages")
      .select(
        "id,tenant_id,conversation_id,customer_id,message_type,direction,body,status,whatsapp_message_id,media_id,media_mime_type,media_sha256,media_is_voice,media_duration_seconds,media_file_size,media_storage_bucket,media_storage_path,media_file_name,media_error,created_at",
      )
      .eq("id", input.messageId)
      .eq("tenant_id", tenant.id)
      .eq("conversation_id", tenantConversation.id)
      .maybeSingle<DbAudioMessage>();

    if (existingMessageError) {
      console.error("[messages/send-audio] Existing message lookup failed", {
        messageId: input.messageId,
        error: existingMessageError,
      });
      return NextResponse.json({ error: "Could not validate voice message retry" }, { status: 500 });
    }

    if (existingMessage && shouldReturnExistingAudioMessage(existingMessage, tenant.id, tenantConversation.id)) {
      return NextResponse.json({ message: mapAudioMessage(existingMessage), idempotent: true });
    }

    if (existingMessage && !canRetryAudioMessage(existingMessage, tenant.id, tenantConversation.id)) {
      return NextResponse.json({ error: "Voice message cannot be retried" }, { status: 409 });
    }

    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id,phone,whatsapp_phone")
      .eq("id", tenantConversation.customer_id)
      .eq("tenant_id", tenant.id)
      .single<DbCustomer>();

    if (customerError || !customer) {
      console.error("[messages/send-audio] Customer lookup failed", {
        customerId: tenantConversation.customer_id,
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

    const env = validateWhatsAppSendEnv(tenant.whatsappPhoneNumberId);

    if (!env.ok || !env.phoneNumberId || !env.accessToken) {
      console.error("[messages/send-audio] WhatsApp send is not configured", {
        tenantId: tenant.id,
        errors: env.errors,
      });
      return NextResponse.json(
        { error: `WhatsApp send is not configured: ${env.errors.join(", ")}` },
        { status: 500 },
      );
    }

    if (!isInsideCustomerServiceWindow(tenantConversation.last_inbound_at ?? tenantConversation.last_message_at)) {
      return NextResponse.json(
        { error: "Outside the 24-hour WhatsApp service window. Use a template message." },
        { status: 409 },
      );
    }

    const originalBuffer = Buffer.from(await audio.arrayBuffer());
    const prepared = await prepareAudioForWhatsApp({
      buffer: originalBuffer,
      mimeType: validation.normalizedMimeType,
      messageId: input.messageId,
    });
    const storagePath = buildAudioStoragePath({
      tenantId: tenant.id,
      conversationId: tenantConversation.id,
      messageId: input.messageId,
      mimeType: prepared.mimeType,
      direction: "outgoing",
    });

    const { error: storageError } = await supabase.storage
      .from(WHATSAPP_AUDIO_BUCKET)
      .upload(storagePath, prepared.buffer, {
        contentType: prepared.mimeType,
        upsert: true,
      });

    if (storageError) {
      console.error("[messages/send-audio] Supabase audio storage upload failed", {
        conversationId: tenantConversation.id,
        messageId: input.messageId,
        storagePath,
        error: storageError,
      });
      return NextResponse.json({ error: "Could not store voice message audio" }, { status: 500 });
    }

    let mediaId: string | null = null;

    try {
      const mediaUpload = await uploadWhatsAppMedia({
        phoneNumberId: env.phoneNumberId,
        accessToken: env.accessToken,
        file: new Blob([new Uint8Array(prepared.buffer)], { type: prepared.mimeType }),
        fileName: prepared.fileName,
        mimeType: prepared.mimeType,
      });
      mediaId = mediaUpload.id;

      const sent = await sendWhatsAppAudioMessage({
        phoneNumberId: env.phoneNumberId,
        accessToken: env.accessToken,
        to: recipientPhone,
        mediaId,
      });

      const savedMessage = await persistAudioMessage({
        supabase,
        messageId: input.messageId,
        tenantId: tenant.id,
        conversationId: tenantConversation.id,
        customerId: customer.id,
        status: "sent",
        whatsappMessageId: sent.messages[0]?.id ?? null,
        mediaId,
        mimeType: prepared.mimeType,
        durationSeconds: input.durationSeconds,
        fileSize: prepared.buffer.byteLength,
        storagePath,
        fileName: prepared.fileName,
      });

      if (!savedMessage) {
        return NextResponse.json({ error: "Voice message sent but could not be saved" }, { status: 500 });
      }

      console.info("[messages/send-audio] voice message sent", {
        tenantId: tenant.id,
        conversationId: tenantConversation.id,
        messageId: input.messageId,
        mediaId,
        transcoded: prepared.wasTranscoded,
      });

      return NextResponse.json({ message: mapAudioMessage(savedMessage) });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Voice message send failed";
      const savedMessage = await persistAudioMessage({
        supabase,
        messageId: input.messageId,
        tenantId: tenant.id,
        conversationId: tenantConversation.id,
        customerId: customer.id,
        status: "failed",
        whatsappMessageId: null,
        mediaId,
        mimeType: prepared.mimeType,
        durationSeconds: input.durationSeconds,
        fileSize: prepared.buffer.byteLength,
        storagePath,
        fileName: prepared.fileName,
        mediaError: errorMessage,
      });

      console.error("[messages/send-audio] WhatsApp audio send failed", {
        tenantId: tenant.id,
        conversationId: tenantConversation.id,
        messageId: input.messageId,
        mediaId,
        error,
      });

      const status = error instanceof WhatsAppApiError ? error.status || 500 : 502;
      return NextResponse.json(
        {
          error: errorMessage,
          message: savedMessage ? mapAudioMessage(savedMessage) : undefined,
        },
        { status },
      );
    }
  } catch (error) {
    console.error("[messages/send-audio] Unexpected failure", error);

    if (error instanceof WhatsAppApiError) {
      return NextResponse.json(
        {
          error: error.isAuthError
            ? "WhatsApp authentication failed. Regenerate WHATSAPP_ACCESS_TOKEN in Meta API Setup."
            : error.message,
          details: process.env.NODE_ENV !== "production" ? error.payload : undefined,
        },
        { status: error.status || 500 },
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unexpected send-audio failure",
      },
      { status: tenantContextErrorStatus(error) },
    );
  }
}
