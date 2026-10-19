import { z } from "zod";
import {
  FAQ_ANSWER_MAX,
  FAQ_ANSWER_MIN,
  FAQ_QUESTION_MAX,
  FAQ_QUESTION_MIN,
  FAQ_SUBJECT_MAX,
  FAQ_SUBJECT_MIN,
} from "../config/constants.js";
import { FAQ_STATUS, type FaqStatusName } from "../services/faq-rules.js";
import { sanitizeMultiline, sanitizePlainText } from "../utils/plain-text.js";

const STATUSES = [
  FAQ_STATUS.PENDING,
  FAQ_STATUS.ANSWERED,
  FAQ_STATUS.PUBLISHED,
  FAQ_STATUS.HIDDEN,
  FAQ_STATUS.DISCARDED,
] as const satisfies readonly FaqStatusName[];

const SOURCES = ["USER_SUBMISSION", "ADMIN_CREATED"] as const;

function emptyToUndefined(value: unknown) {
  if (value == null || value === "") {
    return undefined;
  }
  return value;
}

const subjectField = z.preprocess(
  (value) => (typeof value === "string" ? sanitizePlainText(value) : value),
  z
    .string({ required_error: "El asunto es obligatorio", invalid_type_error: "El asunto es obligatorio" })
    .min(FAQ_SUBJECT_MIN, "El asunto debe tener al menos 3 caracteres")
    .max(FAQ_SUBJECT_MAX, "El asunto es demasiado largo"),
);

const questionField = z.preprocess(
  (value) => (typeof value === "string" ? sanitizeMultiline(value) : value),
  z
    .string({ required_error: "La pregunta es obligatoria", invalid_type_error: "La pregunta es obligatoria" })
    .min(FAQ_QUESTION_MIN, "La pregunta debe tener al menos 10 caracteres")
    .max(FAQ_QUESTION_MAX, "La pregunta es demasiado larga"),
);

const optionalSubjectField = z.preprocess(
  (value) => (typeof value === "string" ? sanitizePlainText(value) : value),
  z
    .string()
    .min(FAQ_SUBJECT_MIN, "El asunto debe tener al menos 3 caracteres")
    .max(FAQ_SUBJECT_MAX, "El asunto es demasiado largo")
    .optional(),
);

const optionalQuestionField = z.preprocess(
  (value) => (typeof value === "string" ? sanitizeMultiline(value) : value),
  z
    .string()
    .min(FAQ_QUESTION_MIN, "La pregunta debe tener al menos 10 caracteres")
    .max(FAQ_QUESTION_MAX, "La pregunta es demasiado larga")
    .optional(),
);

const answerField = z.preprocess((value) => {
  if (value == null || value === "") {
    return undefined;
  }
  if (typeof value !== "string") {
    return value;
  }
  const clean = sanitizeMultiline(value);
  return clean.length ? clean : undefined;
}, z.string().min(FAQ_ANSWER_MIN, "La respuesta debe tener al menos 10 caracteres").max(FAQ_ANSWER_MAX, "La respuesta es demasiado larga").optional());

const nullableAnswerField = z.preprocess((value) => {
  if (value === undefined) {
    return undefined;
  }
  if (value == null) {
    return null;
  }
  if (typeof value !== "string") {
    return value;
  }
  const clean = sanitizeMultiline(value);
  return clean.length ? clean : null;
}, z.string().min(FAQ_ANSWER_MIN, "La respuesta debe tener al menos 10 caracteres").max(FAQ_ANSWER_MAX, "La respuesta es demasiado larga").nullable().optional());

export const submitFaqSchema = z.object({
  subject: subjectField,
  question: questionField,
});

export const adminFaqCreateSchema = z
  .object({
    subject: subjectField,
    question: questionField,
    answer: answerField,
    status: z.enum(STATUSES).optional().default(FAQ_STATUS.HIDDEN),
  })
  .superRefine((data, ctx) => {
    if ((data.status === FAQ_STATUS.PUBLISHED || data.status === FAQ_STATUS.ANSWERED) && !data.answer) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["answer"],
        message:
          data.status === FAQ_STATUS.PUBLISHED
            ? "Para publicar la pregunta necesita una respuesta."
            : "Guarda una respuesta antes de marcarla como respondida.",
      });
    }
  });

export const adminFaqUpdateSchema = z
  .object({
    subject: optionalSubjectField,
    question: optionalQuestionField,
    answer: nullableAnswerField,
    status: z.enum(STATUSES).optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "No hay cambios para guardar.",
  });

export const answerFaqSchema = z.object({
  answer: z.preprocess(
    (value) => (typeof value === "string" ? sanitizeMultiline(value) : value),
    z
      .string({ required_error: "La respuesta es obligatoria", invalid_type_error: "La respuesta es obligatoria" })
      .min(FAQ_ANSWER_MIN, "La respuesta debe tener al menos 10 caracteres")
      .max(FAQ_ANSWER_MAX, "La respuesta es demasiado larga"),
  ),
  publish: z.boolean().optional().default(false),
});

export const adminFaqListSchema = z.object({
  q: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    z.string().max(120).optional(),
  ),
  status: z.preprocess(emptyToUndefined, z.enum(STATUSES).optional()),
  source: z.preprocess(emptyToUndefined, z.enum(SOURCES).optional()),
  sort: z.preprocess(emptyToUndefined, z.enum(["newest", "oldest"]).optional()),
  page: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).optional()),
  limit: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(50).optional()),
});

export const faqIdSchema = z.object({
  id: z.string().uuid({ message: "Identificador de pregunta inválido" }),
});

export type SubmitFaqInput = z.infer<typeof submitFaqSchema>;
export type AdminFaqCreateInput = z.infer<typeof adminFaqCreateSchema>;
export type AdminFaqUpdateInput = z.infer<typeof adminFaqUpdateSchema>;
export type AnswerFaqInput = z.infer<typeof answerFaqSchema>;
export type AdminFaqListQuery = z.infer<typeof adminFaqListSchema>;
