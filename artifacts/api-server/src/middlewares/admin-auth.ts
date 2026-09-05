import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export const ADMIN_COOKIE = "rm_admin_session";
const ADMIN_TTL_SECONDS = 60 * 60 * 12; // 12h admin sessions

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "joker026";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Info52305344";

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

function isSecureRequest(req: { secure?: boolean; headers?: Record<string, string | string[] | undefined> }): boolean {
  if (req.secure) return true;
  const proto = req.headers?.["x-forwarded-proto"];
  const value = Array.isArray(proto) ? proto[0] : proto;
  return typeof value === "string" && value.split(",")[0].trim() === "https";
}

export function verifyAdminCredentials(username: string, password: string): boolean {
  const userOk = timingSafeEqual(Buffer.from(username), Buffer.from(ADMIN_USERNAME));
  const passOk = timingSafeEqual(Buffer.from(password), Buffer.from(ADMIN_PASSWORD));
  return userOk && passOk;
}

export function createAdminCookie(secure = true): string {
  const secret = process.env.SESSION_SECRET || "rm-admin-dev-secret";
  const expiresAt = Math.floor(Date.now() / 1000) + ADMIN_TTL_SECONDS;
  const payload = `admin.${expiresAt}`;
  const signature = hmacHex(secret, payload);
  const value = `${base64Url(payload)}.${signature}`;
  const secureFlag = secure ? "; Secure" : "";
  return `${ADMIN_COOKIE}=${encodeURIComponent(value)}; Max-Age=${ADMIN_TTL_SECONDS}; Path=/; HttpOnly; SameSite=Lax${secureFlag}`;
}

function verifyAdminSession(value: string | null): boolean {
  const secret = process.env.SESSION_SECRET || "rm-admin-dev-secret";
  if (!secret || !value) return false;
  const [encodedPayload, signature] = value.split(".");
  if (!encodedPayload || !signature) return false;
  let payload: string;
  try {
    payload = Buffer.from(encodedPayload, "base64url").toString("utf8");
  } catch {
    return false;
  }
  const expected = hmacHex(secret, payload);
  const actualBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    return false;
  }
  const [, expiry] = payload.split(".");
  if (!expiry || Number(expiry) < Math.floor(Date.now() / 1000)) return false;
  return true;
}

export function requireAdmin(request: Request, response: Response, next: NextFunction): void {
  if (!verifyAdminSession(readCookie(request, ADMIN_COOKIE))) {
    response.status(401).json({ error: "Admin session required" });
    return;
  }
  next();
}

export { isSecureRequest };
