import { env } from "../config/env.js";
import { ApiError } from "../utils/api-error.js";
import { logger } from "../utils/logger.js";

const GEMINI_MODELS = [env.GEMINI_MODEL, "gemini-2.0-flash", "gemini-1.5-flash"].filter(
  (model, index, list) => Boolean(model) && list.indexOf(model) === index,
);

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  error?: { message?: string };
};

function extractText(payload: GeminiResponse) {
  return payload.candidates?.map((item) => item.content?.parts?.map((part) => part.text ?? "").join("") ?? "").join("\n") ?? "";
}

export async function generateGeminiText(system: string, user: string) {
  const key = env.GEMINI_API_KEY;
  if (!key) {
    throw ApiError.unavailable("El guía no está configurado en este momento.");
  }

  let lastStatus = 0;
  for (const model of GEMINI_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
        },
      }),
    });
    lastStatus = response.status;
    if (response.status === 404) {
      continue;
    }
    if (!response.ok) {
      logger.error("Gemini no respondió", { status: response.status, model });
      throw ApiError.unavailable("No pude encontrar información en este momento.");
    }
    const payload = (await response.json()) as GeminiResponse;
    const text = extractText(payload).trim();
    if (!text) {
      throw ApiError.unavailable("No pude encontrar información en este momento.");
    }
    return text;
  }

  logger.error("Gemini modelo no disponible", { status: lastStatus });
  throw ApiError.unavailable("No pude encontrar información en este momento.");
}

export function parseGeminiJson(raw: string) {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const source = (fenced?.[1] ?? raw).trim();
  const start = source.indexOf("{");
  const end = source.lastIndexOf("}");
  if (start < 0 || end <= start) {
    return null;
  }
  try {
    return JSON.parse(source.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}
