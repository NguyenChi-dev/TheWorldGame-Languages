-- Dữ liệu mẫu, chạy sau migration khi `supabase db reset` (cần Docker).
-- PHẢI KHỚP với packages/shared:
--   - Từ vựng: packages/shared/src/content/en/vegetables.json
--   - Hạt giống: packages/shared/src/seeds.ts

insert into public.lands (id, name, language_code, description) values
  ('en', 'English Island', 'en', 'Vùng đất tiếng Anh: nông trại và thị trấn nhỏ.');

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
