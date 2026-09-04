import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAudioMessageDatabasePayload,
  buildWhatsAppAudioMessagePayload,
  canRetryAudioMessage,
  conversationBelongsToTenant,
  DEFAULT_MAX_AUDIO_BYTES,
  normalizeAudioDurationSeconds,
  parseWhatsAppMediaUploadResponse,
  shouldReturnExistingAudioMessage,
  shouldTranscodeAudioForWhatsApp,
  toExactArrayBuffer,
  validateAudioUpload,
} from "../src/lib/whatsapp-audio";
import { formatWhatsAppApiErrorForUser, WhatsAppApiError } from "../src/lib/whatsapp";

const tenantA = "11111111-1111-4111-8111-111111111111";
const tenantB = "22222222-2222-4222-8222-222222222222";
const conversationId = "33333333-3333-4333-8333-333333333333";
const customerId = "44444444-4444-4444-8444-444444444444";
const messageId = "55555555-5555-4555-8555-555555555555";

test("authenticated tenant A cannot send through tenant B conversation", () => {
  assert.equal(
    conversationBelongsToTenant({ tenant_id: tenantB, customer_id: customerId }, tenantA),
    false,
  );
});

test("inaccessible conversation is rejected", () => {
  assert.equal(conversationBelongsToTenant(null, tenantA), false);
});

test("valid audio upload is accepted", () => {
  assert.deepEqual(validateAudioUpload({ mimeType: "audio/ogg;codecs=opus", size: 1024 }), {
    ok: true,
    mimeType: "audio/ogg;codecs=opus",
    normalizedMimeType: "audio/ogg",
    shouldTranscode: false,
  });
});

test("invalid MIME type is rejected", () => {
  assert.deepEqual(validateAudioUpload({ mimeType: "application/x-msdownload", size: 1024 }), {
    ok: false,
    error: "Unsupported audio format.",
    status: 415,
  });
});

test("oversized recording is rejected", () => {
  assert.deepEqual(validateAudioUpload({ mimeType: "audio/mpeg", size: DEFAULT_MAX_AUDIO_BYTES + 1 }), {
    ok: false,
    error: "Recording is too large. Please record a shorter voice message.",
    status: 413,
  });
});

test("Meta media upload response is parsed correctly", () => {
  assert.deepEqual(parseWhatsAppMediaUploadResponse({ id: "MEDIA_ID_123" }), { id: "MEDIA_ID_123" });
  assert.equal(parseWhatsAppMediaUploadResponse({}), null);
});

test("Meta media upload failure does not produce a false success payload", () => {
  assert.equal(parseWhatsAppMediaUploadResponse({ error: { message: "Media upload error" } }), null);
});

test("Meta send payload uses tenant-resolved phone endpoint separately from client input", () => {
  assert.deepEqual(buildWhatsAppAudioMessagePayload("15551234567", "MEDIA_ID_123"), {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: "15551234567",
    type: "audio",
    audio: { id: "MEDIA_ID_123" },
  });
});

test("Meta send failure produces failed DB state", () => {
  const payload = buildAudioMessageDatabasePayload({
    messageId,
    tenantId: tenantA,
    conversationId,
    customerId,
    status: "failed",
    mimeType: "audio/mpeg",
    durationSeconds: 2,
    fileSize: 2048,
    storageBucket: "whatsapp-audio",
    storagePath: `${tenantA}/conversations/${conversationId}/audio/outgoing/${messageId}.mp3`,
    fileName: `${messageId}.mp3`,
    mediaError: "Meta send failed",
  });

  assert.equal(payload.status, "failed");
  assert.equal(payload.message_type, "audio");
  assert.equal(payload.direction, "outbound");
  assert.equal(payload.whatsapp_message_id, null);
});

test("successful send persists type=audio outgoing message", () => {
  const payload = buildAudioMessageDatabasePayload({
    messageId,
    tenantId: tenantA,
    conversationId,
    customerId,
    status: "sent",
    whatsappMessageId: "wamid.SUCCESS",
    mediaId: "MEDIA_ID_123",
    mimeType: "audio/mpeg",
    durationSeconds: 2,
    fileSize: 2048,
    storageBucket: "whatsapp-audio",
    storagePath: `${tenantA}/conversations/${conversationId}/audio/outgoing/${messageId}.mp3`,
    fileName: `${messageId}.mp3`,
  });

  assert.equal(payload.message_type, "audio");
  assert.equal(payload.direction, "outbound");
  assert.equal(payload.status, "sent");
  assert.equal(payload.whatsapp_message_id, "wamid.SUCCESS");
});

test("duplicate retry does not resend non-failed messages and allows failed message retry", () => {
  const sentMessage = { id: messageId, tenant_id: tenantA, conversation_id: conversationId, status: "sent" };
  const failedMessage = { id: messageId, tenant_id: tenantA, conversation_id: conversationId, status: "failed" };

  assert.equal(shouldReturnExistingAudioMessage(sentMessage, tenantA, conversationId), true);
  assert.equal(canRetryAudioMessage(sentMessage, tenantA, conversationId), false);
  assert.equal(shouldReturnExistingAudioMessage(failedMessage, tenantA, conversationId), false);
  assert.equal(canRetryAudioMessage(failedMessage, tenantA, conversationId), true);
});

test("browser WebM recording is marked for server-side WhatsApp transcode", () => {
  assert.equal(shouldTranscodeAudioForWhatsApp("audio/webm;codecs=opus"), true);
  assert.equal(shouldTranscodeAudioForWhatsApp("audio/mpeg"), true);
  assert.equal(shouldTranscodeAudioForWhatsApp("audio/ogg;codecs=opus"), false);
});

test("fractional browser recording duration is safe for integer database column", () => {
  assert.equal(normalizeAudioDurationSeconds(3.42), 3);
  assert.equal(normalizeAudioDurationSeconds(0.51), 1);

  const payload = buildAudioMessageDatabasePayload({
    messageId,
    tenantId: tenantA,
    conversationId,
    customerId,
    status: "sent",
    whatsappMessageId: "wamid.SUCCESS",
    mediaId: "MEDIA_ID_123",
    mimeType: "audio/mpeg",
    durationSeconds: 3.42,
    fileSize: 2048,
    storageBucket: "whatsapp-audio",
    storagePath: `${tenantA}/conversations/${conversationId}/audio/outgoing/${messageId}.mp3`,
    fileName: `${messageId}.mp3`,
  });

  assert.equal(payload.media_duration_seconds, 3);
});

test("WhatsApp expired token errors are explained with tenant connection action", () => {
  const error = new WhatsAppApiError("Session has expired", {
    status: 401,
    payload: { error: { code: 190, error_subcode: 463, message: "Session has expired" } },
    isAuthError: true,
  });

  assert.match(formatWhatsAppApiErrorForUser(error), /access token expired/i);
  assert.match(formatWhatsAppApiErrorForUser(error), /Reconnect this tenant's WhatsApp Business account/);
});

test("WhatsApp access denied errors are explained with tenant connection action", () => {
  const error = new WhatsAppApiError("(#131005) Access denied", {
    status: 400,
    payload: { error: { code: 131005, message: "(#131005) Access denied" } },
    isAuthError: true,
  });

  assert.match(formatWhatsAppApiErrorForUser(error), /access denied/i);
  assert.match(formatWhatsAppApiErrorForUser(error), /Reconnect this tenant's WhatsApp Business account/);
});

test("audio Blob bytes are sliced away from Node Buffer pool memory", () => {
  const pooled = Buffer.allocUnsafe(32);
  pooled.fill(255);
  const audioBytes = pooled.subarray(8, 12);
  audioBytes.set([1, 2, 3, 4]);

  const exact = toExactArrayBuffer(audioBytes);

  assert.equal(exact.byteLength, audioBytes.byteLength);
  assert.deepEqual(Array.from(new Uint8Array(exact)), [1, 2, 3, 4]);
});
