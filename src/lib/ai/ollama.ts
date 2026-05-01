import "server-only";
import {
  AiProviderError,
  buildReplyPrompt,
  getFallbackSuggestion,
  sanitizeSuggestion,
  validateSuggestion,
  type SuggestReplyInput,
} from "@/lib/ai/shared";

type OllamaResponse = {
  response?: string;
  error?: string;
};

export async function generateOllamaSuggestion(input: SuggestReplyInput) {
  const baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  const model = process.env.OLLAMA_MODEL || "llama3.1";

  let response: Response;

  try {
    response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt: buildReplyPrompt(input),
        stream: false,
        options: {
          temperature: 0.4,
          num_predict: 180,
        },
      }),
    });
  } catch {
    throw new AiProviderError(`Ollama is unavailable at ${baseUrl}. Start Ollama and pull ${model}.`);
  }

  const payload = (await response.json().catch(() => null)) as OllamaResponse | null;

  if (!response.ok) {
    throw new AiProviderError(payload?.error || `Ollama request failed with status ${response.status}.`);
  }

  if (!payload?.response?.trim()) {
    return {
      suggestion: getFallbackSuggestion(),
      model,
      wasRetried: false,
    };
  }

  const suggestion = sanitizeSuggestion(payload.response);
  const validation = validateSuggestion(suggestion, input);

  if (!validation.isValid) {
    console.warn("[ai/ollama] Suggestion failed validation, using fallback", {
      model,
      validation,
      cleaned: suggestion,
    });
    return {
      suggestion: getFallbackSuggestion(),
      model,
      wasRetried: false,
    };
  }

  return {
    suggestion,
    model,
    wasRetried: false,
  };
}
