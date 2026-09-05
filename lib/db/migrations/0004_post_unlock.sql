-- RM Coin: shot-ticket post unlock (v4)
-- Idempotent: safe to re-run.

-- Track posts permanently unlocked via a shot ticket.
ALTER TABLE rm_post_interactions
  ADD COLUMN IF NOT EXISTS unlocked integer NOT NULL DEFAULT 0;
