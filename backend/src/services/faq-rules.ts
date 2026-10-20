export const FAQ_STATUS = {
  PENDING: "PENDING",
  ANSWERED: "ANSWERED",
  PUBLISHED: "PUBLISHED",
  HIDDEN: "HIDDEN",
  DISCARDED: "DISCARDED",
} as const;

export type FaqStatusName = (typeof FAQ_STATUS)[keyof typeof FAQ_STATUS];

export function hasFaqAnswer(answer: string | null | undefined) {
  return Boolean(answer && answer.trim().length > 0);
}

/** La página pública solo muestra preguntas publicadas y con respuesta. */
export function isPubliclyVisibleFaq(status: string, answer: string | null | undefined) {
  return status === FAQ_STATUS.PUBLISHED && hasFaqAnswer(answer);
}

export function statusAfterUnpublish(answer: string | null | undefined): FaqStatusName {
  return hasFaqAnswer(answer) ? FAQ_STATUS.ANSWERED : FAQ_STATUS.PENDING;
}

export function resolveFaqPublication(input: {
  status: FaqStatusName;
  answer: string | null;
  publishedAt: Date | null;
}): { ok: true; status: FaqStatusName; publishedAt: Date | null } | { ok: false; message: string } {
  if (input.status === FAQ_STATUS.PUBLISHED && !hasFaqAnswer(input.answer)) {
    return { ok: false, message: "Para publicar la pregunta necesita una respuesta." };
  }
  if (input.status === FAQ_STATUS.ANSWERED && !hasFaqAnswer(input.answer)) {
    return { ok: false, message: "Guarda una respuesta antes de marcarla como respondida." };
  }
  if (input.status === FAQ_STATUS.PUBLISHED) {
    return { ok: true, status: input.status, publishedAt: input.publishedAt ?? new Date() };
  }
  return { ok: true, status: input.status, publishedAt: null };
}
