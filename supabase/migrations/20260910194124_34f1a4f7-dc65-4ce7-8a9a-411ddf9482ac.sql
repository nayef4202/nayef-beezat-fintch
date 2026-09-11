ALTER TABLE public.shared_portfolio_directory
  ADD COLUMN user_id uuid;

UPDATE public.shared_portfolio_directory d
SET user_id = up.user_id
FROM public.user_portfolios up
WHERE up.id = d.user_portfolio_id;

ALTER TABLE public.shared_portfolio_directory
  ALTER COLUMN user_id SET NOT NULL;

DROP POLICY "signed in users read shared portfolio directory" ON public.shared_portfolio_directory;
CREATE POLICY "read consented shared portfolio directory"
  ON public.shared_portfolio_directory
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = shared_portfolio_directory.user_id
        AND p.share_portfolio = true
    )
  );