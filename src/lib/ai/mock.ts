import "server-only";
import type { SuggestReplyInput } from "@/lib/ai/shared";

export function generateMockSuggestion(input: SuggestReplyInput) {
  const latestCustomerMessage = [...input.messages].reverse().find((message) => message.direction === "inbound");

  if (!latestCustomerMessage?.body) {
    return "Hi, how can I help you today?";
  }

  return "Thanks for your message. Could you please share a bit more detail so I can help you correctly?";
}
