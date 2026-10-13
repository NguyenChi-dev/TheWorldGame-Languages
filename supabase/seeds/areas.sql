-- Dữ liệu mẫu: vùng đất "Tiếng Anh" với 3 khu vực, mỗi khu vực 1 bài học nháp.
-- Chạy sau seed.sql (cần vùng đất 'en' và từ vựng en-*). Chạy lại nhiều lần không lỗi.
-- Áp riêng lên dự án thử nghiệm:  pnpm supabase db query --db-url "<chuỗi kết nối>" --file supabase/seeds/areas.sql

update public.lands
set name = 'Tiếng Anh',
    description = 'Thế giới tiếng Anh: nông trại, rạp chiếu phim, công viên và thị trấn nhỏ.',
    unlock_order = 1
where id = 'en';

insert into public.areas (id, land_id, name, scene, skill, unlock_order) values
  ('a5ea0000-0000-4000-8000-000000000001', 'en', 'Nông trại',      'farm',   'vocabulary', 1),
  ('a5ea0000-0000-4000-8000-000000000002', 'en', 'Rạp chiếu phim', 'cinema', 'listening',  2),
  ('a5ea0000-0000-4000-8000-000000000003', 'en', 'Công viên',      'park',   'group_talk', 3)
on conflict (id) do nothing;

insert into public.lessons (id, area_id, title, status, position) values
  ('ce550000-0000-4000-8000-000000000001', 'a5ea0000-0000-4000-8000-000000000001', 'Rau củ trong nông trại', 'draft', 1),
  ('ce550000-0000-4000-8000-000000000002', 'a5ea0000-0000-4000-8000-000000000002', 'Nghe giới thiệu phim',   'draft', 1),
  ('ce550000-0000-4000-8000-000000000003', 'a5ea0000-0000-4000-8000-000000000003', 'Làm quen ở công viên',   'draft', 1)
on conflict (id) do nothing;

-- Bài ở Nông trại dùng 5 từ rau củ (để tab "Từ vựng" của khu vực có dữ liệu).
insert into public.lesson_words (lesson_id, word_id, position) values
  ('ce550000-0000-4000-8000-000000000001', 'en-carrot', 1),
  ('ce550000-0000-4000-8000-000000000001', 'en-tomato', 2),
  ('ce550000-0000-4000-8000-000000000001', 'en-corn',   3),
  ('ce550000-0000-4000-8000-000000000001', 'en-potato', 4),
  ('ce550000-0000-4000-8000-000000000001', 'en-onion',  5)
on conflict do nothing;
