import "server-only";
import { generateGeminiSuggestion } from "@/lib/ai/gemini";
import { generateMockSuggestion } from "@/lib/ai/mock";
import { generateOllamaSuggestion } from "@/lib/ai/ollama";
import { AiConfigurationError, type SuggestReplyInput } from "@/lib/ai/shared";

export type {
  AiMessageContext,
  AiOrderContext,
  AiProductContext,
  SuggestReplyInput,
} from "@/lib/ai/shared";
export { AiConfigurationError, AiProviderError } from "@/lib/ai/shared";

export type AiProviderName = "gemini" | "ollama" | "mock";

export type SuggestReplyResult = {
  suggestion: string;
  provider: AiProviderName;
};

export async function suggestReply(input: SuggestReplyInput): Promise<SuggestReplyResult> {
  const provider = process.env.AI_PROVIDER?.trim().toLowerCase();

  if (!provider) {
    throw new AiConfigurationError("AI is not configured");
  }

  if (provider === "gemini") {
    return {
      suggestion: await generateGeminiSuggestion(input),
      provider,
    };
  }

  if (provider === "ollama") {
    return {
      suggestion: await generateOllamaSuggestion(input),
      provider,
    };
  }

  if (provider === "mock") {
    return {
      suggestion: generateMockSuggestion(input),
      provider,
    };
  }

  throw new AiConfigurationError(`Unsupported AI_PROVIDER "${provider}". Use gemini, ollama, or mock.`);
}
