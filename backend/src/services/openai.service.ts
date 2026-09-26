import { env } from "../config/env.js";
import { ApiError } from "../utils/api-error.js";
import { logger } from "../utils/logger.js";

const RETIRED_GROQ_MODELS: Record<string, string> = {
  "llama-3.3-70b-versatile": "openai/gpt-oss-120b",
  "llama-3.1-8b-instant": "openai/gpt-oss-20b",
};

function groqKey() {
  return env.GROQ_API_KEY || env.OPENAI_API_KEY;
}

function groqBase() {
  return (env.OPENAI_BASE_URL || "https://api.groq.com/openai/v1").replace(/\/$/, "");
}

function groqModel() {
  const requested = env.GROQ_MODEL || env.OPENAI_MODEL || "openai/gpt-oss-20b";
  return RETIRED_GROQ_MODELS[requested] || requested;
}

export function hasGroqConfig() {
  return Boolean(groqKey());
}

/**
 * Completions contra Groq (compatible con OpenAI) usando la URL y clave del .env.
 */
export async function generateGroqJson(
  system: string,
  turns: Array<{ role: "user" | "assistant"; content: string }>,
) {
  const key = groqKey();
  if (!key) {
    throw ApiError.unavailable("El guía no está configurado en este momento.");
  }

  const messages = [
    { role: "system" as const, content: system },
    ...turns.filter((item) => item.content.trim()).map((item) => ({
      role: item.role,
      content: item.content,
    })),
  ];

  let response: Response;
  try {
    response = await fetch(`${groqBase()}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: groqModel(),
        temperature: 0.6,
        max_tokens: 2048,
        response_format: { type: "json_object" },
        messages,
      }),
    });
  } catch (error) {
    logger.error("Groq sin conexión", { error: error instanceof Error ? error.message : "unknown" });
    throw ApiError.unavailable("No pude conectar con el guía. Comprueba tu conexión e intenta de nuevo.");
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    logger.error("Groq no respondió", { status: response.status, model: groqModel(), detail: detail.slice(0, 300) });
    throw ApiError.unavailable("No pude encontrar información en este momento.");
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  };
  const text = data.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) {
    throw ApiError.unavailable("No pude encontrar información en este momento.");
  }
  return text;
}

/**
 * Cliente preparado para recomendaciones personalizadas (sprints posteriores).
 */
export async function generateExperienceRecommendation(prompt: string): Promise<string | null> {
  const key = groqKey();
  if (!key) {
    logger.info("Groq/OpenAI no configurado; recomendación omitida");
    return null;
  }

  try {
    const response = await fetch(`${groqBase()}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: groqModel(),
        messages: [
          {
            role: "system",
            content:
              "Eres el curador de Entre Caminos. Recomiendas experiencias culturales, recreativas, deportivas y turísticas con tono editorial y cercano.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      logger.error("Groq falló", { status: response.status });
      return null;
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    return data.choices?.[0]?.message?.content ?? null;
  } catch (error) {
    logger.error("Groq falló", { error: error instanceof Error ? error.message : "unknown" });
    return null;
  }
}
