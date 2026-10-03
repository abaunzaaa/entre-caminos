export const ACCOUNT_REMOVED_MESSAGE = "Esta cuenta ya no tiene acceso a Entre Caminos.";

export const livingUserWhere = { deletedAt: null } as const;

/** Libera el correo real. El id conserva la fila por las relaciones que no pueden borrarse. */
export function archivedAccountEmail(userId: string) {
  return `deleted.${userId}@deleted.entrecaminos.invalid`;
}

export function isAccountRemoved(user: { deletedAt?: Date | null } | null | undefined) {
  return Boolean(user?.deletedAt);
}
