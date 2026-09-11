REVOKE INSERT, UPDATE, DELETE ON public.holdings FROM authenticated;
DROP POLICY "own holdings" ON public.holdings;
CREATE POLICY "read own holdings" ON public.holdings
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

REVOKE SELECT ON public.shared_portfolio_directory FROM authenticated;
DROP POLICY "read consented shared portfolio directory" ON public.shared_portfolio_directory;

CREATE VIEW public.shared_portfolios_public
WITH (security_invoker = true)
AS
SELECT masked_name, portfolio_name, total_assets_kwd, updated_at
FROM public.shared_portfolio_directory;
GRANT SELECT ON public.shared_portfolios_public TO authenticated;

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