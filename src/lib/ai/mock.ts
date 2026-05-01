import "server-only";
import { getFallbackSuggestion, type SuggestReplyInput } from "@/lib/ai/shared";

export function generateMockSuggestion(input: SuggestReplyInput) {
  const latestCustomerMessage = [...input.messages].reverse().find((message) => message.direction === "inbound");

  if (!latestCustomerMessage?.body) {
    return {
      suggestion: getFallbackSuggestion(),
      model: "mock",
      wasRetried: false,
    };
  }

  return {
    suggestion: "Thanks for your message. Could you please share a bit more detail so I can help you correctly?",
    model: "mock",
    wasRetried: false,
  };
}
