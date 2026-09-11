-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- model portfolios
CREATE TABLE public.model_portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name_ar TEXT NOT NULL,
  description_ar TEXT NOT NULL,
  risk_level INT NOT NULL,
  min_score INT NOT NULL,
  max_score INT NOT NULL,
  expected_return NUMERIC(5,2) NOT NULL,
  volatility NUMERIC(5,2) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.model_portfolios TO anon, authenticated;
GRANT ALL ON public.model_portfolios TO service_role;
ALTER TABLE public.model_portfolios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read portfolios" ON public.model_portfolios FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.portfolio_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES public.model_portfolios(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  asset_name_ar TEXT NOT NULL,
  asset_class_ar TEXT NOT NULL,
  target_weight NUMERIC(5,2) NOT NULL
);
GRANT SELECT ON public.portfolio_allocations TO anon, authenticated;
GRANT ALL ON public.portfolio_allocations TO service_role;
ALTER TABLE public.portfolio_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read allocations" ON public.portfolio_allocations FOR SELECT TO anon, authenticated USING (true);

-- risk assessments
CREATE TABLE public.risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  score INT NOT NULL,
  risk_level INT NOT NULL,
  expected_return NUMERIC(5,2) NOT NULL,
  recommended_portfolio_id UUID REFERENCES public.model_portfolios(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.risk_assessments TO authenticated;
GRANT ALL ON public.risk_assessments TO service_role;
ALTER TABLE public.risk_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own assessments" ON public.risk_assessments FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- user portfolios
CREATE TABLE public.user_portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  portfolio_id UUID NOT NULL REFERENCES public.model_portfolios(id),
  amount_kwd NUMERIC(14,3) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_portfolios TO authenticated;
GRANT ALL ON public.user_portfolios TO service_role;
ALTER TABLE public.user_portfolios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own user portfolios" ON public.user_portfolios FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_portfolio_id UUID NOT NULL REFERENCES public.user_portfolios(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  asset_name_ar TEXT NOT NULL,
  asset_class_ar TEXT NOT NULL,
  target_weight NUMERIC(5,2) NOT NULL,
  value_kwd NUMERIC(14,3) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.holdings TO authenticated;
GRANT ALL ON public.holdings TO service_role;
ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own holdings" ON public.holdings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.rebalance_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_portfolio_id UUID NOT NULL REFERENCES public.user_portfolios(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  max_drift NUMERIC(6,2) NOT NULL,
  trades JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.rebalance_events TO authenticated;
GRANT ALL ON public.rebalance_events TO service_role;
ALTER TABLE public.rebalance_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own rebalance events" ON public.rebalance_events FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- seed model portfolios
INSERT INTO public.model_portfolios (code, name_ar, description_ar, risk_level, min_score, max_score, expected_return, volatility, sort_order) VALUES
('conservative', 'المحافظة (منخفضة المخاطر)', 'محفظة إسلامية تركز على الحفاظ على رأس المال مع دخل ثابت من الصكوك، مناسبة لمن يبدأ أول مرة أو يحتاج فلوسه خلال سنوات قليلة.', 1, 0, 24, 4.50, 4.00, 1),
('moderate', 'المتوازنة', 'توازن بين النمو والاستقرار: أسهم عالمية متوافقة مع الشريعة مع نسبة جيدة من الصكوك.', 2, 25, 44, 6.50, 8.00, 2),
('growth', 'النمو', 'تركيز أكبر على الأسهم العالمية الإسلامية لنمو رأس المال على المدى الطويل مع تقلبات متوسطة إلى مرتفعة.', 3, 45, 64, 8.50, 13.00, 3),
('aggressive', 'النمو العالي', 'أعلى نسبة أسهم وأسواق ناشئة، مناسبة لمن يتحمل تذبذب كبير ويستثمر لأكثر من عشر سنوات.', 4, 65, 100, 10.50, 18.00, 4);

INSERT INTO public.portfolio_allocations (portfolio_id, ticker, asset_name_ar, asset_class_ar, target_weight)
SELECT id, v.ticker, v.name_ar, v.class_ar, v.w FROM public.model_portfolios p
JOIN (VALUES
  ('conservative','SPSK','صندوق الصكوك العالمية','صكوك',60.00),
  ('conservative','ISDW','أسهم عالمية إسلامية','أسهم',25.00),
  ('conservative','ISDE','أسهم أسواق ناشئة إسلامية','أسهم',5.00),
  ('conservative','SGLD','الذهب المدعوم فعلياً','ذهب',10.00),
  ('moderate','SPSK','صندوق الصكوك العالمية','صكوك',40.00),
  ('moderate','ISDW','أسهم عالمية إسلامية','أسهم',40.00),
  ('moderate','ISDE','أسهم أسواق ناشئة إسلامية','أسهم',10.00),
  ('moderate','SGLD','الذهب المدعوم فعلياً','ذهب',10.00),
  ('growth','SPSK','صندوق الصكوك العالمية','صكوك',20.00),
  ('growth','ISDW','أسهم عالمية إسلامية','أسهم',55.00),
  ('growth','ISDE','أسهم أسواق ناشئة إسلامية','أسهم',17.00),
  ('growth','SGLD','الذهب المدعوم فعلياً','ذهب',8.00),
  ('aggressive','SPSK','صندوق الصكوك العالمية','صكوك',5.00),
  ('aggressive','ISDW','أسهم عالمية إسلامية','أسهم',65.00),
  ('aggressive','ISDE','أسهم أسواق ناشئة إسلامية','أسهم',25.00),
  ('aggressive','SGLD','الذهب المدعوم فعلياً','ذهب',5.00)
) AS v(code, ticker, name_ar, class_ar, w) ON v.code = p.code;