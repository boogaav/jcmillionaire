-- Extend live_quiz_sets with per-show routing + optional guest passcode
ALTER TABLE public.live_quiz_sets
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS passcode text;

-- Slug must be unique when present
CREATE UNIQUE INDEX IF NOT EXISTS live_quiz_sets_slug_key
  ON public.live_quiz_sets (slug)
  WHERE slug IS NOT NULL;

-- Basic slug shape guard (letters, numbers, hyphens, 3-40 chars)
ALTER TABLE public.live_quiz_sets
  DROP CONSTRAINT IF EXISTS live_quiz_sets_slug_shape;
ALTER TABLE public.live_quiz_sets
  ADD CONSTRAINT live_quiz_sets_slug_shape
  CHECK (slug IS NULL OR slug ~ '^[a-z0-9][a-z0-9-]{2,39}$');