import { z } from "zod";

const optionalDate = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value, ctx) => {
    if (value === undefined) {
      return undefined;
    }
    if (value === null || value.trim() === "") {
      return null;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Fecha inválida" });
      return z.NEVER;
    }
    return parsed;
  });

export const featuredRankingQuerySchema = z.object({
  criterion: z.enum(["visits", "favorites", "reviews", "rating", "trending"]),
});

export const featureExperienceSchema = z.object({
  featuredOrder: z.number().int().min(0).max(999).nullable().optional(),
  featuredFrom: optionalDate,
  featuredUntil: optionalDate,
});

export const featuredOrderSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().uuid(),
        featuredOrder: z.number().int().min(0).max(999),
      }),
    )
    .min(1),
});
