import { z } from "zod";
import {
  ONBOARDING_COMPANION_ALIASES,
  ONBOARDING_COMPANIONS,
  ONBOARDING_INTEREST_ALIASES,
  ONBOARDING_INTERESTS,
  ONBOARDING_PLACE_ALIASES,
  ONBOARDING_PLACES,
} from "../config/onboarding.js";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Elige una fecha válida.");
export const ANY_MUNICIPALITY = "ANY";

const municipalityField = z
  .string()
  .trim()
  .min(2, "Elige un municipio.")
  .max(80)
  .transform((value) => (value.toLocaleLowerCase("es") === "cualquier municipio" ? ANY_MUNICIPALITY : value));

export const PLAN_TYPES = ["aventura", "tranquilo", "romantico", "familia", "aire"] as const;
export const PLANNER_FOLDERS = ["naturaleza", "cultura", "sabores", "descubrimientos"] as const;
export const DURATION_KEYS = ["1-2", "3-5", "5-8", "8+"] as const;

function closedList(allowed: readonly string[], aliases: Record<string, string>, message: string) {
  return z
    .array(z.string().trim().min(1))
    .max(allowed.length)
    .transform((values, ctx) => {
      const next: string[] = [];
      for (const raw of values) {
        const mapped = aliases[raw] ?? raw;
        if (!allowed.includes(mapped)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message });
          continue;
        }
        if (!next.includes(mapped)) {
          next.push(mapped);
        }
      }
      return next;
    });
}

function mapCompanion(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  return ONBOARDING_COMPANION_ALIASES[trimmed] ?? trimmed;
}

const plannerPreferencesObject = z.object({
    date: day,
    budgetCop: z.number().int().min(20000, "Indica un presupuesto.").max(20000000),
    categoryIds: z.array(z.string().uuid()).max(8).optional().default([]),
    interests: closedList(ONBOARDING_INTERESTS, ONBOARDING_INTEREST_ALIASES, "Interés no permitido.").optional().default([]),
    environments: closedList(ONBOARDING_PLACES, ONBOARDING_PLACE_ALIASES, "Ambiente no permitido.").optional().default([]),
    companion: z.preprocess(mapCompanion, z.enum(ONBOARDING_COMPANIONS).optional()),
    planType: z.enum(PLAN_TYPES).optional(),
    durationKey: z.enum(DURATION_KEYS),
    municipality: municipalityField,
    people: z.number().int().min(1).max(30),
    note: z.string().trim().max(400).optional().default(""),
});

function refinePreferences(value: z.infer<typeof plannerPreferencesObject>, ctx: z.RefinementCtx) {
  if (!value.interests.length && !value.categoryIds.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["interests"],
      message: "Elige al menos un interés.",
    });
  }
  if (value.companion === "Solo" && value.people !== 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["people"],
      message: "Si vas solo, el plan es para una persona.",
    });
  }
}

export const plannerPreferencesSchema = plannerPreferencesObject.superRefine(refinePreferences);

export const generatePlannerSchema = plannerPreferencesObject
  .extend({
    avoid: z.array(z.string().uuid()).max(24).optional().default([]),
    profileEnvironments: closedList(ONBOARDING_PLACES, ONBOARDING_PLACE_ALIASES, "Ambiente no permitido.").optional().default([]),
    profileCompanions: closedList(ONBOARDING_COMPANIONS, ONBOARDING_COMPANION_ALIASES, "Compañía no permitida.").optional().default([]),
  })
  .superRefine(refinePreferences);

const stopSchema = z.object({
  experienceId: z.string().uuid(),
  suggestedAt: z.string().max(40).optional().default(""),
  suggestedEnd: z.string().max(40).optional().default(""),
  blurb: z.string().max(400).optional().default(""),
  title: z.string().max(120).optional().default(""),
  location: z.string().max(160).optional().default(""),
  stopType: z.enum(["experience", "suggestion"]).optional().default("experience"),
  included: z.boolean().optional().default(true),
  additionalCost: z.string().max(40).optional().default(""),
  durationMinutes: z.number().int().min(0).max(24 * 60).nullable().optional(),
});

export const savePlannerSchema = plannerPreferencesObject
  .extend({
    title: z.string().trim().min(2).max(120),
    summary: z.string().trim().max(600),
    why: z.string().trim().max(1600),
    scheduleLabel: z.string().trim().max(80).optional().default(""),
    costNotes: z.string().trim().max(300).optional().default(""),
    alternativeMessage: z.string().trim().max(400).optional().default(""),
    folderKey: z.enum(PLANNER_FOLDERS),
    stops: z.array(stopSchema).min(1).max(8),
  })
  .superRefine(refinePreferences);

export const plannerIdParamSchema = z.object({
  id: z.string().uuid(),
});
