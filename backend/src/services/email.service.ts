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

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  return sendMail({
    to,
    subject: "Restablece tu contraseña — Entre Caminos",
    text: `Usa este enlace para restablecer tu contraseña: ${resetUrl}`,
    html: `
      <p>Hola,</p>
      <p>Recibimos una solicitud para restablecer tu contraseña en <strong>Entre Caminos</strong>.</p>
      <p><a href="${resetUrl}">Restablecer contraseña</a></p>
      <p>Si no fuiste tú, ignora este mensaje.</p>
    `,
  });
}

export async function sendVerificationEmail(to: string, verifyUrl: string) {
  return sendMail({
    to,
    subject: "Confirma tu correo — Entre Caminos",
    text: `Confirma tu cuenta: ${verifyUrl}`,
    html: `
      <p>Bienvenido a Entre Caminos.</p>
      <p><a href="${verifyUrl}">Confirmar correo electrónico</a></p>
    `,
  });
}
