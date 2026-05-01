import "server-only";
import { AiConfigurationError, AiProviderError, buildReplyPrompt, sanitizeSuggestion, type SuggestReplyInput } from "@/lib/ai/shared";

type GeminiResponse = {
  candidates?: {
    content?: {
      parts?: { text?: string }[];
    };
  }[];
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

const GEMINI_ENDPOINT_BASE = "https://generativelanguage.googleapis.com/v1beta";
const GEMINI_FALLBACK_MODELS = ["gemini-2.0-flash", "gemini-1.5-flash-latest", "gemini-2.5-flash"] as const;

function isModelNotFound(status: number, payload: GeminiResponse | null) {
  const message = payload?.error?.message?.toLowerCase() ?? "";
  return status === 404 || (message.includes("not found") && message.includes("models/"));
}

function uniqueModels(configuredModel?: string) {
  const preferred = configuredModel?.trim() || GEMINI_FALLBACK_MODELS[0];
  const list = [preferred, ...GEMINI_FALLBACK_MODELS];
  return [...new Set(list)];
}

export async function generateGeminiSuggestion(input: SuggestReplyInput) {
  const apiKey = process.env.GEMINI_API_KEY;
  const configuredModel = process.env.GEMINI_MODEL;

  if (!apiKey) {
    throw new AiConfigurationError("Gemini is not configured. Add GEMINI_API_KEY and restart the server.");
  }

  const modelsToTry = uniqueModels(configuredModel);
  let lastNonModelError: string | null = null;
  let sawModelNotFound = false;

  for (const model of modelsToTry) {
    const endpoint = `${GEMINI_ENDPOINT_BASE}/models/${encodeURIComponent(model)}:generateContent`;
    const response = await fetch(`${endpoint}?key=${encodeURIComponent(apiKey)}`, {
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
    });

    const payload = (await response.json().catch(() => null)) as GeminiResponse | null;

    if (!response.ok) {
      console.error("[ai/gemini] generateContent failed", {
        model,
        endpoint,
        status: response.status,
        error: payload?.error ?? payload,
      });

      if (isModelNotFound(response.status, payload)) {
        sawModelNotFound = true;
        continue;
      }

      lastNonModelError = payload?.error?.message || `Gemini request failed with status ${response.status}.`;
      continue;
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

  if (lastNonModelError) {
    throw new AiProviderError(lastNonModelError);
  }

  if (sawModelNotFound) {
    throw new AiProviderError("Gemini model not available. Try GEMINI_MODEL=gemini-2.0-flash.");
  }

  throw new AiProviderError("Gemini request failed.");
}
