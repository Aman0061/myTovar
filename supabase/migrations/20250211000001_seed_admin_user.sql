-- Добавляем admin-пользователя для удовлетворения foreign key в clients
-- id должен совпадать с ADMIN_USER_ID в App.tsx

-- Если таблица users имеет колонки: id, email, password
INSERT INTO public.users (id, email, password)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin@test.com',
  'admin'
)
ON CONFLICT (id) DO NOTHING;

-- Если колонка называется password_hash — замените на:
-- INSERT INTO public.users (id, email, password_hash)
-- VALUES ('00000000-0000-0000-0000-000000000001', 'admin@test.com', '...');
