-- 0002_social_profiles.sql
-- Social / gameplay state for the RM Coin Mini App.
-- Stored as a single JSONB column so the server schema stays stable while the
-- client-owned SocialState shape evolves. Apply with:
--   psql "$DATABASE_URL" -f lib/db/migrations/0002_social_profiles.sql
-- (drizzle-kit generate / push also works when DATABASE_URL is set.)

CREATE TABLE IF NOT EXISTS rm_social_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES rm_users (id) ON DELETE CASCADE,
  data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS rm_social_profiles_user_id_unique
  ON rm_social_profiles (user_id);
