import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export const SESSION_COOKIE = "rm_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

declare global {
  namespace Express {
    interface Request {
      rmUserId?: string;
    }
  }
}

function hmacHex(key: string | Buffer, value: string): string {
  return createHmac("sha256", key).update(value).digest("hex");
}

function base64Url(value: string): string {
  return Buffer.from(value).toString("base64url");
}

function readCookie(request: Request, name: string): string | null {
  const cookieHeader = request.headers.cookie ?? "";
  const found = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : null;
}

export function isSecureRequest(req: { secure?: boolean; headers?: Record<string, string | string[] | undefined> }): boolean {
  if (req.secure) return true;
  const proto = req.headers?.["x-forwarded-proto"];
  const value = Array.isArray(proto) ? proto[0] : proto;
  return typeof value === "string" && value.split(",")[0].trim() === "https";
}

export function createSessionCookie(userId: string, secure = true): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not configured");
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = `${userId}.${expiresAt}`;
  const signature = hmacHex(secret, payload);
  const value = `${base64Url(payload)}.${signature}`;
  // Telegram Mini Apps load inside a cross-site webview, so the session
  // cookie MUST be SameSite=None (which requires Secure). SameSite=Lax is
  // dropped by the browser in that cross-site context, breaking the session.
  const secureFlag = secure ? "; Secure" : "";
  return `${SESSION_COOKIE}=${encodeURIComponent(value)}; Max-Age=${SESSION_TTL_SECONDS}; Path=/; HttpOnly; SameSite=None${secureFlag}`;
}

function verifySession(value: string | null): string | null {
  const secret = process.env.SESSION_SECRET;
  if (!secret || !value) return null;
  const [encodedPayload, signature] = value.split(".");
  if (!encodedPayload || !signature) return null;
  let payload: string;
  try {
    payload = Buffer.from(encodedPayload, "base64url").toString("utf8");
  } catch {
    return null;
  }
  const expected = hmacHex(secret, payload);
  const actualBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }
  const [userId, expiry] = payload.split(".");
  if (!userId || !expiry || Number(expiry) < Math.floor(Date.now() / 1000)) return null;
  return userId;
}

export function requireSession(request: Request, response: Response, next: NextFunction): void {
  const userId = verifySession(readCookie(request, SESSION_COOKIE));
  if (!userId) {
    response.status(401).json({ error: "Telegram session required" });
    return;
  }
  request.rmUserId = userId;
  next();
}

export function validateTelegramInitData(initData: string): {
  id: string;
  username: string | null;
  firstName: string;
  lastName: string | null;
  photoUrl: string | null;
  languageCode: string | null;
  isPremium: boolean;
} {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) throw new Error("TELEGRAM_BOT_TOKEN is not configured");

  const params = new URLSearchParams(initData);
  const providedHash = params.get("hash");
  const authDate = Number(params.get("auth_date"));
  const userRaw = params.get("user");
  if (!providedHash || !userRaw || !Number.isFinite(authDate)) {
    throw new Error("Telegram initData is incomplete");
  }
  if (Math.floor(Date.now() / 1000) - authDate > 86_400) {
    throw new Error("Telegram initData has expired");
  }

  const dataCheckString = [...params.entries()]
    .filter(([key]) => key !== "hash")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const expectedHash = hmacHex(secretKey, dataCheckString);
  const actualBuffer = Buffer.from(providedHash, "hex");
  const expectedBuffer = Buffer.from(expectedHash, "hex");
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    throw new Error("Telegram initData signature is invalid");
  }

  let telegramUser: unknown;
  try {
    telegramUser = JSON.parse(userRaw);
  } catch {
    throw new Error("Telegram user payload is invalid");
  }
  if (
    !telegramUser ||
    typeof telegramUser !== "object" ||
    !("id" in telegramUser) ||
    !("first_name" in telegramUser) ||
    (typeof telegramUser.id !== "number" && typeof telegramUser.id !== "string") ||
    typeof telegramUser.first_name !== "string"
  ) {
    throw new Error("Telegram user payload is incomplete");
  }
  const u = telegramUser as Record<string, unknown>;
  const str = (v: unknown): string | null =>
    typeof v === "string" && v.length > 0 ? v : null;
  return {
    id: String(u.id),
    username: str(u.username),
    firstName: u.first_name as string,
    lastName: str(u.last_name),
    photoUrl: str(u.photo_url),
    languageCode: str(u.language_code),
    isPremium: u.is_premium === true,
  };
}