const KEY = "ec_pending_verification_email";

export function setPendingVerificationEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) {
    sessionStorage.removeItem(KEY);
    return;
  }
  sessionStorage.setItem(KEY, normalized);
}

export function getPendingVerificationEmail() {
  try {
    return (sessionStorage.getItem(KEY) ?? "").trim().toLowerCase();
  } catch {
    return "";
  }
}

export function clearPendingVerificationEmail() {
  sessionStorage.removeItem(KEY);
}
