import "server-only";
import {
  AiConfigurationError,
  AiProviderError,
  buildReplyPrompt,
  buildRetryPrompt,
  getFallbackSuggestion,
  sanitizeSuggestion,
  validateSuggestion,
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

type GeminiSuggestionResult = {
  suggestion: string;
  model: string;
  wasRetried: boolean;
};

async function requestGeminiSuggestion({
  apiKey,
  endpoint,
  prompt,
  model,
}: {
  apiKey: string;
  endpoint: string;
  prompt: string;
  model: string;
}) {
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
        temperature: 0.2,
        topP: 0.8,
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

    return {
      ok: false as const,
      status: response.status,
      payload,
    };
  }

  const rawText = payload?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim() ?? "";

  if (process.env.NODE_ENV !== "production") {
    console.info("[ai/gemini] raw response", {
      model,
      endpoint,
      rawText,
    });
  }

  return {
    ok: true as const,
    rawText,
  };
}

export async function generateGeminiSuggestion(input: SuggestReplyInput): Promise<GeminiSuggestionResult> {
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
    const firstAttempt = await requestGeminiSuggestion({
      apiKey,
      endpoint,
      prompt,
      model,
    });

    if (!firstAttempt.ok) {
      if (isModelNotFound(firstAttempt.status, firstAttempt.payload)) {
        sawModelNotFound = true;
        continue;
      }

      lastNonModelError =
        firstAttempt.payload?.error?.message || `Gemini request failed with status ${firstAttempt.status}.`;
      continue;
    }

    const firstCleaned = sanitizeSuggestion(firstAttempt.rawText);
    const firstValidation = validateSuggestion(firstCleaned, input);

    if (process.env.NODE_ENV !== "production") {
      console.info("[ai/gemini] cleaned response", {
        model,
        endpoint,
        cleaned: firstCleaned,
        validation: firstValidation,
      });
    }

    if (firstValidation.isValid) {
      return {
        suggestion: firstCleaned,
        model,
        wasRetried: false,
      };
    }

    const retryPrompt = buildRetryPrompt(input, firstCleaned || firstAttempt.rawText);
    const retryAttempt = await requestGeminiSuggestion({
      apiKey,
      endpoint,
      prompt: retryPrompt,
      model,
    });

    if (retryAttempt.ok) {
      const retryCleaned = sanitizeSuggestion(retryAttempt.rawText);
      const retryValidation = validateSuggestion(retryCleaned, input);

      if (process.env.NODE_ENV !== "production") {
        console.info("[ai/gemini] retry result", {
          model,
          endpoint,
          cleaned: retryCleaned,
          validation: retryValidation,
        });
      }

      if (retryValidation.isValid) {
        return {
          suggestion: retryCleaned,
          model,
          wasRetried: true,
        };
      }
    }

    console.warn("[ai/gemini] Using fallback after validation failure", {
      model,
      endpoint,
      validation: firstValidation,
      fallbackUsed: true,
    });

    return {
      suggestion: getFallbackSuggestion(),
      model,
      wasRetried: true,
    };
  }

  if (lastNonModelError) {
    console.warn("[ai/gemini] All model attempts failed, using fallback", {
      modelsTried: modelsToTry,
      error: lastNonModelError,
      fallbackUsed: true,
    });
    return {
      suggestion: getFallbackSuggestion(),
      model: modelsToTry[0],
      wasRetried: false,
    };
  }

  if (sawModelNotFound) {
    throw new AiProviderError("Gemini model not available. Try GEMINI_MODEL=gemini-2.0-flash.");
  }

  console.warn("[ai/gemini] Gemini request failed without payload details, using fallback", {
    modelsTried: modelsToTry,
    fallbackUsed: true,
  });
  return {
    suggestion: getFallbackSuggestion(),
    model: modelsToTry[0],
    wasRetried: false,
  };
}
