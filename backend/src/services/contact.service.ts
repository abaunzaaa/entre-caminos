import { CONTACT_KINDS, type ContactKindName } from "../config/constants.js";
import { prisma } from "../database/prisma.js";
import { ApiError } from "../utils/api-error.js";
import { logger } from "../utils/logger.js";
import { sendContactEmail } from "./email.service.js";
import type { ContactInput } from "../validators/contact.validator.js";

function persistedMessage(input: ContactInput) {
  const extra: string[] = [];
  if (input.kind === CONTACT_KINDS.POSIBLE_USUARIO && input.reason) {
    extra.push(`Motivo de contacto: ${input.reason}`);
  }
  if (input.kind === CONTACT_KINDS.ALIADO) {
    if (input.company) extra.push(`Empresa o experiencia: ${input.company}`);
    if (input.allyType) extra.push(`Tipo de experiencia: ${input.allyType}`);
  }
  return extra.length ? `${extra.join("\n")}\n\n${input.message}` : input.message;
}

export async function submitContact(input: ContactInput) {
  const kind = input.kind as ContactKindName;
  const contact = await prisma.contact.create({
    data: {
      type: kind,
      name: input.name,
      email: input.email,
      message: persistedMessage(input),
    },
  });

  const sent = await sendContactEmail({
    kind,
    name: contact.name,
    email: contact.email,
    message: input.message,
    reason: kind === CONTACT_KINDS.POSIBLE_USUARIO ? input.reason ?? null : null,
    company: kind === CONTACT_KINDS.ALIADO ? input.company ?? null : null,
    allyType: kind === CONTACT_KINDS.ALIADO ? input.allyType ?? null : null,
    createdAt: contact.createdAt,
  });

  if (!sent) {
    logger.error("No se pudo enviar el correo de contacto", { kind: contact.type });
    throw new ApiError(500, "No pudimos enviar tu mensaje. Inténtalo de nuevo.", "EMAIL_UNAVAILABLE");
  }

  return contact;
}
