-- RLS для таблицы products
-- Разрешаем anon и authenticated CRUD (фильтрация по user_id в приложении)

GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow products CRUD" ON public.products;
CREATE POLICY "Allow products CRUD" ON public.products
  FOR ALL
  USING (true)
  WITH CHECK (true);
