export const DEFAULT_MAX_AUDIO_BYTES = 16 * 1024 * 1024;
export const DEFAULT_MAX_RECORDING_SECONDS = 120;

export const WHATSAPP_SENDABLE_AUDIO_MIME_TYPES = [
  "audio/aac",
  "audio/amr",
  "audio/mp4",
  "audio/mpeg",
  "audio/ogg",
] as const;

export const RECORDABLE_AUDIO_MIME_TYPES = [
  "audio/ogg;codecs=opus",
  "audio/ogg",
  "audio/mp4",
  "audio/aac",
  "audio/mpeg",
  "audio/webm;codecs=opus",
  "audio/webm",
] as const;

export type AudioValidationResult =
  | { ok: true; mimeType: string; normalizedMimeType: string; shouldTranscode: boolean }
  | { ok: false; error: string; status: number };

export type ExistingAudioMessage = {
  id: string;
  tenant_id: string;
  conversation_id: string;
  status: string;
};

export function normalizeAudioMimeType(value: string | null | undefined) {
  return (value ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
}

export function getConfiguredMaxAudioBytes(value = process.env.WHATSAPP_AUDIO_MAX_BYTES) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, DEFAULT_MAX_AUDIO_BYTES) : DEFAULT_MAX_AUDIO_BYTES;
}

export function getConfiguredMaxRecordingSeconds(value = process.env.NEXT_PUBLIC_MAX_VOICE_RECORDING_SECONDS) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0
    ? Math.min(parsed, DEFAULT_MAX_RECORDING_SECONDS)
    : DEFAULT_MAX_RECORDING_SECONDS;
}

export function isWhatsAppSendableAudioMimeType(mimeType: string | null | undefined) {
  const normalized = normalizeAudioMimeType(mimeType);
  return WHATSAPP_SENDABLE_AUDIO_MIME_TYPES.includes(normalized as (typeof WHATSAPP_SENDABLE_AUDIO_MIME_TYPES)[number]);
}

export function isRecordableAudioMimeType(mimeType: string | null | undefined) {
  const normalized = normalizeAudioMimeType(mimeType);
  return (
    isWhatsAppSendableAudioMimeType(normalized) ||
    normalized === "audio/webm"
  );
}

export function shouldTranscodeAudioForWhatsApp(mimeType: string | null | undefined) {
  return normalizeAudioMimeType(mimeType) !== "audio/ogg";
}

export function validateAudioUpload({
  mimeType,
  size,
  maxBytes = DEFAULT_MAX_AUDIO_BYTES,
}: {
  mimeType: string | null | undefined;
  size: number;
  maxBytes?: number;
}): AudioValidationResult {
  if (!Number.isFinite(size) || size <= 0) {
    return { ok: false, error: "Recording is empty. Please record again.", status: 400 };
  }

  if (size > maxBytes) {
    return { ok: false, error: "Recording is too large. Please record a shorter voice message.", status: 413 };
  }

  const normalizedMimeType = normalizeAudioMimeType(mimeType);

  if (!isRecordableAudioMimeType(normalizedMimeType)) {
    return { ok: false, error: "Unsupported audio format.", status: 415 };
  }

  return {
    ok: true,
    mimeType: mimeType ?? normalizedMimeType,
    normalizedMimeType,
    shouldTranscode: shouldTranscodeAudioForWhatsApp(normalizedMimeType),
  };
}

export function getAudioExtension(mimeType: string | null | undefined) {
  const normalized = normalizeAudioMimeType(mimeType);

  if (normalized === "audio/aac") return "aac";
  if (normalized === "audio/amr") return "amr";
  if (normalized === "audio/mp4") return "m4a";
  if (normalized === "audio/mpeg") return "mp3";
  if (normalized === "audio/webm") return "webm";
  return "ogg";
}

export function buildAudioStoragePath({
  tenantId,
  conversationId,
  messageId,
  mimeType,
  direction = "outgoing",
}: {
  tenantId: string;
  conversationId: string;
  messageId: string;
  mimeType: string;
  direction?: "incoming" | "outgoing";
}) {
  return `${tenantId}/conversations/${conversationId}/audio/${direction}/${messageId}.${getAudioExtension(mimeType)}`;
}

export function conversationBelongsToTenant(
  conversation: { tenant_id: string; customer_id: string } | null | undefined,
  tenantId: string,
) {
  return Boolean(conversation && conversation.tenant_id === tenantId && conversation.customer_id);
}

export function canRetryAudioMessage(message: ExistingAudioMessage | null | undefined, tenantId: string, conversationId: string) {
  return Boolean(
    message &&
      message.tenant_id === tenantId &&
      message.conversation_id === conversationId &&
      message.status === "failed",
  );
}

export function shouldReturnExistingAudioMessage(
  message: ExistingAudioMessage | null | undefined,
  tenantId: string,
  conversationId: string,
) {
  return Boolean(
    message &&
      message.tenant_id === tenantId &&
      message.conversation_id === conversationId &&
      message.status !== "failed",
  );
}

export function parseWhatsAppMediaUploadResponse(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const id = (payload as { id?: unknown }).id;
  return typeof id === "string" && id.length > 0 ? { id } : null;
}

export function parseWhatsAppSendResponse(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const messages = (payload as { messages?: unknown }).messages;
  const firstMessage = Array.isArray(messages) ? messages[0] : null;
  const id = firstMessage && typeof firstMessage === "object" ? (firstMessage as { id?: unknown }).id : null;

  return typeof id === "string" && id.length > 0 ? { id } : null;
}

export function buildWhatsAppAudioMessagePayload(to: string, mediaId: string) {
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "audio",
    audio: {
      id: mediaId,
    },
  };
}

export function normalizeAudioDurationSeconds(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Math.max(1, Math.round(value));
}

export function buildAudioMessageDatabasePayload({
  messageId,
  tenantId,
  conversationId,
  customerId,
  status,
  whatsappMessageId = null,
  mediaId = null,
  mimeType,
  durationSeconds,
  fileSize,
  storageBucket,
  storagePath,
  fileName,
  mediaError = null,
}: {
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
  storageBucket: string;
  storagePath: string;
  fileName: string;
  mediaError?: string | null;
}) {
  return {
    id: messageId,
    tenant_id: tenantId,
    conversation_id: conversationId,
    customer_id: customerId,
    message_type: "audio",
    direction: "outbound",
    body: "🎤 Voice message",
    status,
    whatsapp_message_id: whatsappMessageId,
    media_id: mediaId,
    media_mime_type: mimeType,
    media_sha256: null,
    media_is_voice: true,
    media_duration_seconds: normalizeAudioDurationSeconds(durationSeconds),
    media_file_size: fileSize,
    media_storage_bucket: storageBucket,
    media_storage_path: storagePath,
    media_file_name: fileName,
    media_error: mediaError,
  };
}
