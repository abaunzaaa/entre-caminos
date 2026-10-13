import { z } from "zod";
import { CONTACT_MESSAGE_MAX } from "../config/constants.js";

export const VISITOR_REVIEW_MESSAGES = {
  rating: "Selecciona una calificación.",
  ratingStep: "La calificación debe estar entre 1 y 5 en pasos de 0,5.",
  organization: "Selecciona la organización y atención.",
  value: "Selecciona la relación calidad-precio.",
  recommended: "Indica si recomendarías esta experiencia.",
  commentRequired: "Escribe un comentario sobre tu experiencia.",
  commentTooLong: `El comentario es demasiado largo. Puede tener hasta ${CONTACT_MESSAGE_MAX} caracteres.`,
  notVisited: "Marca esta experiencia como visitada para poder compartir tu reseña.",
  duplicate: "Ya publicaste una reseña para esta sede.",
  locationRequired: "Elige la sede donde viviste esta experiencia.",
  locationInvalid: "La sede no pertenece a esta experiencia.",
  locationMissing: "Esta experiencia no tiene una sede para asociar la reseña.",
  publishFailed: "No pudimos publicar tu reseña. Inténtalo nuevamente.",
  photosMax: "Puedes agregar máximo 5 fotos.",
  photoType: "Esta imagen no tiene un formato permitido.",
  photoSize: "Cada foto puede pesar máximo 5 MB.",
} as const;

export const VISITOR_REVIEW_PHOTO_MAX = 5;
export const VISITOR_REVIEW_PHOTO_BYTES = 5 * 1024 * 1024;

const star = (message: string) =>
  z.coerce
    .number({ required_error: message, invalid_type_error: message })
    .int(message)
    .min(1, message)
    .max(5, message);

const halfStar = (missing: string, invalid: string) =>
  z.coerce
    .number({ required_error: missing, invalid_type_error: missing })
    .refine((value) => {
      if (!Number.isFinite(value)) {
        return false;
      }
      const doubled = value * 2;
      return value >= 1 && value <= 5 && Math.abs(doubled - Math.round(doubled)) < 1e-6;
    }, invalid);

function asBoolean(value: unknown) {
  if (value === true || value === "true") {
    return true;
  }
  if (value === false || value === "false") {
    return false;
  }
  return value;
}

function asIdList(value: unknown) {
  if (value == null || value === "") {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value.map(String);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        if (Array.isArray(parsed)) {
          return parsed.map(String);
        }
      } catch {
        return [trimmed];
      }
    }
    return [trimmed];
  }
  return value;
}

export const visitorReviewSchema = z.object({
  rating: halfStar(VISITOR_REVIEW_MESSAGES.rating, VISITOR_REVIEW_MESSAGES.ratingStep),
  organizationRating: star(VISITOR_REVIEW_MESSAGES.organization),
  valueRating: star(VISITOR_REVIEW_MESSAGES.value),
  recommended: z.preprocess(
    asBoolean,
    z.boolean({
      required_error: VISITOR_REVIEW_MESSAGES.recommended,
      invalid_type_error: VISITOR_REVIEW_MESSAGES.recommended,
    }),
  ),
  comment: z
    .string({ required_error: VISITOR_REVIEW_MESSAGES.commentRequired })
    .trim()
    .min(1, VISITOR_REVIEW_MESSAGES.commentRequired)
    .max(CONTACT_MESSAGE_MAX, VISITOR_REVIEW_MESSAGES.commentTooLong),
  keepImageIds: z.preprocess(asIdList, z.array(z.string().min(1)).max(VISITOR_REVIEW_PHOTO_MAX).optional()),
  locationId: z.string().uuid(VISITOR_REVIEW_MESSAGES.locationInvalid).optional(),
});
