import { doublePrecision, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Admin-authored models. These are the dynamic counterpart to the static
 * MODEL_PROFILES in the rm-coin app; the catalog endpoint merges both so
 * models created in the admin panel appear in the live app.
 */
export const rmModelsTable = pgTable("rm_models", {
  id: uuid("id").defaultRandom().primaryKey(),
  // URL-safe stable id used by the app (e.g. "mara-vale").
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  username: text("username").notNull(),
  bio: text("bio").notNull().default(""),
  location: text("location").notNull().default(""),
  // ZeroStorage download URLs.
  avatarUrl: text("avatar_url").notNull().default(""),
  coverUrl: text("cover_url").notNull().default(""),
  accent: text("accent").notNull().default("#ffbd7d"),
  // Reveal economics (LP ritual + instant RM unlock).
  revealCostLp: integer("reveal_cost_lp").notNull().default(30),
  rmCost: doublePrecision("rm_cost").notNull().default(2.5),
  // 1-10 hashtags. Stored as jsonb (not text[]) because drizzle's text[]
  // parameterization breaks on the Supabase pooler; jsonb binds cleanly
  // (same reason rm_social_state.starter_ids is jsonb).
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Posts attached to a model (images only for now; videos later). */
export const rmModelPostsTable = pgTable("rm_model_posts", {
  id: uuid("id").defaultRandom().primaryKey(),
  modelId: uuid("model_id").notNull().references(() => rmModelsTable.id, { onDelete: "cascade" }),
  // ZeroStorage download URL.
  imageUrl: text("image_url").notNull(),
  // Original filename / ZeroStorage file id for re-use.
  fileId: text("file_id"),
  caption: text("caption").notNull().default(""),
  // Sort order within the model's feed.
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type RmModel = typeof rmModelsTable.$inferSelect;
export type RmModelPost = typeof rmModelPostsTable.$inferSelect;
