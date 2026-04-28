import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN && challenge) {
    return new Response(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Webhook verification failed" }, { status: 403 });
}

export async function POST(request: Request) {
  const payload = await request.json();

  // Production path:
  // 1. Persist raw payload in whatsapp_webhook_events for idempotency/auditing.
  // 2. Resolve phone_number_id to whatsapp_accounts.company_id.
  // 3. For incoming messages, upsert customer by normalized wa_id/phone.
  // 4. Upsert/open conversation, insert inbound message, update last_message fields.
  // 5. For statuses, update messages.status and timestamps by whatsapp_message_id.
  // 6. Broadcast through Supabase realtime via the messages table insert/update.
  const root = asRecord(payload);
  const entries = asArray(root.entry);
  const events = entries.flatMap((entry) =>
    asArray(asRecord(entry).changes).flatMap((change) => {
      const value = asRecord(asRecord(change).value);
      return [
        ...asArray(value.messages).map((message) => ({ type: "message", message, value })),
        ...asArray(value.statuses).map((status) => ({ type: "status", status, value })),
      ];
    }),
  );

  return NextResponse.json({ received: true, events: events.length });
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
