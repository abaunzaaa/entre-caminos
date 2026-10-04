import { env } from "../config/env.js";
import { ApiError } from "../utils/api-error.js";
import { fitGuideModelMessages } from "../utils/guide-history.js";
import { logger } from "../utils/logger.js";

const RETIRED_GROQ_MODELS: Record<string, string> = {
  "llama-3.3-70b-versatile": "openai/gpt-oss-120b",
  "llama-3.1-8b-instant": "openai/gpt-oss-20b",
};

type GroqChatMessage = { role: "system" | "user" | "assistant"; content: string };

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

function looksLikeJsonObject(text: string) {
  const trimmed = text.trim();
  return trimmed.startsWith("{") && trimmed.includes("}");
}

/**
 * Cuando Groq falla la validación JSON, a veces deja el texto útil en failed_generation.
 * Lo convertimos al esquema del guía para no tumbar el chat.
 */
export function coerceGuideJson(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) {
    return "";
  }
  if (looksLikeJsonObject(trimmed)) {
    return trimmed;
  }

  const paren = trimmed.match(/\(([^)]+)\)\s*$/);
  let reply = trimmed;
  let suggestions: string[] = [];
  if (paren && typeof paren.index === "number") {
    suggestions = paren[1]
      .split(/[,;|/]/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 6);
    reply = trimmed.slice(0, paren.index).trim() || trimmed;
  }

  return JSON.stringify({
    reply,
    intent: "clarify",
    status: "need_info",
    questions: reply ? [reply] : [],
    suggestions,
    plan: null,
    planProgress: null,
    experienceIds: [],
  });
}

function failedGenerationFromDetail(detail: string) {
  try {
    const payload = JSON.parse(detail) as {
      error?: { code?: string; failed_generation?: string };
    };
    if (payload.error?.code === "json_validate_failed" && payload.error.failed_generation) {
      return payload.error.failed_generation.trim();
    }
  } catch {
    /* ignore */
  }
  return "";
}

async function requestGroqCompletion(messages: GroqChatMessage[]) {
  return fetch(`${groqBase()}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${groqKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: groqModel(),
      temperature: 0.4,
      max_tokens: 2048,
      response_format: { type: "json_object" },
      messages,
    }),
  });
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

  const baseMessages: GroqChatMessage[] = [
    {
      role: "system",
      content: `${system}

IMPORTANTE: Tu única salida debe ser un único objeto JSON válido que empiece con { y termine con }.
Nunca respondas con texto suelto, preguntas sueltas ni listas fuera del JSON.`,
    },
    ...turns.filter((item) => item.content.trim()).map((item) => ({
      role: item.role,
      content: item.content,
    })),
  ];

  let response: Response | null = null;
  let lastNetworkError = "";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      response = await requestGroqCompletion(
        fitGuideModelMessages(
          attempt === 0
            ? baseMessages
            : [
                ...baseMessages,
                {
                  role: "user",
                  content:
                    'Responde SOLO un objeto JSON con las claves reply, intent, status, questions, suggestions, plan, planProgress y experienceIds. Sin texto fuera del JSON.',
                },
              ],
        ),
      );
      break;
    } catch (error) {
      lastNetworkError = error instanceof Error ? error.message : "unknown";
      logger.error("Groq sin conexión", { error: lastNetworkError, attempt: attempt + 1 });
      if (attempt === 1) {
        throw ApiError.unavailable("No pude conectar con el guía. Comprueba tu conexión e intenta de nuevo.");
      }
    }
  }

  if (!response) {
    throw ApiError.unavailable("No pude conectar con el guía. Comprueba tu conexión e intenta de nuevo.");
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    const recovered = coerceGuideJson(failedGenerationFromDetail(detail));
    if (recovered) {
      logger.warn("Groq JSON inválido; se recuperó failed_generation", {
        status: response.status,
        model: groqModel(),
      });
      return recovered;
    }
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
  return coerceGuideJson(text) || text;
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
