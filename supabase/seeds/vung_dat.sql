-- Dữ liệu mẫu Vùng đất / Khu vực / Bài học. Chạy sau seed.sql (cần từ vựng en-*).
-- Chạy lại nhiều lần không lỗi, nên áp riêng lên dự án THỬ NGHIỆM được (không chạy lại toàn bộ seed.sql).
--
--   Tiếng Anh  (tieng-anh, en, đang bật): Nông trại · Từ vựng, Rạp chiếu phim · Nghe,
--                                         Công viên · Hội thoại nhóm (đều đang bật), mỗi khu vực 1 bài nháp.
--   Tiếng Nhật (tieng-nhat, ja, đang tắt): chưa có khu vực.

insert into public.lands (id, slug, language_code, name, description, sort_order, is_active) values
  ('a17d0000-0000-4000-8000-000000000001', 'tieng-anh', 'en', 'Tiếng Anh',
   'Thế giới tiếng Anh: nông trại, rạp chiếu phim, công viên và thị trấn nhỏ.', 0, true),
  ('a17d0000-0000-4000-8000-000000000002', 'tieng-nhat', 'ja', 'Tiếng Nhật',
   'Thế giới tiếng Nhật: đang chuẩn bị.', 1, false)
on conflict (id) do update set
  slug = excluded.slug,
  language_code = excluded.language_code,
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

insert into public.areas (id, land_id, name, scene, skill, unlock_order, is_active) values
  ('a5ea0000-0000-4000-8000-000000000001', 'a17d0000-0000-4000-8000-000000000001', 'Nông trại',      'farm',   'vocabulary', 1, true),
  ('a5ea0000-0000-4000-8000-000000000002', 'a17d0000-0000-4000-8000-000000000001', 'Rạp chiếu phim', 'cinema', 'listening',  2, true),
  ('a5ea0000-0000-4000-8000-000000000003', 'a17d0000-0000-4000-8000-000000000001', 'Công viên',      'park',   'group_talk', 3, true)
on conflict (id) do update set is_active = true;

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
