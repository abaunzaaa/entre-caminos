export const INACTIVE_ACCOUNT_MESSAGE = "Tu cuenta está inactiva. Contacta a soporte.";
export const INACTIVE_ACCOUNT_CONTACT_REASON = "Mi cuenta está inactiva";

export function isInactiveAccountMessage(message: string) {
  return message === INACTIVE_ACCOUNT_MESSAGE;
}
