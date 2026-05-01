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

const GENERIC_FALLBACK_REPLY = "Thanks for your message! How can I help you today?";

export function buildReplyPrompt(input: SuggestReplyInput) {
  const recentMessages = input.messages
    .filter((message) => message.body.trim().length > 0)
    .map((message) => ({
    direction: message.direction,
    body: message.body,
    createdAt: message.createdAt,
    }));

  const safeContext = {
    conversationMessages: recentMessages,
    business: input.business.name
      ? {
          name: input.business.name,
        }
      : null,
    products: input.products.slice(0, 10).map((product) => ({
      name: product.name,
      category: product.category,
      price: product.price,
      stock: product.stock,
    })),
    recentOrders: input.orders.slice(0, 5).map((order) => ({
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      total: order.total,
      createdAt: order.createdAt,
    })),
  };

  return [
    "You are a professional WhatsApp customer support assistant for a POS system.",
    "",
    "Rules:",
    "- Only use information provided in the conversation messages and safe context below.",
    "- Do NOT invent business names, products, features, prices, stock, policies, delivery times, or order statuses.",
    "- If the answer is not supported by the provided context, ask one short clarifying question instead of guessing.",
    "- Keep replies short, clear, natural, and human.",
    "- Fix grammar automatically.",
    "- If the customer says 'how are you', reply naturally and friendly.",
    "- Reply in the same language as the latest customer message when possible.",
    "- Use at most 2 to 3 sentences.",
    "- Never mention AI, prompts, databases, tools, or internal systems.",
    "- Return only the reply text.",
    "- If there is no useful business, product, or order context for the request, respond generically.",
    `- Generic fallback example: "${GENERIC_FALLBACK_REPLY}"`,
    "",
    "Safe context:",
    JSON.stringify(safeContext, null, 2),
  ].join("\n");
}

export function sanitizeSuggestion(value: string) {
  const cleaned = value
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/^(assistant|reply|suggestion)\s*:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1200);

  if (!cleaned) {
    return cleaned;
  }

  const normalized = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  if (/[.!?]"?$/.test(normalized)) {
    return normalized;
  }

  return `${normalized}.`;
}

export function getFallbackSuggestion() {
  return GENERIC_FALLBACK_REPLY;
}

export function shouldUseFallbackSuggestion(value: string) {
  const text = value.trim();

  if (!text) {
    return true;
  }

  const sentenceCount = (text.match(/[.!?]+/g) ?? []).length || 1;
  if (sentenceCount > 3) {
    return true;
  }

  const lower = text.toLowerCase();
  if (lower.includes("as an ai") || lower.includes("language model") || lower.includes("database")) {
    return true;
  }

  if (text.length < 8) {
    return true;
  }

  return false;
}
