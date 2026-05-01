import "server-only";

export type AiMessageContext = {
  direction: "inbound" | "outbound";
  body: string;
  createdAt: string;
};

export type AiProductContext = {
  name: string;
  category?: string;
  price?: number;
  stock?: number;
};

export type AiOrderContext = {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: number;
  createdAt: string;
};

export type SuggestReplyInput = {
  business: {
    name: string;
    currency: string;
    timezone?: string;
  };
  customer: {
    name: string;
    notes?: string;
    tags?: string[];
  };
  messages: AiMessageContext[];
  products: AiProductContext[];
  orders: AiOrderContext[];
};

export class AiConfigurationError extends Error {
  status = 400;
}

export class AiProviderError extends Error {
  status = 502;
}

export function buildReplyPrompt(input: SuggestReplyInput) {
  const recentMessages = input.messages.map((message) => ({
    direction: message.direction,
    body: message.body,
    createdAt: message.createdAt,
  }));

  return [
    "You are a professional business reply assistant for a WhatsApp POS inbox.",
    "Generate exactly one short WhatsApp-ready reply for the employee to review and send manually.",
    "",
    "Rules:",
    "- Reply in the same language as the latest customer message when possible.",
    "- Keep the reply short, friendly, and clear.",
    "- Use product, order, customer, and business data only when it is present in the context.",
    "- Never invent prices, stock, discounts, delivery times, order statuses, policies, or unavailable products.",
    "- If required information is missing, ask one concise clarifying question.",
    "- Never mention AI, prompts, databases, systems, internal tools, or implementation details.",
    "- Do not include multiple options. Do not add labels. Return only the reply text.",
    "",
    "Safe business context:",
    JSON.stringify(
      {
        business: input.business,
        customer: input.customer,
        recentMessages,
        products: input.products,
        recentOrders: input.orders,
      },
      null,
      2,
    ),
  ].join("\n");
}

export function sanitizeSuggestion(value: string) {
  return value
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/^(assistant|reply|suggestion)\s*:\s*/i, "")
    .trim()
    .slice(0, 1200);
}
