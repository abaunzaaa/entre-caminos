export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(statusCode: number, message: string, code = "APP_ERROR", details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.name = "ApiError";
  }

  static badRequest(message: string, details?: unknown) {
    return new ApiError(400, message, "BAD_REQUEST", details);
  }

  static unauthorized(message = "No autenticado") {
    return new ApiError(401, message, "UNAUTHORIZED");
  }

  static forbidden(message = "No tienes permisos para esta acción") {
    return new ApiError(403, message, "FORBIDDEN");
  }

  static notFound(message = "Recurso no encontrado") {
    return new ApiError(404, message, "NOT_FOUND");
  }

  static conflict(message: string) {
    return new ApiError(409, message, "CONFLICT");
  }

  static unprocessable(message: string, details?: unknown) {
    return new ApiError(422, message, "UNPROCESSABLE_ENTITY", details);
  }
}
