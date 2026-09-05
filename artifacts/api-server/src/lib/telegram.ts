import { createHmac } from "node:crypto";
import { db, rmUsersTable } from "@workspace/db";

const TELEGRAM_API_BASE = "https://api.telegram.org";

type TelegramChatId = number | string;

type TelegramUpdate = {
  update_id?: number;
  message?: {
    chat?: { id?: TelegramChatId };
    from?: TelegramUser;
    text?: string;
  };
  callback_query?: { from?: TelegramUser };
  inline_query?: { from?: TelegramUser };
};

type TelegramUser = {
  id: number | string;
  is_bot?: boolean;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
};

type WebhookLog = {
  info: (data: Record<string, unknown>, message: string) => void;
  warn?: (data: Record<string, unknown>, message: string) => void;
};

function getBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  return token;
}

/**
 * Web App (Mini App) URL.
 *
 * Read from `TELEGRAM_WEBAPP_URL` (the documented name) and fall back to the
 * legacy `TELEGRAM_MINI_APP_URL` so existing deployments are not broken.
 * Never hard-coded.
 */
export function getTelegramMiniAppUrl(): string {
  const configured = (
    process.env.TELEGRAM_WEBAPP_URL ?? process.env.TELEGRAM_MINI_APP_URL
  )?.trim();
  if (!configured) {
    throw new Error(
      "TELEGRAM_WEBAPP_URL (or TELEGRAM_MINI_APP_URL) is not configured",
    );
  }

  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    throw new Error("TELEGRAM_WEBAPP_URL must be a valid HTTPS URL");
  }

  const hostname = url.hostname.toLowerCase();
  if (
    url.protocol !== "https:" ||
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "replit.dev" ||
    hostname.endsWith(".replit.dev")
  ) {
    throw new Error(
      "TELEGRAM_WEBAPP_URL must be a public HTTPS URL, not a local or Replit development URL",
    );
  }

  return url.toString();
}

export function getTelegramWebhookUrl(): string {
  // The webhook is served by the api-server, which may be a different host
  // than the Mini App (frontend). Prefer an explicit TELEGRAM_WEBHOOK_URL;
  // otherwise derive it from the Mini App URL (works when the Vite dev proxy
  // forwards /api -> api-server through a single public tunnel).
  const explicit = process.env.TELEGRAM_WEBHOOK_URL?.trim();
  const base = explicit ?? getTelegramMiniAppUrl();
  return new URL("/api/telegram/webhook", base).toString();
}

/**
 * Derive the Telegram webhook secret from the bot token so webhook verification
 * does not require a second secret to be copied into the environment.
 */
export function getTelegramWebhookSecret(): string {
  return createHmac("sha256", getBotToken())
    .update("rm-coin-telegram-webhook")
    .digest("hex");
}

export async function getUserProfilePhotoUrl(
  telegramUserId: string,
): Promise<string | null> {
  const token = getBotToken();
  try {
    const photosRes = await fetch(
      `${TELEGRAM_API_BASE}/bot${token}/getUserProfilePhotos`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ user_id: telegramUserId, limit: 1 }),
      },
    );
    const photosJson = (await photosRes.json().catch(() => null)) as
      | { ok?: boolean; result?: { photos?: Array<Array<{ file_id: string }>> } }
      | null;
    const photos = photosJson?.result?.photos;
    const fileId = photos?.[0]?.[0]?.file_id;
    if (!fileId) return null;

    const fileRes = await fetch(
      `${TELEGRAM_API_BASE}/bot${token}/getFile`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ file_id: fileId }),
      },
    );
    const fileJson = (await fileRes.json().catch(() => null)) as
      | { ok?: boolean; result?: { file_path?: string } }
      | null;
    const filePath = fileJson?.result?.file_path;
    if (!filePath) return null;
    return `${TELEGRAM_API_BASE}/file/bot${token}/${filePath}`;
  } catch {
    return null;
  }
}

export function buildTelegramStartPayload(chatId: TelegramChatId): {
  chat_id: TelegramChatId;
  text: string;
  reply_markup: {
    inline_keyboard: Array<Array<{ text: string; web_app: { url: string } }>>;
  };
} {
  return {
    chat_id: chatId,
    text:
      "Welcome to RM Coin ⛏️\n\n" +
      "Charge your miner, watch rewarded ads for energy, and mine RM Coin.",
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "⛏️ Open RM Coin",
            web_app: { url: getTelegramMiniAppUrl() },
          },
        ],
      ],
    },
  };
}

async function callTelegramApi(
  method: string,
  body: Record<string, unknown>,
): Promise<void> {
  const response = await fetch(
    `${TELEGRAM_API_BASE}/bot${getBotToken()}/${method}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
  );

  let result: { ok?: boolean } = {};
  try {
    result = (await response.json()) as { ok?: boolean };
  } catch {
    // The status code below is enough for a safe operational error.
  }

  if (!response.ok || result.ok !== true) {
    throw new Error(`Telegram ${method} failed with HTTP ${response.status}`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function getCommand(text: string): string {
  const firstWord = text.trim().split(/\s+/, 1)[0] ?? "";
  // Strip a bot suffix like "/start@rmcoinbot" so deep-linked /start works.
  return (firstWord.split("@", 1)[0] ?? "").toLowerCase();
}

function extractTelegramUser(
  update: Record<string, unknown>,
): TelegramUser | null {
  const message = isRecord(update.message) ? update.message : null;
  if (message && isRecord(message.from)) return message.from as TelegramUser;
  const cb = isRecord(update.callback_query) ? update.callback_query : null;
  if (cb && isRecord(cb.from)) return cb.from as TelegramUser;
  const iq = isRecord(update.inline_query) ? update.inline_query : null;
  if (iq && isRecord(iq.from)) return iq.from as TelegramUser;
  return null;
}

const errMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "unknown";

/**
 * Handle an inbound Telegram update.
 *
 * Responds to `/start` (and `/start <anything>`) and `/help` with a welcome
 * message + inline Web App button. Idempotent: re-sending the same update
 * merely re-sends the welcome, and the user-record upsert is conflict-safe.
 *
 * The Mini App session is NEVER created here — opening the Web App still
 * requires the client to call `/api/auth/telegram` with a valid `initData`
 * signature (see middlewares/auth.ts). This handler only best-effort mirrors
 * the Telegram identity into `rm_users` so the backend is the source of truth.
 */
export async function processTelegramUpdate(
  update: unknown,
  log: WebhookLog,
): Promise<void> {
  if (!isRecord(update)) return;

  const message = isRecord(update.message) ? update.message : null;
  const chat = message && isRecord(message.chat) ? message.chat : null;
  const chatId = chat?.id;
  const text = typeof message?.text === "string" ? message.text : "";
  if (
    (typeof chatId !== "number" && typeof chatId !== "string") ||
    !text
  ) {
    return;
  }

  const command = getCommand(text);
  if (command !== "/start" && command !== "/help") return;

  const updateId =
    typeof update.update_id === "number" ? update.update_id : undefined;

  // Best-effort: ensure a user record exists for the Telegram identity.
  // Conflict-safe (upsert) so the handler is idempotent. Persists the full
  // Telegram identity (incl. photo, language, premium) so the backend is the
  // source of truth even before the Mini App is opened.
  const from = extractTelegramUser(update);
  if (from && (typeof from.id === "number" || typeof from.id === "string")) {
    try {
      const now = new Date();
      const telegramUserId = String(from.id);
      const username = typeof from.username === "string" ? from.username : null;
      const firstName = typeof from.first_name === "string" ? from.first_name : "Telegram User";
      const lastName = typeof from.last_name === "string" ? from.last_name : null;
      const photoUrl = typeof from.photo_url === "string" ? from.photo_url : null;
      const languageCode = typeof from.language_code === "string" ? from.language_code : null;
      const isPremium = from.is_premium === true ? 1 : 0;
      await db
        .insert(rmUsersTable)
        .values({
          telegramUserId,
          username,
          firstName,
          lastName,
          displayName: firstName,
          photoUrl,
          languageCode,
          isPremium,
          lastLoginAt: now,
        })
        .onConflictDoUpdate({
          target: rmUsersTable.telegramUserId,
          set: {
            username,
            firstName,
            lastName,
            displayName: firstName,
            photoUrl,
            languageCode,
            isPremium,
            lastLoginAt: now,
            updatedAt: now,
          },
        });
    } catch (error) {
      log.warn?.(
        { updateId, error: errMessage(error) },
        "Failed to upsert Telegram user from webhook",
      );
    }
  }

  log.info({ updateId }, `Telegram ${command} received`);
  try {
    await callTelegramApi("sendMessage", buildTelegramStartPayload(chatId));
    log.info({ updateId }, "Telegram welcome sent");
  } catch (error) {
    // A send failure must not break the webhook acknowledgement.
    log.warn?.(
      { updateId, error: errMessage(error) },
      "Failed to send Telegram welcome",
    );
  }
}
