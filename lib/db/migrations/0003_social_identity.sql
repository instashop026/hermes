-- RM Coin social/identity schema extension (v3)
-- Idempotent: safe to re-run. Extends rm_users and adds relational social tables.

-- 1) Extend rm_users with the full Telegram identity + LP balance + last login.
ALTER TABLE rm_users
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS language_code text,
  ADD COLUMN IF NOT EXISTS is_premium integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lp_balance double precision NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

-- 2) Per-model reveal progress.
CREATE TABLE IF NOT EXISTS rm_reveals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES rm_users (id) ON DELETE CASCADE,
  model_id text NOT NULL,
  panels_revealed integer NOT NULL DEFAULT 0,
  unlocked integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, model_id)
);

-- 3) Followed models.
CREATE TABLE IF NOT EXISTS rm_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES rm_users (id) ON DELETE CASCADE,
  model_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, model_id)
);

-- 4) Per-post like / save / hot flags.
CREATE TABLE IF NOT EXISTS rm_post_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES rm_users (id) ON DELETE CASCADE,
  post_id text NOT NULL,
  liked integer NOT NULL DEFAULT 0,
  saved integer NOT NULL DEFAULT 0,
  hot integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, post_id)
);

-- 5) Per-post view counts.
CREATE TABLE IF NOT EXISTS rm_post_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES rm_users (id) ON DELETE CASCADE,
  post_id text NOT NULL,
  view_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, post_id)
);

-- 6) Followed style categories.
CREATE TABLE IF NOT EXISTS rm_followed_styles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES rm_users (id) ON DELETE CASCADE,
  style_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, style_id)
);

-- 7) Purchased miners / skins.
CREATE TABLE IF NOT EXISTS rm_ownership (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES rm_users (id) ON DELETE CASCADE,
  item_id text NOT NULL,
  kind text NOT NULL,
  purchased_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_id)
);

-- 8) Aggregate social counters + equipment (one row per user).
CREATE TABLE IF NOT EXISTS rm_social_state (
  user_id uuid PRIMARY KEY REFERENCES rm_users (id) ON DELETE CASCADE,
  starter_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  unlocked_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  model_tickets integer NOT NULL DEFAULT 0,
  shot_tickets integer NOT NULL DEFAULT 0,
  bonus_mine_minutes integer NOT NULL DEFAULT 0,
  last_wheel_spin timestamptz,
  earned_spins integer NOT NULL DEFAULT 0,
  ads_watched_for_spin integer NOT NULL DEFAULT 0,
  equipped_miner text,
  equipped_skin text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 9) Flexible, non-authoritative client metadata (muted only for now).
CREATE TABLE IF NOT EXISTS rm_social_meta (
  user_id uuid PRIMARY KEY REFERENCES rm_users (id) ON DELETE CASCADE,
  muted integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Drop the old single-JSONB social profile table if it was created earlier.
DROP TABLE IF EXISTS rm_social_profiles;
