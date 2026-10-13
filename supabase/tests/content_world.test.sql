-- Test: vùng đất › khu vực › bài học › từ vựng của bài.
--   - Khách/người chơi chỉ thấy nội dung đang mở và bài đã xuất bản.
--   - admin/editor thấy và sửa được tất cả; moderator, người chơi không sửa được.
--   - Bài học chỉ dùng được từ của chính vùng đất chứa nó.
-- Chạy: pnpm supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

-- Test không phụ thuộc công tắc 2 lớp đang bật hay tắt trên database đang chạy.
update public.admin_settings set require_mfa = true;

insert into auth.users (id, email) values
  ('f0000000-0000-4000-8000-000000000001', 'cw-editor@lw.test'),
  ('f0000000-0000-4000-8000-000000000002', 'cw-moderator@lw.test'),
  ('f0000000-0000-4000-8000-000000000003', 'cw-player@lw.test');
update public.profiles set role = 'editor'    where id = 'f0000000-0000-4000-8000-000000000001';
update public.profiles set role = 'moderator' where id = 'f0000000-0000-4000-8000-000000000002';

-- Dữ liệu riêng cho test: 1 vùng đang mở, 1 vùng tắt, từ của mỗi vùng.
insert into public.lands (id, name, language_code, is_active) values
  ('t1', 'Vùng thử', 'tt', true),
  ('t2', 'Vùng tắt', 'tu', false);
insert into public.words (id, land_id, word, meaning) values
  ('t1-apple', 't1', 'apple', 'táo'),
  ('t2-pear',  't2', 'pear',  'lê');
insert into public.areas (id, land_id, name, scene, skill, is_active) values
  ('fa000000-0000-4000-8000-000000000001', 't1', 'Khu đang mở', 'farm', 'vocabulary', true),
  ('fa000000-0000-4000-8000-000000000002', 't1', 'Khu tắt',     'park', 'group_talk', false);
insert into public.lessons (id, area_id, title, status) values
  ('fb000000-0000-4000-8000-000000000001', 'fa000000-0000-4000-8000-000000000001', 'Bài đã xuất bản', 'published'),
  ('fb000000-0000-4000-8000-000000000002', 'fa000000-0000-4000-8000-000000000001', 'Bài nháp',        'draft');

select col_type_is('public', 'areas', 'skill', 'area_skill', 'areas.skill là enum area_skill');
select col_not_null('public', 'lessons', 'area_id', 'lessons.area_id bắt buộc');

-- ---------------------------------------------------------------- ràng buộc cùng vùng đất
select lives_ok(
  $$ insert into public.lesson_words (lesson_id, word_id, position)
     values ('fb000000-0000-4000-8000-000000000001', 't1-apple', 1) $$,
  'bài học dùng được từ của vùng đất mình');
select throws_ok(
  $$ insert into public.lesson_words (lesson_id, word_id, position)
     values ('fb000000-0000-4000-8000-000000000001', 't2-pear', 2) $$,
  '23514', null, 'không dùng được từ của vùng đất khác');

-- ---------------------------------------------------------------- khách (anon)
set local role anon;
select is((select count(*)::int from public.lands where id in ('t1', 't2')), 1, 'khách chỉ thấy vùng đang mở');
select is((select count(*)::int from public.areas where land_id = 't1'), 1, 'khách chỉ thấy khu vực đang mở');
select is((select count(*)::int from public.lessons where area_id = 'fa000000-0000-4000-8000-000000000001'), 1,
  'khách chỉ thấy bài đã xuất bản');
reset role;

-- ---------------------------------------------------------------- người chơi
select set_config('request.jwt.claims',
  '{"sub":"f0000000-0000-4000-8000-000000000003","role":"authenticated","aal":"aal2"}', true);
set local role authenticated;
select is((select count(*)::int from public.lessons where area_id = 'fa000000-0000-4000-8000-000000000001'), 1,
  'người chơi không thấy bài nháp');
select throws_ok(
  $$ insert into public.areas (land_id, name, scene, skill) values ('t1', 'Khu lạ', 'cafe', 'reading') $$,
  '42501', null, 'người chơi không thêm được khu vực');
reset role;

-- ---------------------------------------------------------------- moderator
select set_config('request.jwt.claims',
  '{"sub":"f0000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal2"}', true);
set local role authenticated;
select throws_ok(
  $$ insert into public.lessons (area_id, title) values ('fa000000-0000-4000-8000-000000000001', 'Bài lạ') $$,
  '42501', null, 'moderator không thêm được bài học');
reset role;

-- ---------------------------------------------------------------- editor chưa qua 2 lớp
select set_config('request.jwt.claims',
  '{"sub":"f0000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}', true);
set local role authenticated;
select throws_ok(
  $$ insert into public.areas (land_id, name, scene, skill) values ('t1', 'Khu aal1', 'cafe', 'reading') $$,
  '42501', null, 'editor chưa qua 2 lớp không thêm được khu vực');
reset role;

-- ---------------------------------------------------------------- editor đã qua 2 lớp
select set_config('request.jwt.claims',
  '{"sub":"f0000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}', true);
set local role authenticated;
select is((select count(*)::int from public.lessons where area_id = 'fa000000-0000-4000-8000-000000000001'), 2,
  'editor thấy cả bài nháp');
select is((select count(*)::int from public.lands where id in ('t1', 't2')), 2, 'editor thấy cả vùng đang tắt');
select lives_ok(
  $$ insert into public.areas (land_id, name, scene, skill) values ('t1', 'Quán cà phê', 'cafe', 'conversation') $$,
  'editor thêm được khu vực');
select lives_ok(
  $$ update public.lessons set status = 'published' where id = 'fb000000-0000-4000-8000-000000000002' $$,
  'editor xuất bản được bài học');
reset role;
select is((select status::text from public.lessons where id = 'fb000000-0000-4000-8000-000000000002'), 'published',
  'bài đã được xuất bản');

select * from finish();
rollback;
