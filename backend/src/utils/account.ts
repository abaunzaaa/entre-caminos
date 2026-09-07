export const ACCOUNT_REMOVED_MESSAGE = "Esta cuenta ya no tiene acceso a Entre Caminos.";

export const livingUserWhere = { deletedAt: null } as const;

export function isAccountRemoved(user: { deletedAt?: Date | null } | null | undefined) {
  return Boolean(user?.deletedAt);
}
