import { and, asc, desc, eq, gt } from "drizzle-orm";
import { db, rmAdRewardsTable, rmMinersTable, rmTransactionsTable, rmUserMinersTable, rmUsersTable } from "@workspace/db";
import type { RmUser, RmUserMiner } from "@workspace/db";
import { AD_REWARD_LP } from "./catalog";

export const AD_REWARD_MINUTES = 20;
export const AD_INTENT_TTL_MS = 5 * 60 * 1000;

export const DEFAULT_MINERS = [
  { level: 1, name: "Signal Drill", miningRate: 1, maxEnergyMinutes: 300, upgradeCost: 0 },
  { level: 2, name: "Pulse Extractor", miningRate: 2, maxEnergyMinutes: 480, upgradeCost: 50 },
  { level: 3, name: "Nova Harvester", miningRate: 4, maxEnergyMinutes: 720, upgradeCost: 180 },
  { level: 4, name: "Quasar Forge", miningRate: 8, maxEnergyMinutes: 1080, upgradeCost: 540 },
];

type Executor = any;

export async function ensureMinerConfigs(): Promise<void> {
  await db.insert(rmMinersTable).values(DEFAULT_MINERS).onConflictDoNothing();
}

export async function calculateMinerState(
  executor: Executor,
  userId: string,
  now = new Date(),
): Promise<{
  user: RmUser;
  userMiner: RmUserMiner;
  config: (typeof DEFAULT_MINERS)[number];
  nextUpgrade: (typeof DEFAULT_MINERS)[number] | null;
}> {
  const [user] = await executor
    .select()
    .from(rmUsersTable)
    .where(eq(rmUsersTable.id, userId))
    .limit(1);
  const [userMiner] = await executor
    .select()
    .from(rmUserMinersTable)
    .where(eq(rmUserMinersTable.userId, userId))
    .for("update");

  if (!user || !userMiner) {
    throw new Error("Mining account is not initialized");
  }

  const [config] = await executor
    .select()
    .from(rmMinersTable)
    .where(eq(rmMinersTable.level, userMiner.minerLevel))
    .limit(1);
  if (!config) {
    throw new Error("Miner configuration is missing");
  }

  const elapsedMinutes = Math.max(
    0,
    (now.getTime() - userMiner.lastMiningUpdate.getTime()) / 60_000,
  );
  const consumedMinutes = Math.min(userMiner.currentEnergyMinutes, elapsedMinutes);
  const minedAmount =
    userMiner.unclaimedMinedAmount + (consumedMinutes * config.miningRate) / 60;
  const remainingEnergy = Math.max(0, userMiner.currentEnergyMinutes - consumedMinutes);

  const [updatedMiner] = await executor
    .update(rmUserMinersTable)
    .set({
      currentEnergyMinutes: remainingEnergy,
      unclaimedMinedAmount: minedAmount,
      lastMiningUpdate: now,
      updatedAt: now,
    })
    .where(eq(rmUserMinersTable.id, userMiner.id))
    .returning();

  const [nextUpgrade] = await executor
    .select()
    .from(rmMinersTable)
    .where(gt(rmMinersTable.level, config.level))
    .orderBy(asc(rmMinersTable.level))
    .limit(1);

  return {
    user,
    userMiner: updatedMiner,
    config,
    nextUpgrade: nextUpgrade ?? null,
  };
}

export async function getMinerState(userId: string) {
  await ensureMinerConfigs();
  return db.transaction((tx) => calculateMinerState(tx, userId));
}

export function toUserProfile(user: RmUser) {
  return {
    id: user.id,
    telegramUserId: user.telegramUserId,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    displayName: user.displayName,
    photoUrl: user.photoUrl,
    languageCode: user.languageCode,
    isPremium: user.isPremium === 1,
    balance: user.balance,
    createdAt: user.createdAt,
  };
}

export function toMinerState(state: Awaited<ReturnType<typeof calculateMinerState>>) {
  return {
    level: state.config.level,
    name: state.config.name,
    miningRate: state.config.miningRate,
    maxEnergyMinutes: state.config.maxEnergyMinutes,
    currentEnergyMinutes: state.userMiner.currentEnergyMinutes,
    minedAmount: state.userMiner.unclaimedMinedAmount,
    balance: state.user.balance,
    isMining: state.userMiner.currentEnergyMinutes > 0,
    lastUpdatedAt: state.userMiner.lastMiningUpdate,
    nextUpgrade: state.nextUpgrade
      ? {
          level: state.nextUpgrade.level,
          name: state.nextUpgrade.name,
          miningRate: state.nextUpgrade.miningRate,
          maxEnergyMinutes: state.nextUpgrade.maxEnergyMinutes,
          upgradeCost: state.nextUpgrade.upgradeCost,
        }
      : null,
  };
}

export async function createMiningClaim(userId: string) {
  await ensureMinerConfigs();
  return db.transaction(async (tx) => {
    const state = await calculateMinerState(tx, userId);
    const claimAmount = Math.max(0, state.userMiner.unclaimedMinedAmount);
    const nextBalance = state.user.balance + claimAmount;
    const now = new Date();

    await tx
      .update(rmUserMinersTable)
      .set({ unclaimedMinedAmount: 0, updatedAt: now })
      .where(eq(rmUserMinersTable.id, state.userMiner.id));
    await tx
      .update(rmUsersTable)
      .set({ balance: nextBalance, updatedAt: now })
      .where(eq(rmUsersTable.id, userId));
    if (claimAmount > 0) {
      await tx.insert(rmTransactionsTable).values({
        userId,
        type: "MINING_CLAIM",
        amount: claimAmount,
      });
    }

    const finalState = await calculateMinerState(tx, userId, now);
    return { claimAmount, balance: nextBalance, state: finalState };
  });
}

export async function completeAdReward(userId: string, intentId: string) {
  await ensureMinerConfigs();
  return db.transaction(async (tx) => {
    const now = new Date();
    const [intent] = await tx
      .select()
      .from(rmAdRewardsTable)
      .where(and(eq(rmAdRewardsTable.id, intentId), eq(rmAdRewardsTable.userId, userId)))
      .for("update");

    if (!intent || intent.provider !== "monetag" || intent.status !== "issued") {
      throw new Error("Reward intent is invalid or already used");
    }
    if (intent.expiresAt.getTime() < now.getTime()) {
      throw new Error("Reward intent has expired");
    }

    // LP is the primary ad reward (server-authoritative). Energy minutes are a
    // secondary bonus credited to the active miner.
    const [user] = await tx
      .select({ lpBalance: rmUsersTable.lpBalance })
      .from(rmUsersTable)
      .where(eq(rmUsersTable.id, userId))
      .limit(1);
    const nextLp = user.lpBalance + AD_REWARD_LP;

    const state = await calculateMinerState(tx, userId, now);
    const energy = Math.min(
      state.config.maxEnergyMinutes,
      state.userMiner.currentEnergyMinutes + intent.rewardMinutes,
    );
    await tx
      .update(rmUserMinersTable)
      .set({ currentEnergyMinutes: energy, updatedAt: now })
      .where(eq(rmUserMinersTable.id, state.userMiner.id));
    await tx
      .update(rmUsersTable)
      .set({ lpBalance: nextLp, updatedAt: now })
      .where(eq(rmUsersTable.id, userId));
    await tx
      .update(rmAdRewardsTable)
      .set({ status: "completed", completedAt: now })
      .where(eq(rmAdRewardsTable.id, intent.id));
    await tx.insert(rmTransactionsTable).values([
      {
        userId,
        type: "AD_REWARD_LP",
        amount: AD_REWARD_LP,
        referenceId: intent.id,
      },
      {
        userId,
        type: "AD_REWARD",
        amount: intent.rewardMinutes,
        referenceId: intent.id,
      },
    ]);

    const finalState = await calculateMinerState(tx, userId, now);
    return { rewardMinutes: intent.rewardMinutes, rewardLp: AD_REWARD_LP, state: finalState };
  });
}

export async function createRewardIntent(userId: string) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + AD_INTENT_TTL_MS);
  const [intent] = await db
    .insert(rmAdRewardsTable)
    .values({
      userId,
      provider: "monetag",
      externalRewardId: crypto.randomUUID(),
      rewardMinutes: AD_REWARD_MINUTES,
      status: "issued",
      expiresAt,
    })
    .returning();
  return intent;
}

export async function getActivity(userId: string) {
  const rows = await db
    .select()
    .from(rmTransactionsTable)
    .where(eq(rmTransactionsTable.userId, userId))
    .orderBy(desc(rmTransactionsTable.createdAt))
    .limit(20);
  return rows.map((row) => ({
    id: row.id,
    type: row.type as "MINING_CLAIM" | "AD_REWARD" | "AD_REWARD_LP" | "MINER_UPGRADE" | "PURCHASE" | "REVEAL_UNLOCK",
    amount: row.amount,
    label:
      row.type === "AD_REWARD"
        ? "Monetag recharge completed"
        : row.type === "AD_REWARD_LP"
          ? "LP recharged from ad"
          : row.type === "MINER_UPGRADE"
            ? "Miner blueprint installed"
            : row.type === "REVEAL_UNLOCK"
              ? "Model revealed with RM Coin"
              : row.type === "PURCHASE"
                ? "Item purchased"
                : "RM Coin extracted",
    createdAt: row.createdAt,
  }));
}