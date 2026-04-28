import { NextResponse } from "next/server";
import { z } from "zod";
import { conversations, customers } from "@/lib/data/mock-data";
import { isInsideCustomerServiceWindow, sendWhatsAppTextMessage } from "@/lib/whatsapp";

const sendSchema = z.object({
  conversationId: z.string(),
  body: z.string().trim().min(1).max(4096),
});

export async function POST(request: Request) {
  const input = sendSchema.parse(await request.json());
  const conversation = conversations.find((item) => item.id === input.conversationId);

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const customer = customers.find((item) => item.id === conversation.customerId);
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!isInsideCustomerServiceWindow(conversation.lastMessageAt)) {
    return NextResponse.json(
      { error: "Outside the 24-hour service window. Use a WhatsApp template message." },
      { status: 409 },
    );
  }

  if (phoneNumberId && accessToken && customer) {
    const result = await sendWhatsAppTextMessage({
      phoneNumberId,
      accessToken,
      to: customer.whatsappPhone,
      body: input.body,
    });

    return NextResponse.json({
      message: {
        id: crypto.randomUUID(),
        conversationId: conversation.id,
        direction: "outbound",
        body: input.body,
        status: "sent",
        whatsappMessageId: result.messages?.[0]?.id ?? null,
      },
    });
  }

  return NextResponse.json({
    message: {
      id: crypto.randomUUID(),
      conversationId: conversation.id,
      direction: "outbound",
      body: input.body,
      status: "sent",
      whatsappMessageId: null,
      developmentMode: true,
    },
  });
}
