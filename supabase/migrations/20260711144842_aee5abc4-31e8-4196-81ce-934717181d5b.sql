ALTER TABLE public.live_quiz_sets
  ADD COLUMN IF NOT EXISTS is_sandbox boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false;

-- Existing admin-curated sets (created before this migration) stay as "real" shows
UPDATE public.live_quiz_sets SET is_sandbox = false WHERE created_at < now();