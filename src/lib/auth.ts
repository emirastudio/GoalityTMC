import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET!;
const TOKEN_NAME = "goality_token";

// Binds a password-reset token to the account's CURRENT password hash. The
// signature is embedded in the reset token; at reset time we recompute it from
// the stored hash. Once the password changes (this reset, a profile change, or
// an earlier reset from a second email) the hash — and thus the signature —
// changes, so the token (and any other outstanding reset links) is rejected.
// This makes reset links single-use without a DB token table or migration.
export function passwordResetSignature(passwordHash: string): string {
  return crypto
    .createHash("sha256")
    .update(`${passwordHash}:${JWT_SECRET}`)
    .digest("hex")
    .slice(0, 24);
}

export type TokenPayload = {
  userId: number;
  role: "admin" | "club";
  clubId?: number;
  tournamentId?: number;
  teamId?: number; // если задан — пользователь является тренером конкретной команды
  impersonating?: true; // admin просматривает аккаунт клуба
  // Multi-tenant fields
  organizationId?: number; // org the user belongs to (null for super admin)
  organizationSlug?: string; // org slug for URL routing
  isSuper?: boolean; // true = platform-level super admin
};

export const ADMIN_BACKUP_COOKIE = "goality_admin_backup";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function createToken(payload: TokenPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<TokenPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(TOKEN_NAME);
}
