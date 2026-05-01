"use client";

import { useEffect, useRef } from "react";
import type { Message } from "@/lib/types/domain";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function useRealtimeMessages(companyId: string, onMessage: (message: Message) => void) {
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return;
    }

    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`messages:${companyId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          const record = payload.new as Record<string, unknown>;
          onMessageRef.current({
            id: String(record.id),
            companyId: String(record.company_id),
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
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [companyId]);
}
