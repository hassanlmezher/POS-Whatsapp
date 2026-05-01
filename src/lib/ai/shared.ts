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

export type SuggestionValidationResult = {
  isValid: boolean;
  reason: string | null;
};

export class AiConfigurationError extends Error {
  status = 400;
}

export class AiProviderError extends Error {
  status = 502;
}

const GENERIC_FALLBACK_REPLY = "Thanks for your message! Could you please tell me what you're looking for?";
const NO_PRODUCT_LIST_REPLY = "We offer several products and services. What are you looking for?";
const INCOMPLETE_ENDINGS = ["the", "and", "or", "like", "with", "about", "for", "to"];

export function buildReplyPrompt(input: SuggestReplyInput) {
  const recentMessages = input.messages
    .filter((message) => message.body.trim().length > 0)
    .map((message) => ({
      direction: message.direction,
      body: message.body,
      createdAt: message.createdAt,
    }));

  const productNames = input.products
    .map((product) => product.name.trim())
    .filter((name) => name.length > 0)
    .slice(0, 10);

  const safeContext = {
    conversationMessages: recentMessages,
    business: input.business.name
      ? {
          name: input.business.name,
        }
      : null,
    products: productNames.length > 0
      ? productNames
      : "No product list is available. Do not invent products.",
    recentOrders: input.orders.slice(0, 5).map((order) => ({
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      total: order.total,
      createdAt: order.createdAt,
    })),
  };

  return [
    "You are a professional WhatsApp support assistant.",
    "",
    "Rules:",
    "- Always give a complete answer.",
    "- Never end mid-sentence.",
    "- Only use information provided in the conversation messages and safe context below.",
    "- Never invent business names, products, prices, stock, delivery times, or order statuses.",
    "- If the answer is not supported by the provided context, ask one short clarifying question instead of guessing.",
    "- If the customer asks 'what do you sell?' and product names exist, list 3 to 5 real product names from the provided product list.",
    `- If no product list exists, say: "${NO_PRODUCT_LIST_REPLY}"`,
    "- Keep replies short, natural, and useful.",
    "- Reply in the same language as the latest customer message when possible.",
    "- Use at most 2 to 3 sentences.",
    "- Fix grammar automatically.",
    "- If the customer says 'how are you', reply naturally and friendly.",
    "- Never mention AI.",
    "- Return only the reply text with proper punctuation.",
    `- Safe fallback reply if needed: "${GENERIC_FALLBACK_REPLY}"`,
    "",
    "Safe context:",
    JSON.stringify(safeContext, null, 2),
  ].join("\n");
}

export function sanitizeSuggestion(value: string) {
  const cleaned = value
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/^(assistant|reply|suggestion)\s*:\s*/i, "")
    .replace(/[*_#`>\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1200);

  if (!cleaned) {
    return cleaned;
  }

  let normalized = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  normalized = normalized.replace(/(?:,?\s+(?:the|and|or|like|with|about|for|to))+[.!?]?$/i, "").trim();

  if (!normalized) {
    return normalized;
  }

  if (/[.!?]"?$/.test(normalized)) {
    return normalized;
  }

  return `${normalized}.`;
}

export function getFallbackSuggestion() {
  return GENERIC_FALLBACK_REPLY;
}

export function buildRetryPrompt(input: SuggestReplyInput, previousAnswer: string) {
  return [
    buildReplyPrompt(input),
    "",
    `Previous answer: "${previousAnswer}"`,
    "Your previous answer was incomplete. Rewrite a complete, short WhatsApp reply.",
    "Return one complete reply only.",
  ].join("\n");
}

export function getNoProductListSuggestion() {
  return NO_PRODUCT_LIST_REPLY;
}

export function validateSuggestion(value: string, input: SuggestReplyInput): SuggestionValidationResult {
  const text = value.trim();

  if (!text) {
    return { isValid: false, reason: "empty" };
  }

  if (text.length < 10) {
    return { isValid: false, reason: "too_short" };
  }

  const sentenceCount = (text.match(/[.!?]+/g) ?? []).length || 1;
  if (sentenceCount > 3) {
    return { isValid: false, reason: "too_many_sentences" };
  }

  if (!/[.!?]"?$/.test(text)) {
    return { isValid: false, reason: "missing_punctuation" };
  }

  const lower = text.toLowerCase();
  if (INCOMPLETE_ENDINGS.some((word) => lower.endsWith(` ${word}.`) || lower.endsWith(` ${word}?`) || lower.endsWith(` ${word}!`) || lower.endsWith(` ${word}`))) {
    return { isValid: false, reason: "incomplete_ending" };
  }

  if (/[,:;]\s*$/.test(text) || /\b(?:the|and|or|like|with|about|for|to)\s*[.!?]$/i.test(text)) {
    return { isValid: false, reason: "cut_off" };
  }

  if (lower.includes("as an ai") || lower.includes("language model") || lower.includes("database")) {
    return { isValid: false, reason: "internal_reference" };
  }

  const knownProductNames = input.products
    .map((product) => product.name.trim().toLowerCase())
    .filter((name) => name.length > 0);
  const makesProductClaim = /\b(we sell|we have|we offer|available|in stock|products like)\b/i.test(text);

  if (knownProductNames.length === 0 && makesProductClaim && lower !== NO_PRODUCT_LIST_REPLY.toLowerCase()) {
    return { isValid: false, reason: "invented_products_without_list" };
  }

  if (knownProductNames.length > 0 && makesProductClaim) {
    const mentionsKnownProduct = knownProductNames.some((name) => lower.includes(name));
    if (!mentionsKnownProduct && !lower.includes("what are you looking for")) {
      return { isValid: false, reason: "product_claim_without_known_product" };
    }
  }

  return { isValid: true, reason: null };
}

export function shouldUseFallbackSuggestion(value: string, input: SuggestReplyInput) {
  return !validateSuggestion(value, input).isValid;
}
