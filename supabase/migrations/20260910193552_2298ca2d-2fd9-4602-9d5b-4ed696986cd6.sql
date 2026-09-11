DROP FUNCTION public.list_shared_portfolios();

CREATE TABLE public.shared_portfolio_directory (
  user_portfolio_id uuid PRIMARY KEY REFERENCES public.user_portfolios(id) ON DELETE CASCADE,
  masked_name text NOT NULL,
  portfolio_name text NOT NULL,
  total_assets_kwd numeric(14,3) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.shared_portfolio_directory TO authenticated;
GRANT ALL ON public.shared_portfolio_directory TO service_role;
ALTER TABLE public.shared_portfolio_directory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "signed in users read shared portfolio directory"
  ON public.shared_portfolio_directory FOR SELECT TO authenticated USING (true);