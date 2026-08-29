"use client";

import { useEffect, useRef, useState } from "react";
import type { Message } from "@/lib/types/domain";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function useRealtimeMessages(tenantId: string, onMessage: (message: Message) => void) {
  const onMessageRef = useRef(onMessage);
  const hasRealtimeConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  const [status, setStatus] = useState<"connecting" | "live" | "fallback">(
    hasRealtimeConfig ? "connecting" : "fallback",
  );

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!hasRealtimeConfig) {
      return;
    }

    const supabase = createSupabaseBrowserClient();
    const fallbackTimer = window.setTimeout(() => {
      setStatus((current) => (current === "connecting" ? "fallback" : current));
    }, 8000);
    const channel = supabase
      .channel(`messages:${tenantId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          const record = payload.new as Record<string, unknown>;
          const messageType = record.message_type === "audio" || record.message_type === "unsupported"
            ? record.message_type
            : "text";
          const hasAudioStorage = Boolean(record.media_storage_bucket && record.media_storage_path);
          const duration = Number(record.media_duration_seconds);
          const fileSize = Number(record.media_file_size);

          onMessageRef.current({
            id: String(record.id),
            companyId: String(record.tenant_id),
            conversationId: String(record.conversation_id),
            customerId: String(record.customer_id),
            messageType,
            direction: record.direction as Message["direction"],
            body: String(record.body ?? ""),
            status: record.status as Message["status"],
            whatsappMessageId: record.whatsapp_message_id ? String(record.whatsapp_message_id) : null,
            audio: messageType === "audio"
              ? {
                  mediaId: record.media_id ? String(record.media_id) : null,
                  mimeType: record.media_mime_type ? String(record.media_mime_type) : null,
                  sha256: record.media_sha256 ? String(record.media_sha256) : null,
                  isVoice: record.media_is_voice === true,
                  durationSeconds: Number.isFinite(duration) ? duration : null,
                  fileSize: Number.isFinite(fileSize) ? fileSize : null,
                  fileName: record.media_file_name ? String(record.media_file_name) : null,
                  storageBucket: record.media_storage_bucket ? String(record.media_storage_bucket) : null,
                  storagePath: record.media_storage_path ? String(record.media_storage_path) : null,
                  error: record.media_error ? String(record.media_error) : null,
                  url: hasAudioStorage ? `/api/messages/${record.id}/audio` : null,
                }
              : null,
            createdAt: String(record.created_at),
          });
        },
      )
      .subscribe((subscriptionStatus) => {
        if (subscriptionStatus === "SUBSCRIBED") {
          window.clearTimeout(fallbackTimer);
          setStatus("live");
          return;
        }

        if (
          subscriptionStatus === "CHANNEL_ERROR" ||
          subscriptionStatus === "TIMED_OUT" ||
          subscriptionStatus === "CLOSED"
        ) {
          window.clearTimeout(fallbackTimer);
          setStatus("fallback");
        }
      });

    return () => {
      window.clearTimeout(fallbackTimer);
      void supabase.removeChannel(channel);
    };
  }, [hasRealtimeConfig, tenantId]);

  return status;
}
