-- Таблица realized: реализации из вкладки Реализация
CREATE TABLE IF NOT EXISTS public.realized (
  id text NOT NULL,
  user_id uuid NOT NULL,
  delivery_date text,
  issue_date text,
  counterparty text,
  total numeric NOT NULL DEFAULT 0,
  customer_inn text,
  customer_account text,
  contract_number text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  record_created_at text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id, user_id)
);

-- RLS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.realized TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.realized TO authenticated;

ALTER TABLE public.realized ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow realized CRUD" ON public.realized;
CREATE POLICY "Allow realized CRUD" ON public.realized
  FOR ALL
  USING (true)
  WITH CHECK (true);
