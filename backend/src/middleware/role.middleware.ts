import type { NextFunction, Request, Response } from "express";
import type { PermissionName, RoleName } from "../config/constants.js";
import { ApiError } from "../utils/api-error.js";

export function roleMiddleware(allowedRoles: RoleName[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(ApiError.unauthorized());
      return;
    }

    if (!allowedRoles.includes(req.user.role as RoleName)) {
      next(ApiError.forbidden("Rol insuficiente para acceder a este recurso"));
      return;
    }

    next();
  };
}

export function permissionMiddleware(required: PermissionName | PermissionName[]) {
  const needed = Array.isArray(required) ? required : [required];

  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(ApiError.unauthorized());
      return;
    }

    const hasAll = needed.every((permission) => req.user?.permissions.includes(permission));
    if (!hasAll) {
      next(ApiError.forbidden("No tienes el permiso requerido"));
      return;
    }

    next();
  };
}
