import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

/**
 * Cliente preparado para recomendaciones personalizadas (sprints posteriores).
 * No se invoca en Sprint 1; queda cableado para no improvisar otra tecnología.
 */
export async function generateExperienceRecommendation(prompt: string): Promise<string | null> {
  if (!env.OPENAI_API_KEY) {
    logger.info("OpenAI no configurado; recomendación omitida");
    return null;
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL,
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
    logger.error("OpenAI falló", { status: response.status });
    return null;
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  return data.choices?.[0]?.message?.content ?? null;
}
