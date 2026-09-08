import app from "./app";
import { logger } from "./lib/logger";
import pg from "pg";
import { ensureMinerConfigs } from "./lib/rm-coin";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// ── Auto-migrate: create tables + seed miners on first boot ─────────────────
// The Supabase project is provisioned without running Drizzle migrations, so
// the tables don't exist. This bootstraps them once so the app can function.
async function migrate() {
  const connectionString = process.env["DIRECT_URL"] || process.env["DATABASE_URL"];
  if (!connectionString) {
    logger.warn("No DATABASE_URL/DIRECT_URL — skipping auto-migration");
    return;
  }
  const pool = new pg.Pool({ connectionString, prepare: false });
  try {
    const client = await pool.connect();
    try {
      // uuid extension (needed for uuid_generate_v4 primary keys)
      await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

      const tables = [
        // rm_users
        `CREATE TABLE IF NOT EXISTS "rm_users" (
          "id"              uuid        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
          "telegram_user_id" text       NOT NULL,
          "username"        text,
          "first_name"      text        NOT NULL,
          "last_name"       text,
          "display_name"    text,
          "photo_url"       text,
          "language_code"   text,
          "is_premium"      integer     NOT NULL DEFAULT 0,
          "lp_balance"      double precision NOT NULL DEFAULT 24,
          "balance"         double precision NOT NULL DEFAULT 0,
          "created_at"      timestamptz NOT NULL DEFAULT now(),
          "updated_at"      timestamptz NOT NULL DEFAULT now(),
          "last_login_at"   timestamptz
        )`,
        `CREATE UNIQUE INDEX IF NOT EXISTS "rm_users_telegram_user_id_unique" ON "rm_users" ("telegram_user_id")`,
        // rm_miners
        `CREATE TABLE IF NOT EXISTS "rm_miners" (
          "id"                  uuid        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
          "level"               integer     NOT NULL,
          "name"                text        NOT NULL,
          "mining_rate"         double precision NOT NULL,
          "max_energy_minutes"  integer     NOT NULL,
          "upgrade_cost"        double precision NOT NULL DEFAULT 0
        )`,
        `CREATE UNIQUE INDEX IF NOT EXISTS "rm_miners_level_unique" ON "rm_miners" ("level")`,
        // rm_user_miners
        `CREATE TABLE IF NOT EXISTS "rm_user_miners" (
          "id"                    uuid        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
          "user_id"               uuid        NOT NULL REFERENCES "rm_users" ("id") ON DELETE CASCADE,
          "miner_level"           integer     NOT NULL DEFAULT 1,
          "current_energy_minutes" double precision NOT NULL DEFAULT 300,
          "last_mining_update"    timestamptz NOT NULL DEFAULT now(),
          "unclaimed_mined_amount" double precision NOT NULL DEFAULT 0,
          "created_at"            timestamptz NOT NULL DEFAULT now(),
          "updated_at"            timestamptz NOT NULL DEFAULT now()
        )`,
        `CREATE UNIQUE INDEX IF NOT EXISTS "rm_user_miners_user_id_unique" ON "rm_user_miners" ("user_id")`,
        // rm_ad_rewards
        `CREATE TABLE IF NOT EXISTS "rm_ad_rewards" (
          "id"                uuid        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
          "user_id"           uuid        NOT NULL REFERENCES "rm_users" ("id") ON DELETE CASCADE,
          "provider"          text        NOT NULL DEFAULT 'monetag',
          "external_reward_id" text       NOT NULL,
          "reward_minutes"    integer     NOT NULL,
          "status"            text        NOT NULL DEFAULT 'issued',
          "expires_at"        timestamptz NOT NULL,
          "created_at"        timestamptz NOT NULL DEFAULT now(),
          "completed_at"      timestamptz
        )`,
        `CREATE UNIQUE INDEX IF NOT EXISTS "rm_ad_rewards_external_reward_unique" ON "rm_ad_rewards" ("external_reward_id")`,
        // rm_transactions
        `CREATE TABLE IF NOT EXISTS "rm_transactions" (
          "id"            uuid        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
          "user_id"       uuid        NOT NULL REFERENCES "rm_users" ("id") ON DELETE CASCADE,
          "type"          text        NOT NULL,
          "amount"        double precision NOT NULL,
          "reference_id"  text,
          "created_at"    timestamptz NOT NULL DEFAULT now()
        )`,
        // rm_reveals
        `CREATE TABLE IF NOT EXISTS "rm_reveals" (
          "id"                uuid        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
          "user_id"           uuid        NOT NULL REFERENCES "rm_users" ("id") ON DELETE CASCADE,
          "model_id"          text        NOT NULL,
          "panels_revealed"   integer     NOT NULL DEFAULT 0,
          "unlocked"          integer     NOT NULL DEFAULT 0,
          "created_at"        timestamptz NOT NULL DEFAULT now(),
          "updated_at"        timestamptz NOT NULL DEFAULT now()
        )`,
        `CREATE UNIQUE INDEX IF NOT EXISTS "rm_reveals_user_model_unique" ON "rm_reveals" ("user_id", "model_id")`,
        // rm_follows
        `CREATE TABLE IF NOT EXISTS "rm_follows" (
          "id"        uuid        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
          "user_id"   uuid        NOT NULL REFERENCES "rm_users" ("id") ON DELETE CASCADE,
          "model_id"  text        NOT NULL,
          "created_at" timestamptz NOT NULL DEFAULT now()
        )`,
        `CREATE UNIQUE INDEX IF NOT EXISTS "rm_follows_user_model_unique" ON "rm_follows" ("user_id", "model_id")`,
        // rm_post_interactions
        `CREATE TABLE IF NOT EXISTS "rm_post_interactions" (
          "id"        uuid        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
          "user_id"   uuid        NOT NULL REFERENCES "rm_users" ("id") ON DELETE CASCADE,
          "post_id"   text        NOT NULL,
          "liked"     integer     NOT NULL DEFAULT 0,
          "saved"     integer     NOT NULL DEFAULT 0,
          "hot"       integer     NOT NULL DEFAULT 0,
          "unlocked"  integer     NOT NULL DEFAULT 0,
          "created_at" timestamptz NOT NULL DEFAULT now(),
          "updated_at" timestamptz NOT NULL DEFAULT now()
        )`,
        `CREATE UNIQUE INDEX IF NOT EXISTS "rm_post_interactions_user_post_unique" ON "rm_post_interactions" ("user_id", "post_id")`,
        // rm_post_views
        `CREATE TABLE IF NOT EXISTS "rm_post_views" (
          "id"        uuid        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
          "user_id"   uuid        NOT NULL REFERENCES "rm_users" ("id") ON DELETE CASCADE,
          "post_id"   text        NOT NULL,
          "view_count" integer     NOT NULL DEFAULT 0,
          "updated_at" timestamptz NOT NULL DEFAULT now()
        )`,
        `CREATE UNIQUE INDEX IF NOT EXISTS "rm_post_views_user_post_unique" ON "rm_post_views" ("user_id", "post_id")`,
        // rm_followed_styles
        `CREATE TABLE IF NOT EXISTS "rm_followed_styles" (
          "id"        uuid        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
          "user_id"   uuid        NOT NULL REFERENCES "rm_users" ("id") ON DELETE CASCADE,
          "style_id"  text        NOT NULL,
          "created_at" timestamptz NOT NULL DEFAULT now()
        )`,
        `CREATE UNIQUE INDEX IF NOT EXISTS "rm_followed_styles_user_style_unique" ON "rm_followed_styles" ("user_id", "style_id")`,
        // rm_ownership
        `CREATE TABLE IF NOT EXISTS "rm_ownership" (
          "id"          uuid        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
          "user_id"     uuid        NOT NULL REFERENCES "rm_users" ("id") ON DELETE CASCADE,
          "item_id"     text        NOT NULL,
          "kind"        text        NOT NULL,
          "purchased_at" timestamptz NOT NULL DEFAULT now()
        )`,
        `CREATE UNIQUE INDEX IF NOT EXISTS "rm_ownership_user_item_unique" ON "rm_ownership" ("user_id", "item_id")`,
        // rm_social_state
        `CREATE TABLE IF NOT EXISTS "rm_social_state" (
          "user_id"              uuid        NOT NULL PRIMARY KEY REFERENCES "rm_users" ("id") ON DELETE CASCADE,
          "starter_ids"          jsonb       NOT NULL DEFAULT '[]',
          "unlocked_ids"         jsonb       NOT NULL DEFAULT '[]',
          "model_tickets"        integer     NOT NULL DEFAULT 0,
          "shot_tickets"         integer     NOT NULL DEFAULT 0,
          "bonus_mine_minutes"   integer     NOT NULL DEFAULT 0,
          "last_wheel_spin"      timestamptz,
          "earned_spins"         integer     NOT NULL DEFAULT 0,
          "ads_watched_for_spin" integer     NOT NULL DEFAULT 0,
          "equipped_miner"       text,
          "equipped_skin"        text,
          "created_at"           timestamptz NOT NULL DEFAULT now(),
          "updated_at"           timestamptz NOT NULL DEFAULT now()
        )`,
        // rm_social_meta
        `CREATE TABLE IF NOT EXISTS "rm_social_meta" (
          "user_id"    uuid        NOT NULL PRIMARY KEY REFERENCES "rm_users" ("id") ON DELETE CASCADE,
          "muted"      integer     NOT NULL DEFAULT 0,
          "updated_at" timestamptz NOT NULL DEFAULT now()
        )`,
        // rm_models
        `CREATE TABLE IF NOT EXISTS "rm_models" (
          "id"              uuid        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
          "slug"            text        NOT NULL UNIQUE,
          "name"            text        NOT NULL,
          "username"        text        NOT NULL,
          "bio"             text        NOT NULL DEFAULT '',
          "location"        text        NOT NULL DEFAULT '',
          "avatar_url"      text        NOT NULL DEFAULT '',
          "cover_url"       text        NOT NULL DEFAULT '',
          "accent"          text        NOT NULL DEFAULT '#ffbd7d',
          "reveal_cost_lp"  integer     NOT NULL DEFAULT 30,
          "rm_cost"         double precision NOT NULL DEFAULT 2.5,
          "tags"            jsonb       NOT NULL DEFAULT '[]',
          "created_at"      timestamptz NOT NULL DEFAULT now(),
          "updated_at"      timestamptz NOT NULL DEFAULT now()
        )`,
        // rm_model_posts
        `CREATE TABLE IF NOT EXISTS "rm_model_posts" (
          "id"          uuid        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
          "model_id"    uuid        NOT NULL REFERENCES "rm_models" ("id") ON DELETE CASCADE,
          "image_url"   text        NOT NULL,
          "file_id"     text,
          "caption"     text        NOT NULL DEFAULT '',
          "sort_order"  integer     NOT NULL DEFAULT 0,
          "created_at"  timestamptz NOT NULL DEFAULT now()
        )`,
      ];

      let created = 0;
      for (const sql of tables) {
        try {
          await client.query(sql);
          created++;
        } catch (e: any) {
          if (e.code === "42P07" || e.code === "42710") {
            // already exists — skip silently
          } else {
            logger.warn({ err: e }, "Migration statement skipped");
          }
        }
      }
      logger.info({ created }, "Auto-migration complete");

      // Seed miner configs (rm_miners rows)
      try {
        await ensureMinerConfigs();
        logger.info("Miner configs seeded");
      } catch (e: any) {
        logger.warn({ err: e }, "Miner seeding skipped");
      }
    } finally {
      client.release();
    }
  } catch (e: any) {
    logger.warn({ err: e }, "Auto-migration failed — app will start anyway");
  } finally {
    await pool.end();
  }
}

await migrate();

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
