import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

type MailPayload = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

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
