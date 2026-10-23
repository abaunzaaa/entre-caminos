import { z } from "zod";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Elige una fecha válida.");

export const PLAN_TYPES = ["aventura", "tranquilo", "romantico", "familia", "aire"] as const;
export const DURATION_KEYS = ["1-2", "3-5", "5-8", "8+"] as const;

export const plannerPreferencesSchema = z.object({
  date: day,
  budgetCop: z.number().int().min(20000, "Indica un presupuesto.").max(20000000),
  categoryIds: z.array(z.string().uuid()).min(1, "Elige al menos un interés.").max(8),
  planType: z.enum(PLAN_TYPES),
  durationKey: z.enum(DURATION_KEYS),
  municipality: z.string().trim().min(2, "Elige un municipio.").max(80),
  people: z.number().int().min(1).max(30),
  note: z.string().trim().max(400).optional().default(""),
});

export const generatePlannerSchema = plannerPreferencesSchema.extend({
  avoid: z.array(z.string().uuid()).max(24).optional().default([]),
});

const stopSchema = z.object({
  experienceId: z.string().uuid(),
  suggestedAt: z.string().max(40).optional().default(""),
  blurb: z.string().max(280).optional().default(""),
});

export const savePlannerSchema = plannerPreferencesSchema.extend({
  title: z.string().trim().min(2).max(120),
  summary: z.string().trim().max(600),
  why: z.string().trim().max(800),
  stops: z.array(stopSchema).min(1).max(6),
});

export const plannerIdParamSchema = z.object({
  id: z.string().uuid(),
});
