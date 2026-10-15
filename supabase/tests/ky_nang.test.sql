-- Test: bảng skills (kỹ năng luyện tập).
--   - Có sẵn 8 kỹ năng chuyển từ danh sách cũ.
--   - Khách / người chơi đọc được, không ghi được.
--   - editor thêm, sửa, đổi thứ tự được; không xóa được (chỉ admin).
--   - Tên không trùng (không phân biệt hoa thường); icon / màu đúng định dạng.
--   - Kỹ năng đang được khu vực dùng thì không xóa được (RESTRICT).
-- Chạy: pnpm supabase test db   (mọi thay đổi bị rollback cuối file)
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

update public.admin_settings set require_mfa = true;

insert into auth.users (id, email) values
  ('6a000000-0000-4000-8000-000000000001', 'kn-admin@lw.test'),
  ('6a000000-0000-4000-8000-000000000002', 'kn-editor@lw.test'),
  ('6a000000-0000-4000-8000-000000000003', 'kn-player@lw.test');
update public.profiles set role = 'admin'  where id = '6a000000-0000-4000-8000-000000000001';
update public.profiles set role = 'editor' where id = '6a000000-0000-4000-8000-000000000002';

insert into public.lands (id, slug, language_code, name) values
  ('6b000000-0000-4000-8000-000000000001', 'kn-vung', 'kn', 'Vùng thử kỹ năng');
insert into public.skills (id, name, sort_order) values
  ('6c000000-0000-4000-8000-000000000001', 'Kỹ năng đang dùng', 100),
  ('6c000000-0000-4000-8000-000000000002', 'Kỹ năng trống', 101);
insert into public.areas (land_id, name, scene, skill_id, unlock_order) values
  ('6b000000-0000-4000-8000-000000000001', 'Khu', 'farm', '6c000000-0000-4000-8000-000000000001', 0);

select ok((select count(*) from public.skills where name in
  ('Từ vựng', 'Nghe', 'Hội thoại', 'Đọc', 'Viết', 'Ngữ pháp', 'Hỏi đường', 'Hội thoại nhóm')) = 8,
  'có sẵn 8 kỹ năng chuyển từ danh sách cũ');
select hasnt_column('public', 'areas', 'skill', 'areas không còn cột enum skill');


-- ================================================================= khách, người chơi
set local role anon;
select ok((select count(*) from public.skills) >= 10, 'khách đọc được kỹ năng');
select throws_ok($$ insert into public.skills (name) values ('Khách') $$, '42501', null, 'khách không thêm được');
reset role;

select set_config('request.jwt.claims',
  '{"sub":"6a000000-0000-4000-8000-000000000003","role":"authenticated","aal":"aal2"}', true);
set local role authenticated;
select throws_ok($$ insert into public.skills (name) values ('Người chơi') $$, '42501', null, 'người chơi không thêm được');
reset role;


-- ================================================================= editor
select set_config('request.jwt.claims',
  '{"sub":"6a000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal2"}', true);
set local role authenticated;
select lives_ok($$ insert into public.skills (name, description, icon, color) values ('Phát âm', 'Nói theo mẫu', 'microphone', 'rose') $$,
  'editor thêm được kỹ năng');
select throws_ok($$ insert into public.skills (name) values ('phát âm') $$, '23505', null, 'trùng tên (khác hoa thường) bị chặn');
select throws_ok($$ insert into public.skills (name, icon) values ('Icon sai', 'Có Dấu') $$, '23514', null, 'icon sai định dạng bị chặn');
select throws_ok($$ insert into public.skills (name) values ('   ') $$, '23514', null, 'tên rỗng bị chặn');
select lives_ok($$ update public.skills set name = 'Phát âm chuẩn' where name = 'Phát âm' $$, 'editor sửa được');
select lives_ok($$ select public.reorder_skills(array['6c000000-0000-4000-8000-000000000002',
                                                      '6c000000-0000-4000-8000-000000000001']::uuid[]) $$,
  'editor đổi thứ tự được');
select lives_ok($$ delete from public.skills where id = '6c000000-0000-4000-8000-000000000002' $$,
  'editor chạy DELETE không lỗi nhưng...');
reset role;
select is((select count(*)::int from public.skills where id = '6c000000-0000-4000-8000-000000000002'), 1,
  '...kỹ năng vẫn còn (chỉ admin xóa được)');


-- ================================================================= admin
select set_config('request.jwt.claims',
  '{"sub":"6a000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}', true);
set local role authenticated;
select throws_ok($$ delete from public.skills where id = '6c000000-0000-4000-8000-000000000001' $$,
  '23503', null, 'kỹ năng đang được khu vực dùng thì không xóa được');
select lives_ok($$ delete from public.skills where id = '6c000000-0000-4000-8000-000000000002' $$,
  'admin xóa được kỹ năng không ai dùng');
reset role;
select is((select count(*)::int from public.skills where id = '6c000000-0000-4000-8000-000000000002'), 0,
  'kỹ năng đã bị xóa');

select * from finish();
rollback;
