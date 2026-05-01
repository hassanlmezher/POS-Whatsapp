import "server-only";
import { AiConfigurationError, AiProviderError, buildReplyPrompt, sanitizeSuggestion, type SuggestReplyInput } from "@/lib/ai/shared";

type GeminiResponse = {
  candidates?: {
    content?: {
      parts?: { text?: string }[];
    };
  }[];
  error?: {
    message?: string;
  };
};

export async function generateGeminiSuggestion(input: SuggestReplyInput) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";

  if (!apiKey) {
    throw new AiConfigurationError("Gemini is not configured. Add GEMINI_API_KEY and restart the server.");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: buildReplyPrompt(input) }],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 180,
        },
      }),
    },
  );

  const payload = (await response.json().catch(() => null)) as GeminiResponse | null;

  if (!response.ok) {
    throw new AiProviderError(payload?.error?.message || `Gemini request failed with status ${response.status}.`);
  }

  const text = payload?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();

  if (!text) {
    throw new AiProviderError("Gemini returned an empty suggestion.");
  }

  return sanitizeSuggestion(text);
}
