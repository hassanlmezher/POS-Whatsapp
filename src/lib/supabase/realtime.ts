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
          onMessageRef.current({
            id: String(record.id),
            companyId: String(record.tenant_id),
            conversationId: String(record.conversation_id),
            customerId: String(record.customer_id),
            direction: record.direction as Message["direction"],
            body: String(record.body ?? ""),
            status: record.status as Message["status"],
            whatsappMessageId: record.whatsapp_message_id ? String(record.whatsapp_message_id) : null,
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
