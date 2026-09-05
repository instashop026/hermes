import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  rmMinersTable,
  rmTransactionsTable,
  rmUserMinersTable,
  rmUsersTable,
} from "@workspace/db";
import {
  AuthenticateTelegramBody,
  AuthenticateTelegramResponse,
  ClaimMiningResponse,
  CompleteAdRewardBody,
  CompleteAdRewardResponse,
  CreateAdRewardIntentResponse,
  GetActivityResponse,
  GetMeResponse,
  GetMinerResponse,
  UpgradeMinerBody,
  UpgradeMinerResponse,
} from "@workspace/api-zod";
import {
  calculateMinerState,
  completeAdReward,
  createMiningClaim,
  createRewardIntent,
  ensureMinerConfigs,
  getActivity,
  getMinerState,
  toMinerState,
  toUserProfile,
} from "../lib/rm-coin";
import { ensureSocialRows } from "../lib/social";
import { createSessionCookie, isSecureRequest, requireSession, validateTelegramInitData } from "../middlewares/auth";
import { getUserProfilePhotoUrl } from "../lib/telegram";

/**
 * Run a sequence of statements WITHOUT an explicit BEGIN/COMMIT transaction.
 * The Supabase pooler is pathologically slow at BEGIN/COMMIT (~39s per call
 * from this host), which hung every boot/state-changing POST. The pooler
 * auto-commits each statement; `.for("update")` still guards races.
 */
async function noTx<T>(body: (tx: typeof db) => Promise<T>): Promise<T> {
  return body(db);
}

const router: IRouter = Router();

const upsertUserFromTelegram = async (tx: any, tg: ReturnType<typeof validateTelegramInitData>, photoUrl: string | null) => {
  const now = new Date();
  const [existing] = await tx
    .select()
    .from(rmUsersTable)
    .where(eq(rmUsersTable.telegramUserId, tg.id))
    .limit(1);
  let account = existing;
  if (!account) {
    const [created] = await tx
      .insert(rmUsersTable)
      .values({
        telegramUserId: tg.id,
        username: tg.username,
        firstName: tg.firstName,
        lastName: tg.lastName,
        displayName: tg.firstName,
        photoUrl,
        languageCode: tg.languageCode,
        isPremium: tg.isPremium ? 1 : 0,
        lastLoginAt: now,
      })
      .returning();
    account = created;
  } else {
    const [updated] = await tx
      .update(rmUsersTable)
      .set({
        username: tg.username,
        firstName: tg.firstName,
        lastName: tg.lastName,
        displayName: tg.firstName,
        photoUrl,
        languageCode: tg.languageCode,
        isPremium: tg.isPremium ? 1 : 0,
        lastLoginAt: now,
        updatedAt: now,
      })
      .where(eq(rmUsersTable.id, account.id))
      .returning();
    account = updated;
  }
  if (!account) throw new Error("Unable to create Telegram account");
  await tx
    .insert(rmUserMinersTable)
    .values({ userId: account.id, minerLevel: 1, currentEnergyMinutes: 300 })
    .onConflictDoNothing();
  return account;
};

router.post("/auth/preview", async (req, res): Promise<void> => {
  if (process.env.NODE_ENV === "production") {
    res.status(403).json({ error: "Browser preview authentication is disabled" });
    return;
  }

  try {
    await ensureMinerConfigs();
    const user = await noTx(async (tx) => {
      const existing = await tx
        .select()
        .from(rmUsersTable)
        .where(eq(rmUsersTable.telegramUserId, "preview-browser"))
        .limit(1);
      const now = new Date();
      let account = existing[0];

      if (!account) {
        const [created] = await tx
          .insert(rmUsersTable)
          .values({
            telegramUserId: "preview-browser",
            username: "preview",
            firstName: "Browser Preview",
            lastLoginAt: now,
          })
          .onConflictDoNothing()
          .returning();
        account = created;
      } else {
        const [updated] = await tx
          .update(rmUsersTable)
          .set({ username: "preview", firstName: "Browser Preview", lastLoginAt: now, updatedAt: now })
          .where(eq(rmUsersTable.id, account.id))
          .returning();
        account = updated;
      }

      if (!account) throw new Error("Unable to create browser preview account");
      await tx
        .insert(rmUserMinersTable)
        .values({ userId: account.id, minerLevel: 1, currentEnergyMinutes: 300 })
        .onConflictDoNothing();
      return account;
    });

    await ensureSocialRows(user.id);
    const state = await getMinerState(user.id);
    res.setHeader("Set-Cookie", createSessionCookie(user.id, isSecureRequest(req)));
    res.json(
      AuthenticateTelegramResponse.parse({
        user: toUserProfile(user),
        miner: toMinerState(state),
      }),
    );
  } catch (error) {
    req.log.error(
      { error: error instanceof Error ? error.message : "unknown" },
      "Browser preview authentication failed",
    );
    res.status(500).json({ error: "Browser preview authentication failed" });
  }
});

router.post("/auth/telegram", async (req, res): Promise<void> => {
  const parsed = AuthenticateTelegramBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const telegramUser = validateTelegramInitData(parsed.data.initData);
    await ensureMinerConfigs();
    // Telegram initData does NOT include the profile photo, so resolve it via
    // the Bot API (getUserProfilePhotos -> getFile). Best-effort: null on failure.
    const photoUrl = await getUserProfilePhotoUrl(telegramUser.id);
    const user = await noTx(async (tx) => {
      const account = await upsertUserFromTelegram(tx, telegramUser, photoUrl);
      return account;
    });

    await ensureSocialRows(user.id);
    const state = await getMinerState(user.id);
    res.setHeader("Set-Cookie", createSessionCookie(user.id, isSecureRequest(req)));
    res.json(
      AuthenticateTelegramResponse.parse({
        user: toUserProfile(user),
        miner: toMinerState(state),
      }),
    );
  } catch (error) {
    req.log.warn({ error: error instanceof Error ? error.message : "unknown" }, "Telegram authentication rejected");
    res.status(401).json({ error: error instanceof Error ? error.message : "Telegram authentication failed" });
  }
});

router.get("/me", requireSession, async (req, res): Promise<void> => {
  const [user] = await db
    .select()
    .from(rmUsersTable)
    .where(eq(rmUsersTable.id, req.rmUserId!))
    .limit(1);
  if (!user) {
    res.status(401).json({ error: "Account no longer exists" });
    return;
  }
  res.json(GetMeResponse.parse(toUserProfile(user)));
});

router.get("/miner", requireSession, async (req, res): Promise<void> => {
  const state = await getMinerState(req.rmUserId!);
  res.json(GetMinerResponse.parse(toMinerState(state)));
});

router.post("/miner/claim", requireSession, async (req, res): Promise<void> => {
  const result = await createMiningClaim(req.rmUserId!);
  res.json(
    ClaimMiningResponse.parse({
      claimedAmount: result.claimAmount,
      balance: result.balance,
      miner: toMinerState(result.state),
    }),
  );
});

router.post("/miner/upgrade", requireSession, async (req, res): Promise<void> => {
  const parsed = UpgradeMinerBody.safeParse(req.body);
  if (!parsed.success || !Number.isInteger(parsed.data?.targetLevel)) {
    res.status(400).json({ error: parsed.success ? "targetLevel must be an integer" : parsed.error.message });
    return;
  }
  await ensureMinerConfigs();
  try {
    const result = await noTx(async (tx) => {
      const state = await calculateMinerState(tx, req.rmUserId!);
      if (parsed.data.targetLevel !== state.config.level + 1) {
        throw new Error("Only the next miner level can be installed");
      }
      const [target] = await tx
        .select()
        .from(rmMinersTable)
        .where(eq(rmMinersTable.level, parsed.data.targetLevel))
        .limit(1);
      if (!target) throw new Error("Upgrade blueprint not found");
      if (state.user.balance < target.upgradeCost) {
        throw new Error("Insufficient RM Coin balance");
      }
      const now = new Date();
      const nextBalance = state.user.balance - target.upgradeCost;
      await tx
        .update(rmUsersTable)
        .set({ balance: nextBalance, updatedAt: now })
        .where(eq(rmUsersTable.id, req.rmUserId!));
      await tx
        .update(rmUserMinersTable)
        .set({ minerLevel: target.level, updatedAt: now, lastMiningUpdate: now })
        .where(eq(rmUserMinersTable.id, state.userMiner.id));
      await tx.insert(rmTransactionsTable).values({
        userId: req.rmUserId!,
        type: "MINER_UPGRADE",
        amount: -target.upgradeCost,
        referenceId: target.id,
      });
      const finalState = await calculateMinerState(tx, req.rmUserId!, now);
      return { balance: nextBalance, state: finalState };
    });
    res.json(
      UpgradeMinerResponse.parse({
        balance: result.balance,
        miner: toMinerState(result.state),
      }),
    );
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Upgrade failed" });
  }
});

router.post("/ads/reward-intent", requireSession, async (req, res): Promise<void> => {
  const intent = await createRewardIntent(req.rmUserId!);
  res.json(
    CreateAdRewardIntentResponse.parse({
      intentId: intent.id,
      rewardMinutes: intent.rewardMinutes,
      provider: "monetag",
      expiresAt: intent.expiresAt,
    }),
  );
});

router.post("/ads/reward", requireSession, async (req, res): Promise<void> => {
  const parsed = CompleteAdRewardBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const result = await completeAdReward(req.rmUserId!, parsed.data.intentId);
    res.json(
      CompleteAdRewardResponse.parse({
        rewardMinutes: result.rewardMinutes,
        rewardLp: result.rewardLp,
        miner: toMinerState(result.state),
      }),
    );
  } catch (error) {
    res.status(409).json({ error: error instanceof Error ? error.message : "Reward could not be applied" });
  }
});

router.get("/activity", requireSession, async (req, res): Promise<void> => {
  res.json(GetActivityResponse.parse(await getActivity(req.rmUserId!)));
});

export default router;