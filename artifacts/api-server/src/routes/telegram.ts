import { Router, type IRouter } from "express";
import {
  getTelegramWebhookSecret,
  processTelegramUpdate,
} from "../lib/telegram";

const router: IRouter = Router();

router.post("/telegram/webhook", (req, res): void => {
  let expectedSecret: string;
  try {
    expectedSecret = getTelegramWebhookSecret();
  } catch (error) {
    req.log.error(
      { error: error instanceof Error ? error.message : "unknown" },
      "Telegram webhook is not configured",
    );
    res.status(503).json({ error: "Telegram webhook is not configured" });
    return;
  }

  if (req.get("x-telegram-bot-api-secret-token") !== expectedSecret) {
    req.log.warn("Telegram webhook rejected invalid secret");
    res.status(401).json({ error: "Invalid Telegram webhook secret" });
    return;
  }

  const updateId =
    req.body && typeof req.body.update_id === "number"
      ? req.body.update_id
      : undefined;
  req.log.info({ updateId }, "Telegram webhook received");

  // Acknowledge Telegram immediately. Bot API work must not delay the webhook.
  res.sendStatus(200);

  void processTelegramUpdate(req.body, req.log).catch((error: unknown) => {
    req.log.error(
      { updateId, error: error instanceof Error ? error.message : "unknown" },
      "Telegram update processing failed",
    );
  });
});

export default router;