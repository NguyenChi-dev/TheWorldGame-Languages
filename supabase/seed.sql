-- Dữ liệu mẫu, chạy sau migration khi `supabase db reset` (cần Docker).
-- PHẢI KHỚP với packages/shared:
--   - Từ vựng: packages/shared/src/content/en/vegetables.json
--   - Hạt giống: packages/shared/src/seeds.ts

insert into public.lands (id, name, language_code, description) values
  ('en', 'Tiếng Anh', 'en', 'Thế giới tiếng Anh: nông trại, rạp chiếu phim, công viên và thị trấn nhỏ.');

insert into public.words (id, land_id, word, meaning, level, topic) values
  ('en-carrot',   'en', 'carrot',   'cà rốt',      1, 'vegetables'),
  ('en-tomato',   'en', 'tomato',   'cà chua',     1, 'vegetables'),
  ('en-corn',     'en', 'corn',     'ngô',         1, 'vegetables'),
  ('en-potato',   'en', 'potato',   'khoai tây',   1, 'vegetables'),
  ('en-onion',    'en', 'onion',    'hành tây',    1, 'vegetables'),
  ('en-cabbage',  'en', 'cabbage',  'bắp cải',     2, 'vegetables'),
  ('en-cucumber', 'en', 'cucumber', 'dưa chuột',   2, 'vegetables'),
  ('en-pumpkin',  'en', 'pumpkin',  'bí ngô',      2, 'vegetables'),
  ('en-lettuce',  'en', 'lettuce',  'rau xà lách', 3, 'vegetables'),
  ('en-eggplant', 'en', 'eggplant', 'cà tím',      3, 'vegetables');

insert into public.items (id, kind, name, buy_price, sell_price, grow_seconds, word_id) values
  ('carrot', 'seed', 'Carrot seed', 10, 18,  60, 'en-carrot'),
  ('tomato', 'seed', 'Tomato seed', 15, 28, 120, 'en-tomato'),
  ('corn',   'seed', 'Corn seed',   20, 40, 180, 'en-corn');

-- -----------------------------------------------------------------------------
-- Tài khoản thử, mỗi vai trò 1 tài khoản. CHỈ DÙNG Ở MÁY LOCAL.
-- Mật khẩu chung: matkhau123
-- Tài khoản quản trị (admin, editor, moderator) lần đầu đăng nhập apps/admin sẽ phải
-- quét mã QR bằng ứng dụng xác thực (TOTP). player@lw.test bị chặn ở trang đăng nhập.
-- -----------------------------------------------------------------------------

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
)
select
  '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
  extensions.crypt('matkhau123', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now(),
  '', '', '', ''
from (values
  ('a0000000-0000-4000-8000-000000000001'::uuid, 'admin@lw.test'),
  ('a0000000-0000-4000-8000-000000000002'::uuid, 'editor@lw.test'),
  ('a0000000-0000-4000-8000-000000000003'::uuid, 'moderator@lw.test'),
  ('a0000000-0000-4000-8000-000000000004'::uuid, 'player@lw.test')
) as u (id, email);

insert into auth.identities (user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select id, id::text, 'email', jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true), now(), now(), now()
from auth.users
where email like '%@lw.test';

-- Hồ sơ đã được trigger on_auth_user_created tạo sẵn (vai trò 'player'), chỉ cần cấp vai trò.
update public.profiles as p
set username = v.username, role = v.role::public.user_role
from (values
  ('a0000000-0000-4000-8000-000000000001'::uuid, 'admin',     'admin'),
  ('a0000000-0000-4000-8000-000000000002'::uuid, 'editor',    'editor'),
  ('a0000000-0000-4000-8000-000000000003'::uuid, 'moderator', 'moderator'),
  ('a0000000-0000-4000-8000-000000000004'::uuid, 'player',    'player')
) as v (id, username, role)
where p.id = v.id;
