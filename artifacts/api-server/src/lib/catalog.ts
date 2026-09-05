/**
 * Server-authoritative catalogue of game content + economics.
 *
 * This is the SINGLE SOURCE OF TRUTH for every cost, prize and reward. The
 * client may render prices, but the server never trusts a client-supplied
 * value — every mutation validates its inputs against this catalogue.
 *
 * Values are mirrored from the client's static content (MODEL_PROFILES,
 * MINERS, SKINS) but belong to the server because they gate real state
 * changes. Keep them in sync with `artifacts/rm-coin/src/lib/social-data.ts`.
 */

import { eq } from "drizzle-orm";
import { db, rmModelsTable } from "@workspace/db";

export const REVEAL_PANELS = 5;

/** Per-model reveal economics. keyed by model id. */
export type ModelCatalogEntry = {
  id: string;
  revealCostLp: number;
  rmCost: number;
};

export const MODEL_CATALOG: Record<string, ModelCatalogEntry> = {
  "mara-vale": { id: "mara-vale", revealCostLp: 30, rmCost: 2.5 },
  "noor-kai": { id: "noor-kai", revealCostLp: 42, rmCost: 3 },
  "ivy-sato": { id: "ivy-sato", revealCostLp: 35, rmCost: 2.5 },
  "celeste-rowan": { id: "celeste-rowan", revealCostLp: 32, rmCost: 2 },
  "sora-milan": { id: "sora-milan", revealCostLp: 48, rmCost: 3.5 },
  "juno-ardent": { id: "juno-ardent", revealCostLp: 38, rmCost: 2.5 },
  "rhea-sol": { id: "rhea-sol", revealCostLp: 36, rmCost: 2.5 },
  "elara-west": { id: "elara-west", revealCostLp: 40, rmCost: 3 },
};

export const getModelCatalog = (modelId: string): ModelCatalogEntry | undefined =>
  MODEL_CATALOG[modelId];

/**
 * Like getModelCatalog but also recognizes admin-created models stored in the
 * rm_models table (slug === modelId). Must be awaited. Static models win; if
 * not found statically we look the slug up in the DB so reveals/unlocks/tickets
 * work for admin-panel models too.
 */
export async function getModelEntry(modelId: string): Promise<ModelCatalogEntry | undefined> {
  const staticEntry = MODEL_CATALOG[modelId];
  if (staticEntry) return staticEntry;
  try {
    const rows = await db
      .select({
        slug: rmModelsTable.slug,
        revealCostLp: rmModelsTable.revealCostLp,
        rmCost: rmModelsTable.rmCost,
      })
      .from(rmModelsTable)
      .where(eq(rmModelsTable.slug, modelId))
      .limit(1);
    if (rows[0]) {
      return { id: rows[0].slug, revealCostLp: rows[0].revealCostLp, rmCost: rows[0].rmCost };
    }
  } catch {
    // DB unavailable — fall through to undefined.
  }
  return undefined;
}

/** LP spent per curtain tap (rounded up so total reaches revealCostLp). */
export const revealLpPerTap = (entry: ModelCatalogEntry): number =>
  Math.ceil(entry.revealCostLp / REVEAL_PANELS);

/** Market shop items (miners + skins). keyed by item id. */
export type ShopCatalogEntry = {
  id: string;
  kind: "miner" | "skin";
  name: string;
  cost: number;
};

export const SHOP_CATALOG: Record<string, ShopCatalogEntry> = {
  "rig-mk1": { id: "rig-mk1", kind: "miner", name: "Signal Drill", cost: 0 },
  "rig-mk2": { id: "rig-mk2", kind: "miner", name: "Pulse Forge", cost: 120 },
  "rig-mk3": { id: "rig-mk3", kind: "miner", name: "Aurora Core", cost: 480 },
  "rig-mk4": { id: "rig-mk4", kind: "miner", name: "Nova Engine", cost: 1500 },
  "skin-aurora": { id: "skin-aurora", kind: "skin", name: "Aurora", cost: 60 },
  "skin-ember": { id: "skin-ember", kind: "skin", name: "Ember", cost: 60 },
  "skin-nebula": { id: "skin-nebula", kind: "skin", name: "Nebula", cost: 240 },
  "skin-solar": { id: "skin-solar", kind: "skin", name: "Solar Flare", cost: 900 },
};

export const getShopCatalog = (itemId: string): ShopCatalogEntry | undefined =>
  SHOP_CATALOG[itemId];

/** Prize wheel slices. The SERVER picks the index; the client only renders. */
export type WheelPrize = {
  key: string;
  label: string;
  kind: "rm" | "lp" | "modelTicket" | "shotTicket" | "mineMinutes";
  value: number;
};

export const WHEEL_PRIZES: WheelPrize[] = [
  { key: "rm-02", label: "0.2 RM", kind: "rm", value: 0.2 },
  { key: "lp-05", label: "5 LP", kind: "lp", value: 5 },
  { key: "model", label: "Model Ticket", kind: "modelTicket", value: 1 },
  { key: "time-5", label: "+5m Mine", kind: "mineMinutes", value: 5 },
  { key: "rm-05", label: "0.5 RM", kind: "rm", value: 0.5 },
  { key: "lp-12", label: "12 LP", kind: "lp", value: 12 },
  { key: "shot", label: "Shot Ticket", kind: "shotTicket", value: 1 },
  { key: "time-15", label: "+15m Mine", kind: "mineMinutes", value: 15 },
];

/** Earned-spin cadence: every N watched ads grants one spin. */
export const ADS_PER_EARNED_SPIN = 10;

/** LP credited to the user when a rewarded ad completes (server-authoritative). */
export const AD_REWARD_LP = 5;

/** New-user starter model set (5 random from the catalogue, assigned once). */
export const STARTER_MODEL_IDS: string[] = Object.keys(MODEL_CATALOG);

/** Free starter miner every new user owns. */
export const DEFAULT_OWNED_MINER = "rig-mk1";
