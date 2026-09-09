import { env } from "../config/env.js";
import {
  CONTACT_KIND_LABELS,
  CONTACT_SUBJECTS,
  type ContactKindName,
} from "../config/constants.js";
import { logger } from "../utils/logger.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type MailPayload = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

export type ContactEmailInput = {
  kind: ContactKindName;
  name: string;
  email: string;
  message: string;
  reason?: string | null;
  company?: string | null;
  allyType?: string | null;
  createdAt: Date;
};

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatSentAt(date: Date) {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(date);
}

export async function sendMail(payload: MailPayload): Promise<boolean> {
  if (!env.SENDGRID_API_KEY) {
    logger.warn("SendGrid no configurado. El correo no se envió.", {
      to: payload.to,
      subject: payload.subject,
    });
    return false;
  }

  try {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: payload.to }] }],
        from: { email: env.SENDGRID_FROM_EMAIL },
        ...(payload.replyTo ? { reply_to: { email: payload.replyTo } } : {}),
        subject: payload.subject,
        content: [
          { type: "text/plain", value: payload.text ?? payload.subject },
          { type: "text/html", value: payload.html },
        ],
      }),
    });

    if (!response.ok) {
      logger.error("SendGrid falló", { status: response.status });
      return false;
    }

    return true;
  } catch (error) {
    logger.error("SendGrid no disponible", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return false;
  }
}

function contactRows(input: ContactEmailInput) {
  const rows: Array<[string, string]> = [
    ["Tipo de contacto", CONTACT_KIND_LABELS[input.kind]],
    ["Nombre", input.name],
    ["Correo de la persona", input.email],
  ];

  if (input.kind === "POSIBLE_USUARIO" && input.reason) {
    rows.push(["Motivo de contacto", input.reason]);
  }

  if (input.kind === "ALIADO") {
    if (input.company) {
      rows.push(["Empresa o experiencia", input.company]);
    }
    if (input.allyType) {
      rows.push(["Tipo de experiencia", input.allyType]);
    }
  }

  rows.push(["Comentario o mensaje", input.message]);
  rows.push(["Fecha y hora del envío", `${formatSentAt(input.createdAt)} (${input.createdAt.toISOString()})`]);

  return rows;
}

export function buildContactMail(input: ContactEmailInput) {
  const rows = contactRows(input);
  const replyTo = EMAIL_PATTERN.test(input.email) ? input.email : undefined;

  return {
    to: env.CONTACT_TO_EMAIL,
    subject: CONTACT_SUBJECTS[input.kind],
    replyTo,
    text: rows.map(([label, value]) => `${label}: ${value}`).join("\n"),
    html: `
      <div style="font-family:Georgia,serif;color:#1c332e;line-height:1.5">
        <p>Nuevo mensaje de contacto en <strong>Entre Caminos</strong>.</p>
        <table style="border-collapse:collapse;width:100%;max-width:640px">
          ${rows
            .map(
              ([label, value]) => `
            <tr>
              <td style="padding:8px 12px 8px 0;vertical-align:top;font-weight:700;white-space:nowrap">${escapeHtml(label)}</td>
              <td style="padding:8px 0;vertical-align:top;white-space:pre-wrap">${escapeHtml(value)}</td>
            </tr>`,
            )
            .join("")}
        </table>
      </div>
    `,
  };
}

export async function sendContactEmail(input: ContactEmailInput): Promise<boolean> {
  return sendMail(buildContactMail(input));
}

export async function sendPasswordResetEmail(to: string, resetUrl: string, ttlLabel: string) {
  return sendMail({
    to,
    subject: "Restablece tu contraseña — Entre Caminos",
    text: [
      "Hola,",
      "",
      "Recibimos una solicitud para restablecer tu contraseña en Entre Caminos.",
      `Abre este enlace para crear una nueva: ${resetUrl}`,
      `El enlace es válido por ${ttlLabel}.`,
      "",
      "Si no fuiste tú, ignora este mensaje.",
    ].join("\n"),
    html: `
      <p>Hola,</p>
      <p>Recibimos una solicitud para restablecer tu contraseña en <strong>Entre Caminos</strong>.</p>
      <p><a href="${resetUrl}">Restablecer contraseña</a></p>
      <p>Este enlace es válido por ${ttlLabel}.</p>
      <p>Si no fuiste tú, ignora este mensaje.</p>
    `,
  });
}

export async function sendVerificationEmail(to: string, code: string, ttlLabel: string) {
  return sendMail({
    to,
    subject: "Tu código de verificación — Entre Caminos",
    text: [
      "Bienvenido a Entre Caminos.",
      "",
      `Tu código de verificación es: ${code}`,
      `Este código caduca en ${ttlLabel}.`,
      "",
      "Si no creaste una cuenta, ignora este mensaje.",
    ].join("\n"),
    html: `
      <p>Bienvenido a <strong>Entre Caminos</strong>.</p>
      <p>Tu código de verificación es:</p>
      <p style="font-size:24px;letter-spacing:4px;font-weight:700">${code}</p>
      <p>Este código caduca en ${ttlLabel}.</p>
      <p>Si no creaste una cuenta, ignora este mensaje.</p>
    `,
  });
}
