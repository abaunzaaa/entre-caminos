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
    return "No hay conexión con el servidor. Abre el backend en http://localhost:4000 y vuelve a intentar.";
  }

  const body = err as ApiErrorBody;
  const error = body.response?.data?.error;
  const details = error?.details?.map((item) => item.message).filter(Boolean) ?? [];
  if (isExpiredSessionMessage(error?.message)) {
    return SESSION_ENDED_MESSAGE;
  }
  if (details.length > 0) {
    return details.join(". ");
  }
  return error?.message ?? fallback;
}

function isExpiredSessionMessage(message?: string) {
  return Boolean(message && TOKEN_ERROR_MESSAGES.has(message));
}
