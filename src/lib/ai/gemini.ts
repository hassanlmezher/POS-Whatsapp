import "server-only";
import {
  AiConfigurationError,
  AiProviderError,
  buildReplyPrompt,
  getFallbackSuggestion,
  sanitizeSuggestion,
  shouldUseFallbackSuggestion,
  type SuggestReplyInput,
} from "@/lib/ai/shared";

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
  const prompt = buildReplyPrompt(input);

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
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          topP: 0.8,
          maxOutputTokens: 120,
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
      console.warn("[ai/gemini] Empty suggestion returned, using fallback", {
        model,
        endpoint,
      });
      return getFallbackSuggestion();
    }

    const suggestion = sanitizeSuggestion(text);
    if (shouldUseFallbackSuggestion(suggestion)) {
      console.warn("[ai/gemini] Suggestion failed quality checks, using fallback", {
        model,
        endpoint,
        suggestion,
      });
      return getFallbackSuggestion();
    }

    return suggestion;
  }

  if (lastNonModelError) {
    console.warn("[ai/gemini] All model attempts failed, using fallback", {
      modelsTried: modelsToTry,
      error: lastNonModelError,
    });
    return getFallbackSuggestion();
  }

  if (sawModelNotFound) {
    throw new AiProviderError("Gemini model not available. Try GEMINI_MODEL=gemini-2.0-flash.");
  }

  console.warn("[ai/gemini] Gemini request failed without payload details, using fallback", {
    modelsTried: modelsToTry,
  });
  return getFallbackSuggestion();
}
