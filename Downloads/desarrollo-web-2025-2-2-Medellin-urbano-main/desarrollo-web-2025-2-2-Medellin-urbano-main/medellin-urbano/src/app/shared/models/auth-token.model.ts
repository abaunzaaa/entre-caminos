export interface AuthToken {
  token: string;
  userId: string;
  issuedAt: string; // ISO
  expiresAt: string; // ISO
}
