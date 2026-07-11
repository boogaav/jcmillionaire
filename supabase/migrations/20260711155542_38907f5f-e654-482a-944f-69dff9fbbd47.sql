
ALTER TABLE public.live_questions ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.live_quiz_sets ADD COLUMN IF NOT EXISTS host_wallet_address TEXT;

CREATE TABLE IF NOT EXISTS public.live_pool_topups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_set_id UUID NOT NULL REFERENCES public.live_quiz_sets(id) ON DELETE CASCADE,
  from_address TEXT NOT NULL,
  to_address TEXT NOT NULL,
  tx_signature TEXT NOT NULL UNIQUE,
  amount_lamports BIGINT NOT NULL CHECK (amount_lamports > 0),
  amount_sol NUMERIC(20, 9) NOT NULL,
  note TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.live_pool_topups TO authenticated;
GRANT SELECT ON public.live_pool_topups TO anon;
GRANT ALL ON public.live_pool_topups TO service_role;

ALTER TABLE public.live_pool_topups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view pool topups"
  ON public.live_pool_topups FOR SELECT
  USING (true);

CREATE POLICY "Signed-in users can record a topup"
  ON public.live_pool_topups FOR INSERT
  TO authenticated
  WITH CHECK (created_by IS NOT NULL);

CREATE POLICY "Host or admin can delete topups"
  ON public.live_pool_topups FOR DELETE
  TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.live_quiz_sets qs
      WHERE qs.id = live_pool_topups.quiz_set_id
        AND qs.created_by = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS live_pool_topups_quiz_set_id_idx
  ON public.live_pool_topups(quiz_set_id);
