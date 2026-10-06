import axios from "axios";

type ApiErrorBody = {
  response?: {
    data?: {
      error?: {
        message?: string;
        details?: Array<{ field?: string; message?: string }>;
        code?: string;
      };
    };
  };
};

const TOKEN_ERROR_MESSAGES = new Set([
  "Token inválido o expirado",
  "Token inválido",
  "Token de acceso requerido",
  "Refresh token requerido",
  "Sesión inválida",
  "Sesión inválida o usuario inactivo",
  "No autenticado",
]);

export const SESSION_ENDED_MESSAGE = "Tu sesión ha finalizado. Por favor inicia sesión nuevamente.";

export function getApiErrorMessage(err: unknown, fallback = "Ocurrió un error") {
  if (axios.isAxiosError(err) && !err.response) {
    return "No hay conexión con el servidor. Comprueba tu conexión e intenta de nuevo.";
  }

  const body = err as ApiErrorBody;
  const error = body.response?.data?.error;
  if (isExpiredSessionMessage(error?.message)) {
    return SESSION_ENDED_MESSAGE;
  }
  if (error?.code === "INTERNAL_ERROR") {
    return "No pudimos completar la solicitud. Inténtalo de nuevo.";
  }
  if (error?.code === "UNPROCESSABLE_ENTITY" && (!error.message || isTechnicalMessage(error.message))) {
    return "Revisa los datos de la experiencia.";
  }
  const details = error?.details?.map((item) => item.message).filter((message) => message && !isTechnicalMessage(message)) ?? [];
  if (details.length > 0) {
    return details.join(". ");
  }
  if (error?.message && !isTechnicalMessage(error.message)) {
    return error.message;
  }
  return fallback;
}

function isExpiredSessionMessage(message?: string) {
  return Boolean(message && TOKEN_ERROR_MESSAGES.has(message));
}

function isTechnicalMessage(message: string) {
  return /prisma|stack trace|node_modules|invalid discriminator/i.test(message);
}
