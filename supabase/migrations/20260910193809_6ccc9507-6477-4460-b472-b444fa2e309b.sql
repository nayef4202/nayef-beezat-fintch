CREATE OR REPLACE FUNCTION public.finalize_wallet_deposit(_transaction_id uuid, _payment_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tx public.wallet_transactions%ROWTYPE;
  current_total numeric;
  holding_row public.holdings%ROWTYPE;
  asset_price numeric;
  addition numeric;
BEGIN
  SELECT * INTO tx
  FROM public.wallet_transactions
  WHERE id = _transaction_id
  FOR UPDATE;

  IF NOT FOUND OR tx.transaction_type <> 'deposit' THEN
    RAISE EXCEPTION 'Deposit transaction not found';
  END IF;
  IF tx.status = 'completed' THEN
    RETURN;
  END IF;
  IF tx.status <> 'pending' THEN
    RAISE EXCEPTION 'Deposit transaction is not pending';
  END IF;

  SELECT COALESCE(sum(h.units * ap.price_kwd), 0)
  INTO current_total
  FROM public.holdings h
  LEFT JOIN public.asset_prices ap ON ap.ticker = h.ticker
  WHERE h.user_portfolio_id = tx.user_portfolio_id;

  FOR holding_row IN
    SELECT * FROM public.holdings WHERE user_portfolio_id = tx.user_portfolio_id FOR UPDATE
  LOOP
    SELECT price_kwd INTO asset_price FROM public.asset_prices WHERE ticker = holding_row.ticker;
    addition := tx.amount_kwd * holding_row.target_weight / 100;
    UPDATE public.holdings
    SET units = units + CASE WHEN COALESCE(asset_price, 0) > 0 THEN addition / asset_price ELSE 0 END,
        value_kwd = value_kwd + addition,
        updated_at = now()
    WHERE id = holding_row.id;
  END LOOP;

  UPDATE public.user_portfolios
  SET amount_kwd = amount_kwd + tx.amount_kwd,
      updated_at = now()
  WHERE id = tx.user_portfolio_id;

  UPDATE public.wallet_transactions
  SET status = 'completed',
      confirmed_at = now(),
      metadata = metadata || jsonb_build_object('payment_id', _payment_id),
      updated_at = now()
  WHERE id = tx.id;
END;
$$;
REVOKE ALL ON FUNCTION public.finalize_wallet_deposit(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_wallet_deposit(uuid, text) TO service_role;