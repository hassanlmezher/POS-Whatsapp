import type { MessageType } from "@/lib/types/domain";

export const WHATSAPP_MEDIA_BUCKET = process.env.WHATSAPP_MEDIA_BUCKET ?? "whatsapp-media";
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_DOCUMENT_BYTES = 100 * 1024 * 1024;

const IMAGE_MIME_TYPES = ["image/jpeg", "image/png"] as const;
const DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
] as const;

export type AttachmentKind = Extract<MessageType, "image" | "document">;

export type AttachmentValidationResult =
  | { ok: true; kind: AttachmentKind; mimeType: string; maxBytes: number }
  | { ok: false; error: string; status: number };

export function sanitizeFileName(value: string | null | undefined) {
  const sanitized = (value ?? "attachment")
    .replace(/[^\w.\- ()]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 120)
    .trim();

  return sanitized || "attachment";
}

export function validateAttachmentUpload({
  mimeType,
  size,
}: {
  mimeType: string | null | undefined;
  size: number;
}): AttachmentValidationResult {
  const normalizedMimeType = (mimeType ?? "").split(";")[0]?.trim().toLowerCase() ?? "";

  if (!Number.isFinite(size) || size <= 0) {
    return { ok: false, error: "Attachment is empty.", status: 400 };
  }

  if (IMAGE_MIME_TYPES.includes(normalizedMimeType as (typeof IMAGE_MIME_TYPES)[number])) {
    if (size > MAX_IMAGE_BYTES) {
      return { ok: false, error: "Image is too large. Maximum image size is 5 MB.", status: 413 };
    }

    return { ok: true, kind: "image", mimeType: normalizedMimeType, maxBytes: MAX_IMAGE_BYTES };
  }

  if (DOCUMENT_MIME_TYPES.includes(normalizedMimeType as (typeof DOCUMENT_MIME_TYPES)[number])) {
    if (size > MAX_DOCUMENT_BYTES) {
      return { ok: false, error: "Document is too large. Maximum document size is 100 MB.", status: 413 };
    }

    return { ok: true, kind: "document", mimeType: normalizedMimeType, maxBytes: MAX_DOCUMENT_BYTES };
  }

  return { ok: false, error: "Unsupported attachment type. Use PNG, JPG, PDF, TXT, Word, Excel, or PowerPoint files.", status: 415 };
}

export function buildAttachmentStoragePath({
  tenantId,
  conversationId,
  messageId,
  fileName,
}: {
  tenantId: string;
  conversationId: string;
  messageId: string;
  fileName: string;
}) {
  return `${tenantId}/conversations/${conversationId}/attachments/${messageId}-${sanitizeFileName(fileName)}`;
}

export function buildWhatsAppAttachmentMessagePayload({
  to,
  mediaId,
  kind,
  fileName,
  caption,
}: {
  to: string;
  mediaId: string;
  kind: AttachmentKind;
  fileName: string;
  caption?: string | null;
}) {
  const cleanCaption = caption?.trim();

  if (kind === "image") {
    return {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "image",
      image: {
        id: mediaId,
        ...(cleanCaption ? { caption: cleanCaption } : {}),
      },
    };
  }

  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "document",
    document: {
      id: mediaId,
      filename: fileName,
      ...(cleanCaption ? { caption: cleanCaption } : {}),
    },
  };
}
