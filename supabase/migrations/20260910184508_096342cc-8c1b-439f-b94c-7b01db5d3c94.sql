CREATE TABLE public.asset_prices (
  ticker text PRIMARY KEY,
  market_symbol text NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  price numeric NOT NULL DEFAULT 0,
  price_kwd numeric NOT NULL DEFAULT 0,
  change_percent numeric NOT NULL DEFAULT 0,
  usd_kwd numeric NOT NULL DEFAULT 0,
  as_of timestamp with time zone,
  source text NOT NULL DEFAULT 'Yahoo Finance',
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.asset_prices TO anon;
GRANT SELECT ON public.asset_prices TO authenticated;
GRANT ALL ON public.asset_prices TO service_role;

ALTER TABLE public.asset_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read asset prices" ON public.asset_prices
  FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.asset_prices (ticker, market_symbol, currency) VALUES
  ('SPSK', 'SPSK', 'USD'),
  ('ISDW', 'ISDW.L', 'USD'),
  ('ISDE', 'ISDE.L', 'USD'),
  ('SGLD', 'SGLD.L', 'USD');

ALTER TABLE public.holdings ADD COLUMN units numeric NOT NULL DEFAULT 0;