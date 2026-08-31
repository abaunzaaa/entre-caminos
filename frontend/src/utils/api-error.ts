import axios from "axios";

type ApiErrorBody = {
  response?: {
    data?: {
      error?: {
        message?: string;
        details?: Array<{ field?: string; message?: string }>;
      };
    };
  };
};

export function getApiErrorMessage(err: unknown, fallback = "Ocurrió un error") {
  if (axios.isAxiosError(err) && !err.response) {
    return "No hay conexión con el servidor. Abre el backend en http://localhost:4000 y vuelve a intentar.";
  }

  const body = err as ApiErrorBody;
  const error = body.response?.data?.error;
  const details = error?.details?.map((item) => item.message).filter(Boolean) ?? [];
  if (details.length > 0) {
    return details.join(". ");
  }
  return error?.message ?? fallback;
}
