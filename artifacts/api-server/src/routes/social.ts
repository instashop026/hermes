import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import {
  db,
  rmFollowedStylesTable,
  rmFollowsTable,
  rmOwnershipTable,
  rmPostInteractionsTable,
  rmPostViewsTable,
  rmRevealsTable,
  rmSocialMetaTable,
  rmSocialStateTable,
  rmTransactionsTable,
  rmUsersTable,
} from "@workspace/db";
import {
  ADS_PER_EARNED_SPIN,
  ModelCatalogEntry,
  ShopCatalogEntry,
  WHEEL_PRIZES,
  getModelCatalog,
  getModelEntry,
  getShopCatalog,
  revealLpPerTap,
  AD_REWARD_LP,
} from "../lib/catalog";
import { getSocialAggregate, ensureSocialRows, revealModelWithTicket, unlockPostWithShotTicket } from "../lib/social";
import { requireSession } from "../middlewares/auth";

/**
 * Run a sequence of statements WITHOUT an explicit BEGIN/COMMIT transaction.
 *
 * Supabase's pooler (both transaction- and session-mode, from this host) is
 * pathologically slow at BEGIN/COMMIT — a single db.transaction() insert took
 * ~39s and hung every state-changing POST. The pooler auto-commits each
 * statement, so we just run them sequentially on `db`. The `.for("update")`
 * row-lock still guards read-then-write races for these single-user flows.
 */
const DAY_MS = 24 * 60 * 60 * 1000;
async function noTx<T>(body: (tx: typeof db) => Promise<T>): Promise<T> {
  return body(db);
}

const router: IRouter = Router();


/** GET the full social/gameplay aggregate. */
router.get("/social", requireSession, async (req, res): Promise<void> => {
  try {
    const data = await getSocialAggregate(req.rmUserId!);
    res.json({ data });
  } catch (error) {
    req.log.error(
      { error: error instanceof Error ? error.message : "unknown" },
      "Failed to load social profile",
    );
    res.status(500).json({ error: "Failed to load social profile" });
  }
});

/** POST /social/reveal/tap — server-authoritative curtain tap (spends LP). */
router.post("/social/reveal/tap", requireSession, async (req, res): Promise<void> => {
  const modelId = typeof req.body?.modelId === "string" ? req.body.modelId : "";
  const catalog = await getModelEntry(modelId);
  if (!catalog) {
    res.status(400).json({ error: "Unknown model" });
    return;
  }
  try {
    const data = await noTx(async (tx) => {
      const [user] = await tx
        .select({ lp: rmUsersTable.lpBalance })
        .from(rmUsersTable)
        .where(eq(rmUsersTable.id, req.rmUserId!))
        .for("update");
      if (!user) throw new Error("Account not found");

      const [reveal] = await tx
        .select()
        .from(rmRevealsTable)
        .where(and(eq(rmRevealsTable.userId, req.rmUserId!), eq(rmRevealsTable.modelId, modelId)))
        .for("update");

      const panels = reveal?.panelsRevealed ?? 0;
      if (panels >= 5) throw new Error("Model already fully revealed");
      const cost = revealLpPerTap(catalog);
      if (user.lp < cost) throw new Error("Not enough LP");

      const nextPanels = panels + 1;
      const unlocked = nextPanels >= 5 ? 1 : 0;
      const now = new Date();
      await tx
        .insert(rmRevealsTable)
        .values({ userId: req.rmUserId!, modelId, panelsRevealed: nextPanels, unlocked })
        .onConflictDoUpdate({
          target: [rmRevealsTable.userId, rmRevealsTable.modelId],
          set: { panelsRevealed: nextPanels, unlocked, updatedAt: now },
        });
      await tx
        .update(rmUsersTable)
        .set({ lpBalance: user.lp - cost, updatedAt: now })
        .where(eq(rmUsersTable.id, req.rmUserId!));
      return getSocialAggregate(req.rmUserId!);
    });
    res.json({ data });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Reveal failed" });
  }
});

/** POST /social/reveal/unlock — instant RM unlock (validated, atomic). */
router.post("/social/reveal/unlock", requireSession, async (req, res): Promise<void> => {
  const modelId = typeof req.body?.modelId === "string" ? req.body.modelId : "";
  const catalog = await getModelEntry(modelId);
  if (!catalog) {
    res.status(400).json({ error: "Unknown model" });
    return;
  }
  try {
    const data = await noTx(async (tx) => {
      const [user] = await tx
        .select({ rm: rmUsersTable.balance, lp: rmUsersTable.lpBalance })
        .from(rmUsersTable)
        .where(eq(rmUsersTable.id, req.rmUserId!))
        .for("update");
      if (!user) throw new Error("Account not found");

      const [reveal] = await tx
        .select()
        .from(rmRevealsTable)
        .where(and(eq(rmRevealsTable.userId, req.rmUserId!), eq(rmRevealsTable.modelId, modelId)))
        .for("update");
      if (reveal?.unlocked) throw new Error("Model already unlocked");

      const cost = catalog.rmCost;
      if (user.rm < cost) throw new Error("Not enough RM Coin");
      const now = new Date();
      await tx
        .insert(rmRevealsTable)
        .values({ userId: req.rmUserId!, modelId, panelsRevealed: 5, unlocked: 1 })
        .onConflictDoUpdate({
          target: [rmRevealsTable.userId, rmRevealsTable.modelId],
          set: { panelsRevealed: 5, unlocked: 1, updatedAt: now },
        });
      await tx
        .update(rmUsersTable)
        .set({ balance: user.rm - cost, updatedAt: now })
        .where(eq(rmUsersTable.id, req.rmUserId!));
      await tx.insert(rmTransactionsTable).values({
        userId: req.rmUserId!,
        type: "REVEAL_UNLOCK",
        amount: -cost,
        referenceId: modelId,
      });
      return getSocialAggregate(req.rmUserId!);
    });
    res.json({ data });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Unlock failed" });
  }
});

/** POST /social/follow — toggle a model follow. */
router.post("/social/follow", requireSession, async (req, res): Promise<void> => {
  const modelId = typeof req.body?.modelId === "string" ? req.body.modelId : "";
  if (!modelId) {
    res.status(400).json({ error: "modelId required" });
    return;
  }
  try {
    await noTx(async (tx) => {
      const [existing] = await tx
        .select()
        .from(rmFollowsTable)
        .where(and(eq(rmFollowsTable.userId, req.rmUserId!), eq(rmFollowsTable.modelId, modelId)))
        .limit(1);
      if (existing) {
        await tx.delete(rmFollowsTable).where(eq(rmFollowsTable.id, existing.id));
      } else {
        await tx.insert(rmFollowsTable).values({ userId: req.rmUserId!, modelId });
      }
    });
    res.json({ data: await getSocialAggregate(req.rmUserId!) });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Follow failed" });
  }
});

/** POST /social/post — toggle like / save / hot (boolean flags). */
router.post("/social/post", requireSession, async (req, res): Promise<void> => {
  const postId = typeof req.body?.postId === "string" ? req.body.postId : "";
  const flag = typeof req.body?.flag === "string" ? req.body.flag : "";
  const value = req.body?.value === true;
  if (!postId || !["liked", "saved", "hot"].includes(flag)) {
    res.status(400).json({ error: "postId and flag(liked|saved|hot) required" });
    return;
  }
  try {
    await noTx(async (tx) => {
      const column = flag as "liked" | "saved" | "hot";
      const [existing] = await tx
        .select()
        .from(rmPostInteractionsTable)
        .where(and(eq(rmPostInteractionsTable.userId, req.rmUserId!), eq(rmPostInteractionsTable.postId, postId)))
        .limit(1);
      const now = new Date();
      if (existing) {
        await tx
          .update(rmPostInteractionsTable)
          .set({ [column]: value ? 1 : 0, updatedAt: now })
          .where(eq(rmPostInteractionsTable.id, existing.id));
      } else {
        await tx.insert(rmPostInteractionsTable).values({
          userId: req.rmUserId!,
          postId,
          [column]: value ? 1 : 0,
        });
      }
    });
    res.json({ data: await getSocialAggregate(req.rmUserId!) });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Post update failed" });
  }
});

/** POST /social/view — increment a post's view count (atomic). */
router.post("/social/view", requireSession, async (req, res): Promise<void> => {
  const postId = typeof req.body?.postId === "string" ? req.body.postId : "";
  if (!postId) {
    res.status(400).json({ error: "postId required" });
    return;
  }
  try {
    await noTx(async (tx) => {
      const [existing] = await tx
        .select()
        .from(rmPostViewsTable)
        .where(and(eq(rmPostViewsTable.userId, req.rmUserId!), eq(rmPostViewsTable.postId, postId)))
        .for("update")
        .limit(1);
      const now = new Date();
      if (existing) {
        await tx
          .update(rmPostViewsTable)
          .set({ viewCount: existing.viewCount + 1, updatedAt: now })
          .where(eq(rmPostViewsTable.id, existing.id));
      } else {
        await tx.insert(rmPostViewsTable).values({ userId: req.rmUserId!, postId, viewCount: 1 });
      }
    });
    res.json({ data: await getSocialAggregate(req.rmUserId!) });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "View failed" });
  }
});

/** POST /social/follow-style — toggle a style follow. */
router.post("/social/follow-style", requireSession, async (req, res): Promise<void> => {
  const styleId = typeof req.body?.styleId === "string" ? req.body.styleId : "";
  if (!styleId) {
    res.status(400).json({ error: "styleId required" });
    return;
  }
  try {
    await noTx(async (tx) => {
      const [existing] = await tx
        .select()
        .from(rmFollowedStylesTable)
        .where(and(eq(rmFollowedStylesTable.userId, req.rmUserId!), eq(rmFollowedStylesTable.styleId, styleId)))
        .limit(1);
      if (existing) {
        await tx.delete(rmFollowedStylesTable).where(eq(rmFollowedStylesTable.id, existing.id));
      } else {
        await tx.insert(rmFollowedStylesTable).values({ userId: req.rmUserId!, styleId });
      }
    });
    res.json({ data: await getSocialAggregate(req.rmUserId!) });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Style follow failed" });
  }
});

/** POST /social/mute — toggle global video mute. */
router.post("/social/mute", requireSession, async (req, res): Promise<void> => {
  const value = req.body?.value === true;
  try {
    await db
      .insert(rmSocialMetaTable)
      .values({ userId: req.rmUserId!, muted: value ? 1 : 0 })
      .onConflictDoUpdate({ target: rmSocialMetaTable.userId, set: { muted: value ? 1 : 0, updatedAt: new Date() } });
    res.json({ data: await getSocialAggregate(req.rmUserId!) });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Mute failed" });
  }
});

/** POST /social/wheel/spin — SERVER picks the prize; validates spin availability. */
router.post("/social/wheel/spin", requireSession, async (req, res): Promise<void> => {
  try {
    const data = await noTx(async (tx) => {
      const [state] = await tx
        .select()
        .from(rmSocialStateTable)
        .where(eq(rmSocialStateTable.userId, req.rmUserId!))
        .for("update");
      if (!state) throw new Error("Social state missing");

      const now = new Date();
      const dailyReady =
        !state.lastWheelSpin ||
        now.getTime() - state.lastWheelSpin.getTime() >= DAY_MS;
      const useEarned = !dailyReady && state.earnedSpins > 0;
      if (!dailyReady && !useEarned) throw new Error("No spins available");

      // Server-authoritative prize selection (client never chooses).
      const idx = Math.floor(Math.random() * WHEEL_PRIZES.length);
      const prize = WHEEL_PRIZES[idx];
      const newState = { ...state, lastWheelSpin: now, earnedSpins: state.earnedSpins };

      let userUpd: Partial<{ lpBalance: number; balance: number }> = {};
      if (prize.kind === "rm") {
        const [u] = await tx.select({ balance: rmUsersTable.balance }).from(rmUsersTable).where(eq(rmUsersTable.id, req.rmUserId!));
        userUpd.balance = Math.round((u.balance + prize.value) * 100) / 100;
      } else if (prize.kind === "lp") {
        const [u] = await tx.select({ lp: rmUsersTable.lpBalance }).from(rmUsersTable).where(eq(rmUsersTable.id, req.rmUserId!));
        userUpd.lpBalance = Math.max(0, u.lp + prize.value);
      }
      if (prize.kind === "modelTicket") newState.modelTickets = state.modelTickets + 1;
      else if (prize.kind === "shotTicket") newState.shotTickets = state.shotTickets + 1;
      else if (prize.kind === "mineMinutes") newState.bonusMineMinutes = state.bonusMineMinutes + prize.value;

      if (useEarned) newState.earnedSpins = state.earnedSpins - 1;

      const setCols: Record<string, unknown> = {
        modelTickets: newState.modelTickets,
        shotTickets: newState.shotTickets,
        bonusMineMinutes: newState.bonusMineMinutes,
        lastWheelSpin: newState.lastWheelSpin,
        earnedSpins: newState.earnedSpins,
        updatedAt: now,
      };
      await tx.update(rmSocialStateTable).set(setCols).where(eq(rmSocialStateTable.userId, req.rmUserId!));
      if (userUpd.balance !== undefined) await tx.update(rmUsersTable).set({ balance: userUpd.balance, updatedAt: now }).where(eq(rmUsersTable.id, req.rmUserId!));
      if (userUpd.lpBalance !== undefined) await tx.update(rmUsersTable).set({ lpBalance: userUpd.lpBalance, updatedAt: now }).where(eq(rmUsersTable.id, req.rmUserId!));

      return { prize, data: await getSocialAggregate(req.rmUserId!) };
    });
    res.json(data);
  } catch (error) {
    res.status(409).json({ error: error instanceof Error ? error.message : "Spin failed" });
  }
});

/** POST /social/ads/intent — a rewarded ad was watched: step the earned-spin
 *  counter AND grant LP (server-authoritative, +AD_REWARD_LP). Both are owned
 *  by the backend so the client can never inflate balance. */
router.post("/social/ads/intent", requireSession, async (req, res): Promise<void> => {
  try {
    const data = await noTx(async (tx) => {
      const [state] = await tx
        .select()
        .from(rmSocialStateTable)
        .where(eq(rmSocialStateTable.userId, req.rmUserId!))
        .for("update");
      if (!state) throw new Error("Social state missing");
      const next = state.adsWatchedForSpin + 1;
      let earnedSpins = state.earnedSpins;
      let adsWatchedForSpin = next;
      if (next >= ADS_PER_EARNED_SPIN) {
        earnedSpins = state.earnedSpins + 1;
        adsWatchedForSpin = 0;
      }
      const now = new Date();
      await tx
        .update(rmSocialStateTable)
        .set({ earnedSpins, adsWatchedForSpin, updatedAt: now })
        .where(eq(rmSocialStateTable.userId, req.rmUserId!));

      // Grant LP for the watched ad (mirrors the miner ad reward).
      const [user] = await tx
        .select({ lpBalance: rmUsersTable.lpBalance })
        .from(rmUsersTable)
        .where(eq(rmUsersTable.id, req.rmUserId!));
      const nextLp = (user?.lpBalance ?? 0) + AD_REWARD_LP;
      await tx
        .update(rmUsersTable)
        .set({ lpBalance: nextLp, updatedAt: now })
        .where(eq(rmUsersTable.id, req.rmUserId!));
      await tx.insert(rmTransactionsTable).values({
        userId: req.rmUserId!,
        type: "AD_REWARD_LP",
        amount: AD_REWARD_LP,
        createdAt: now,
      });

      return getSocialAggregate(req.rmUserId!);
    });
    res.json({ data });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Ad reward failed" });
  }
});

/** POST /social/purchase — buy a miner/skin (cost validated server-side). */
router.post("/social/purchase", requireSession, async (req, res): Promise<void> => {
  const itemId = typeof req.body?.itemId === "string" ? req.body.itemId : "";
  const catalog: ShopCatalogEntry | undefined = getShopCatalog(itemId);
  if (!catalog) {
    res.status(400).json({ error: "Unknown item" });
    return;
  }
  try {
    const data = await noTx(async (tx) => {
      const [user] = await tx
        .select({ rm: rmUsersTable.balance })
        .from(rmUsersTable)
        .where(eq(rmUsersTable.id, req.rmUserId!))
        .for("update");
      if (!user) throw new Error("Account not found");

      const [owned] = await tx
        .select()
        .from(rmOwnershipTable)
        .where(and(eq(rmOwnershipTable.userId, req.rmUserId!), eq(rmOwnershipTable.itemId, itemId)))
        .limit(1);
      if (owned) throw new Error("Already owned");

      if (user.rm < catalog.cost) throw new Error("Not enough RM Coin");
      const now = new Date();
      await tx
        .update(rmUsersTable)
        .set({ balance: user.rm - catalog.cost, updatedAt: now })
        .where(eq(rmUsersTable.id, req.rmUserId!));
      await tx
        .insert(rmOwnershipTable)
        .values({ userId: req.rmUserId!, itemId, kind: catalog.kind });
      await tx.insert(rmTransactionsTable).values({
        userId: req.rmUserId!,
        type: "PURCHASE",
        amount: -catalog.cost,
        referenceId: itemId,
      });
      return getSocialAggregate(req.rmUserId!);
    });
    res.json({ data });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Purchase failed" });
  }
});

/** POST /social/equip — equip an owned miner/skin. */
router.post("/social/equip", requireSession, async (req, res): Promise<void> => {
  const itemId = typeof req.body?.itemId === "string" ? req.body.itemId : "";
  const catalog = getShopCatalog(itemId);
  if (!catalog) {
    res.status(400).json({ error: "Unknown item" });
    return;
  }
  try {
    const data = await noTx(async (tx) => {
      const [owned] = await tx
        .select()
        .from(rmOwnershipTable)
        .where(and(eq(rmOwnershipTable.userId, req.rmUserId!), eq(rmOwnershipTable.itemId, itemId)))
        .limit(1);
      if (!owned) throw new Error("Item not owned");
      const now = new Date();
      const set =
        catalog.kind === "miner" ? { equippedMiner: itemId, updatedAt: now } : { equippedSkin: itemId, updatedAt: now };
      await tx
        .update(rmSocialStateTable)
        .set(set)
        .where(eq(rmSocialStateTable.userId, req.rmUserId!));
      return getSocialAggregate(req.rmUserId!);
    });
    res.json({ data });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Equip failed" });
  }
});

/** POST /social/reveal/ticket — consume a model ticket to fully reveal. */
router.post("/social/reveal/ticket", requireSession, async (req, res): Promise<void> => {
  const modelId = typeof req.body?.modelId === "string" ? req.body.modelId : "";
  if (!getModelCatalog(modelId)) {
    res.status(400).json({ error: "Unknown model" });
    return;
  }
  try {
    const data = await revealModelWithTicket(req.rmUserId!, modelId);
    res.json({ data });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Ticket reveal failed" });
  }
});

/** POST /social/tickets/shot — consume a shot ticket to unlock a post. */
router.post("/social/tickets/shot", requireSession, async (req, res): Promise<void> => {
  const modelId = typeof req.body?.modelId === "string" ? req.body.modelId : "";
  const postId = typeof req.body?.postId === "string" ? req.body.postId : "";
  if (!modelId || !postId) {
    res.status(400).json({ error: "modelId and postId required" });
    return;
  }
  try {
    const data = await unlockPostWithShotTicket(req.rmUserId!, modelId, postId);
    res.json({ data });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Shot ticket failed" });
  }
});

export default router;
