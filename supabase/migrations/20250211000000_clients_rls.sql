-- RLS для tables clients (если таблица уже создана вручную)
-- Позволяет anon и authenticated выполнять CRUD (фильтрация по user_id — в приложении)

-- Удаляем foreign key, чтобы user_id мог быть любым UUID (admin, пользователи из localStorage)
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_user_id_fkey;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Политика: разрешить все операции (фильтрация по user_id в коде приложения)
DROP POLICY IF EXISTS "Allow clients CRUD" ON public.clients;
CREATE POLICY "Allow clients CRUD" ON public.clients
  FOR ALL
  USING (true)
  WITH CHECK (true);
