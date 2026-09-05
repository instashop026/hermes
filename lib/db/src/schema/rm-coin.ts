import {
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const rmUsersTable = pgTable(
  "rm_users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // Permanent external identity from Telegram. NEVER username — that changes.
    telegramUserId: text("telegram_user_id").notNull(),
    username: text("username"),
    firstName: text("first_name").notNull(),
    // Extended Telegram identity (from verified initData). Populated/refreshed
    // on every login so the backend owns the canonical profile.
    lastName: text("last_name"),
    displayName: text("display_name"),
    photoUrl: text("photo_url"),
    languageCode: text("language_code"),
    isPremium: integer("is_premium").notNull().default(0),
    // Secondary (earned) coin handled server-side, not trusted from client.
    lpBalance: doublePrecision("lp_balance").notNull().default(24),
    balance: doublePrecision("balance").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  },
  (table) => ({
    telegramUserIdUnique: uniqueIndex("rm_users_telegram_user_id_unique").on(
      table.telegramUserId,
    ),
  }),
);

export const rmMinersTable = pgTable(
  "rm_miners",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    level: integer("level").notNull(),
    name: text("name").notNull(),
    miningRate: doublePrecision("mining_rate").notNull(),
    maxEnergyMinutes: integer("max_energy_minutes").notNull(),
    upgradeCost: doublePrecision("upgrade_cost").notNull().default(0),
  },
  (table) => ({
    levelUnique: uniqueIndex("rm_miners_level_unique").on(table.level),
  }),
);

export const rmUserMinersTable = pgTable(
  "rm_user_miners",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => rmUsersTable.id, { onDelete: "cascade" }),
    minerLevel: integer("miner_level").notNull().default(1),
    currentEnergyMinutes: doublePrecision("current_energy_minutes").notNull().default(300),
    lastMiningUpdate: timestamp("last_mining_update", { withTimezone: true })
      .notNull()
      .defaultNow(),
    unclaimedMinedAmount: doublePrecision("unclaimed_mined_amount").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userUnique: uniqueIndex("rm_user_miners_user_id_unique").on(table.userId),
  }),
);

export const rmAdRewardsTable = pgTable(
  "rm_ad_rewards",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => rmUsersTable.id, { onDelete: "cascade" }),
    provider: text("provider").notNull().default("monetag"),
    externalRewardId: text("external_reward_id").notNull(),
    rewardMinutes: integer("reward_minutes").notNull(),
    status: text("status").notNull().default("issued"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => ({
    externalRewardUnique: uniqueIndex("rm_ad_rewards_external_reward_unique").on(
      table.externalRewardId,
    ),
  }),
);

export const rmTransactionsTable = pgTable("rm_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => rmUsersTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  amount: doublePrecision("amount").notNull(),
  referenceId: text("reference_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type RmUser = typeof rmUsersTable.$inferSelect;
export type RmMiner = typeof rmMinersTable.$inferSelect;
export type RmUserMiner = typeof rmUserMinersTable.$inferSelect;

/**
 * Relational social / gameplay state for the RM Coin Mini App.
 *
 * Design notes (per security + data-modelling requirements):
 *  - telegram_id (rm_users.telegram_user_id) is the permanent external key;
 *    username is never used as an identity.
 *  - Important, queryable, transaction-safe state lives in real columns /
 *    rows: reveals, follows, post like/save/hot flags, view counts, the
 *    prize-wheel counters, ticket counts, purchases and equipment.
 *  - A single `rm_social_meta` JSONB row is reserved for genuinely flexible,
 *    non-authoritative client preferences (e.g. muted). It is NEVER trusted
 *    for balances or anything the server must validate.
 */

/** Per-model reveal progress + unlock status. */
export const rmRevealsTable = pgTable(
  "rm_reveals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => rmUsersTable.id, { onDelete: "cascade" }),
    // Model id from the client catalogue (e.g. "mara-vale"). Not an FK to a DB
    // table because models are static content defined in code.
    modelId: text("model_id").notNull(),
    // 0..REVEAL_PANELS (5) curtain taps completed.
    panelsRevealed: integer("panels_revealed").notNull().default(0),
    unlocked: integer("unlocked").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userModelUnique: uniqueIndex("rm_reveals_user_model_unique").on(
      table.userId,
      table.modelId,
    ),
  }),
);

/** Followed models. */
export const rmFollowsTable = pgTable(
  "rm_follows",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => rmUsersTable.id, { onDelete: "cascade" }),
    modelId: text("model_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userModelUnique: uniqueIndex("rm_follows_user_model_unique").on(
      table.userId,
      table.modelId,
    ),
  }),
);

/** Per-post like / save / hot flags. One row per (user, post). */
export const rmPostInteractionsTable = pgTable(
  "rm_post_interactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => rmUsersTable.id, { onDelete: "cascade" }),
    // Post id (e.g. "mara-01"). Static content from code.
    postId: text("post_id").notNull(),
    liked: integer("liked").notNull().default(0),
    saved: integer("saved").notNull().default(0),
    hot: integer("hot").notNull().default(0),
    // Set when a shot ticket permanently unlocks this post for the user.
    unlocked: integer("unlocked").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userPostUnique: uniqueIndex("rm_post_interactions_user_post_unique").on(
      table.userId,
      table.postId,
    ),
  }),
);

/** Per-post view counts (how many times THIS user opened the post). */
export const rmPostViewsTable = pgTable(
  "rm_post_views",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => rmUsersTable.id, { onDelete: "cascade" }),
    postId: text("post_id").notNull(),
    viewCount: integer("view_count").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userPostUnique: uniqueIndex("rm_post_views_user_post_unique").on(
      table.userId,
      table.postId,
    ),
  }),
);

/** Followed style categories. */
export const rmFollowedStylesTable = pgTable(
  "rm_followed_styles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => rmUsersTable.id, { onDelete: "cascade" }),
    styleId: text("style_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userStyleUnique: uniqueIndex("rm_followed_styles_user_style_unique").on(
      table.userId,
      table.styleId,
    ),
  }),
);

/** Purchased miners / skins (market inventory). */
export const rmOwnershipTable = pgTable(
  "rm_ownership",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => rmUsersTable.id, { onDelete: "cascade" }),
    // Item id from the client catalogue (e.g. "rig-mk2", "skin-aurora").
    itemId: text("item_id").notNull(),
    kind: text("kind").notNull(), // "miner" | "skin"
    purchasedAt: timestamp("purchased_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userItemUnique: uniqueIndex("rm_ownership_user_item_unique").on(
      table.userId,
      table.itemId,
    ),
  }),
);

/**
 * Aggregate, server-authoritative social counters + equipment.
 * Kept as a single row per user so reads/writes are atomic under row lock.
 */
export const rmSocialStateTable = pgTable(
  "rm_social_state",
  {
    userId: uuid("user_id")
      .notNull()
      .primaryKey()
      .references(() => rmUsersTable.id, { onDelete: "cascade" }),
    starterIds: jsonb("starter_ids").$type<string[]>().notNull().default([]),
    // Client-configured unlock order / starter set (static content from code).
    unlockedIds: jsonb("unlocked_ids").$type<string[]>().notNull().default([]),
    // Counters (server-validated, never client-trusted).
    modelTickets: integer("model_tickets").notNull().default(0),
    shotTickets: integer("shot_tickets").notNull().default(0),
    bonusMineMinutes: integer("bonus_mine_minutes").notNull().default(0),
    // Wheel state.
    lastWheelSpin: timestamp("last_wheel_spin", { withTimezone: true }),
    earnedSpins: integer("earned_spins").notNull().default(0),
    adsWatchedForSpin: integer("ads_watched_for_spin").notNull().default(0),
    // Equipment.
    equippedMiner: text("equipped_miner"),
    equippedSkin: text("equipped_skin"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

/**
 * Flexible, NON-authoritative client metadata. Only `muted` for now. Never
 * holds balances or anything the server must validate. Aimed at the spec's
 * "JSON field may be used for genuinely flexible metadata" allowance.
 */
export const rmSocialMetaTable = pgTable(
  "rm_social_meta",
  {
    userId: uuid("user_id")
      .notNull()
      .primaryKey()
      .references(() => rmUsersTable.id, { onDelete: "cascade" }),
    muted: integer("muted").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

export type RmReveal = typeof rmRevealsTable.$inferSelect;
export type RmFollow = typeof rmFollowsTable.$inferSelect;
export type RmPostInteraction = typeof rmPostInteractionsTable.$inferSelect;
export type RmPostView = typeof rmPostViewsTable.$inferSelect;
export type RmFollowedStyle = typeof rmFollowedStylesTable.$inferSelect;
export type RmOwnership = typeof rmOwnershipTable.$inferSelect;
export type RmSocialState = typeof rmSocialStateTable.$inferSelect;
export type RmSocialMeta = typeof rmSocialMetaTable.$inferSelect;
