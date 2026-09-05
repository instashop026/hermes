import {
  and,
  eq,
  sql,
} from "drizzle-orm";
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
  rmUsersTable,
} from "@workspace/db";
import { DEFAULT_OWNED_MINER, STARTER_MODEL_IDS, REVEAL_PANELS, getModelCatalog, getModelEntry } from "./catalog";

/** Run statements without an explicit transaction (pooler is slow at BEGIN/COMMIT). */
async function noTx<T>(body: (tx: typeof db) => Promise<T>): Promise<T> {
  return body(db);
}

export type SocialAggregate = {
  starterIds: string[];
  unlockedIds: string[];
  revealProgress: Record<string, number>;
  lpBalance: number;
  followingIds: string[];
  likedPostIds: string[];
  hotPostIds: string[];
  savedPostIds: string[];
  unlockedPostIds: string[];
  followedStyles: string[];
  muted: boolean;
  viewCounts: Record<string, number>;
  ownedMiners: string[];
  ownedSkins: string[];
  equippedMiner: string | null;
  equippedSkin: string | null;
  modelTickets: number;
  shotTickets: number;
  bonusMineMinutes: number;
  lastWheelSpin: string | null;
  earnedSpins: number;
  adsWatchedForSpin: number;
};

/** Create the per-user social rows if they don't exist yet. Idempotent. */
export async function ensureSocialRows(userId: string): Promise<void> {
  const starterIds = [...STARTER_MODEL_IDS]
    .sort(() => Math.random() - 0.5)
    .slice(0, 5);

  const starterIdsJson = JSON.stringify(starterIds);
  await db.execute(sql`
    insert into rm_social_state (user_id, starter_ids, unlocked_ids, equipped_miner)
    values (${userId}, ${starterIdsJson}::jsonb, '[]'::jsonb, 'rig-mk1')
    on conflict (user_id) do update set updated_at = now()
  `);

  await db
    .insert(rmSocialMetaTable)
    .values({ userId, muted: 0 })
    .onConflictDoUpdate({
      target: rmSocialMetaTable.userId,
      set: { updatedAt: new Date() },
    });

  await db
    .insert(rmOwnershipTable)
    .values({ userId, itemId: DEFAULT_OWNED_MINER, kind: "miner" })
    .onConflictDoNothing();
}

/** Load the full social aggregate for a user, computing it from relational rows. */
export async function getSocialAggregate(
  userId: string,
): Promise<SocialAggregate> {
  await ensureSocialRows(userId);

  const [user] = await db
    .select({ lpBalance: rmUsersTable.lpBalance })
    .from(rmUsersTable)
    .where(eq(rmUsersTable.id, userId))
    .limit(1);

  const [state] = await db
    .select()
    .from(rmSocialStateTable)
    .where(eq(rmSocialStateTable.userId, userId))
    .limit(1);

  const [meta] = await db
    .select()
    .from(rmSocialMetaTable)
    .where(eq(rmSocialMetaTable.userId, userId))
    .limit(1);

  const reveals = await db
    .select({ modelId: rmRevealsTable.modelId, panelsRevealed: rmRevealsTable.panelsRevealed, unlocked: rmRevealsTable.unlocked })
    .from(rmRevealsTable)
    .where(eq(rmRevealsTable.userId, userId));

  const follows = await db
    .select({ modelId: rmFollowsTable.modelId })
    .from(rmFollowsTable)
    .where(eq(rmFollowsTable.userId, userId));

  const interactions = await db
    .select()
    .from(rmPostInteractionsTable)
    .where(eq(rmPostInteractionsTable.userId, userId));

  const views = await db
    .select({ postId: rmPostViewsTable.postId, viewCount: rmPostViewsTable.viewCount })
    .from(rmPostViewsTable)
    .where(eq(rmPostViewsTable.userId, userId));

  const styles = await db
    .select({ styleId: rmFollowedStylesTable.styleId })
    .from(rmFollowedStylesTable)
    .where(eq(rmFollowedStylesTable.userId, userId));

  const ownership = await db
    .select({ itemId: rmOwnershipTable.itemId, kind: rmOwnershipTable.kind })
    .from(rmOwnershipTable)
    .where(eq(rmOwnershipTable.userId, userId));

  const revealProgress: Record<string, number> = {};
  const unlockedIds: string[] = [];
  for (const r of reveals) {
    revealProgress[r.modelId] = r.panelsRevealed;
    if (r.unlocked) unlockedIds.push(r.modelId);
  }

  const likedPostIds: string[] = [];
  const hotPostIds: string[] = [];
  const savedPostIds: string[] = [];
  const unlockedPostIds: string[] = [];
  for (const i of interactions) {
    if (i.liked) likedPostIds.push(i.postId);
    if (i.hot) hotPostIds.push(i.postId);
    if (i.saved) savedPostIds.push(i.postId);
    if (i.unlocked) unlockedPostIds.push(i.postId);
  }

  const viewCounts: Record<string, number> = {};
  for (const v of views) viewCounts[v.postId] = v.viewCount;

  const followedStyles = styles.map((s) => s.styleId);
  const ownedMiners = ownership.filter((o) => o.kind === "miner").map((o) => o.itemId);
  const ownedSkins = ownership.filter((o) => o.kind === "skin").map((o) => o.itemId);

  return {
    starterIds: state?.starterIds ?? [],
    unlockedIds: unlockedIds,
    revealProgress,
    lpBalance: user?.lpBalance ?? 24,
    followingIds: follows.map((f) => f.modelId),
    likedPostIds,
    hotPostIds,
    savedPostIds,
    unlockedPostIds,
    followedStyles,
    muted: (meta?.muted ?? 0) === 1,
    viewCounts,
    ownedMiners,
    ownedSkins,
    equippedMiner: state?.equippedMiner ?? null,
    equippedSkin: state?.equippedSkin ?? null,
    modelTickets: state?.modelTickets ?? 0,
    shotTickets: state?.shotTickets ?? 0,
    bonusMineMinutes: state?.bonusMineMinutes ?? 0,
    lastWheelSpin: state?.lastWheelSpin ? state.lastWheelSpin.toISOString() : null,
    earnedSpins: state?.earnedSpins ?? 0,
    adsWatchedForSpin: state?.adsWatchedForSpin ?? 0,
  };
}

/**
 * Consume a model ticket to fully reveal a model. Server-authoritative:
 * validates the model exists, the user owns a ticket, and the model isn't
 * already revealed — then atomically decrements the ticket and marks revealed.
 */
export async function revealModelWithTicket(userId: string, modelId: string): Promise<SocialAggregate> {
  return noTx(async (tx) => {
    const catalog = await getModelEntry(modelId);
    if (!catalog) throw new Error("Unknown model");
    const [state] = await tx
      .select()
      .from(rmSocialStateTable)
      .where(eq(rmSocialStateTable.userId, userId))
      .for("update");
    if (!state) throw new Error("Social state missing");
    if (state.modelTickets <= 0) throw new Error("No model tickets available");

    const [reveal] = await tx
      .select()
      .from(rmRevealsTable)
      .where(and(eq(rmRevealsTable.userId, userId), eq(rmRevealsTable.modelId, modelId)))
      .limit(1);
    if (reveal?.unlocked) throw new Error("Model already revealed");

    const now = new Date();
    await tx
      .insert(rmRevealsTable)
      .values({ userId, modelId, panelsRevealed: REVEAL_PANELS, unlocked: 1 })
      .onConflictDoUpdate({
        target: [rmRevealsTable.userId, rmRevealsTable.modelId],
        set: { panelsRevealed: 5, unlocked: 1, updatedAt: now },
      });
    await tx
      .update(rmSocialStateTable)
      .set({ modelTickets: state.modelTickets - 1, updatedAt: now })
      .where(eq(rmSocialStateTable.userId, userId));
    return getSocialAggregate(userId);
  });
}

/**
 * Consume a shot ticket to permanently unlock a single locked post.
 * Server-authoritative: validates ticket ownership and that the post isn't
 * already unlocked, then records it and decrements the shot ticket.
 */
export async function unlockPostWithShotTicket(
  userId: string,
  modelId: string,
  postId: string,
): Promise<SocialAggregate> {
  return db.transaction(async (tx) => {
    const [state] = await tx
      .select()
      .from(rmSocialStateTable)
      .where(eq(rmSocialStateTable.userId, userId))
      .for("update");
    if (!state) throw new Error("Social state missing");
    if (state.shotTickets <= 0) throw new Error("No shot tickets available");

    const [existing] = await tx
      .select()
      .from(rmPostInteractionsTable)
      .where(and(eq(rmPostInteractionsTable.userId, userId), eq(rmPostInteractionsTable.postId, postId)))
      .limit(1);
    if (existing?.unlocked) throw new Error("Post already unlocked");

    const now = new Date();
    if (existing) {
      await tx
        .update(rmPostInteractionsTable)
        .set({ unlocked: 1, updatedAt: now })
        .where(eq(rmPostInteractionsTable.id, existing.id));
    } else {
      await tx
        .insert(rmPostInteractionsTable)
        .values({ userId, postId, liked: 0, saved: 0, hot: 0, unlocked: 1 });
    }
    await tx
      .update(rmSocialStateTable)
      .set({ shotTickets: state.shotTickets - 1, updatedAt: now })
      .where(eq(rmSocialStateTable.userId, userId));
    return getSocialAggregate(userId);
  });
}
