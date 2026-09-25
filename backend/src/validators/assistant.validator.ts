import { z } from "zod";

export const assistantChatSchema = z.object({
  message: z.string().trim().min(1, "Escribe un mensaje").max(1200),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().max(4000),
      }),
    )
    .max(20)
    .optional()
    .default([]),
  experienceId: z.string().trim().min(8).max(80).optional(),
  location: z
    .object({
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      city: z.string().trim().max(80).optional(),
    })
    .optional(),
});
