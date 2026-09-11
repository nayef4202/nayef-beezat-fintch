ALTER TABLE public.profiles
  ADD COLUMN share_portfolio boolean NOT NULL DEFAULT false;

CREATE TABLE public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_portfolio_id uuid NOT NULL REFERENCES public.user_portfolios(id) ON DELETE RESTRICT,
  transaction_type text NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal')),
  amount_kwd numeric(14,3) NOT NULL CHECK (amount_kwd > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  provider text NOT NULL DEFAULT 'MyFatoorah',
  provider_reference text,
  idempotency_key uuid NOT NULL DEFAULT gen_random_uuid(),
  confirmed_at timestamptz,
  failure_reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (idempotency_key),
  UNIQUE (provider, provider_reference)
);
GRANT SELECT ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own wallet transaction history" ON public.wallet_transactions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_wallet_transaction_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER wallet_transactions_updated_at
  BEFORE UPDATE ON public.wallet_transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_wallet_transaction_updated_at();

CREATE OR REPLACE FUNCTION public.list_shared_portfolios()
RETURNS TABLE (
  masked_name text,
  portfolio_name text,
  total_assets_kwd numeric,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN nullif(trim(p.full_name), '') IS NULL THEN 'مستثمر في بيزات'
      ELSE split_part(trim(p.full_name), ' ', 1) ||
        CASE
          WHEN split_part(trim(p.full_name), ' ', 2) = '' THEN ''
          ELSE ' ' || left(split_part(trim(p.full_name), ' ', 2), 1) || '.'
        END
    END AS masked_name,
    mp.name_ar AS portfolio_name,
    round(COALESCE(sum(h.units * ap.price_kwd), 0), 3) AS total_assets_kwd,
    greatest(up.updated_at, max(COALESCE(ap.as_of, ap.updated_at))) AS updated_at
  FROM public.profiles p
  JOIN public.user_portfolios up ON up.user_id = p.id AND up.is_active = true
  JOIN public.model_portfolios mp ON mp.id = up.portfolio_id
  LEFT JOIN public.holdings h ON h.user_portfolio_id = up.id
  LEFT JOIN public.asset_prices ap ON ap.ticker = h.ticker
  WHERE p.share_portfolio = true
  GROUP BY p.id, p.full_name, mp.name_ar, up.updated_at
  ORDER BY total_assets_kwd DESC;
$$;
REVOKE ALL ON FUNCTION public.list_shared_portfolios() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_shared_portfolios() TO authenticated;

REVOKE INSERT, DELETE ON public.rebalance_events FROM authenticated;
DROP POLICY "own rebalance events" ON public.rebalance_events;
CREATE POLICY "read own rebalance events" ON public.rebalance_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);