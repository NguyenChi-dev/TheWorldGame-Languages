-- Test: profiles.role là enum, mặc định 'player', chỉ admin (đã qua 2 lớp) đổi được vai trò người KHÁC.
-- Chạy: pnpm supabase test db   (cần Supabase local đang chạy)
begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

-- Test không phụ thuộc công tắc 2 lớp đang bật hay tắt trên database đang chạy (rollback cuối test).
update public.admin_settings set require_mfa = true;

insert into auth.users (id, email) values
  ('c0000000-0000-4000-8000-000000000001', 'role-admin@lw.test'),
  ('c0000000-0000-4000-8000-000000000002', 'role-editor@lw.test'),
  ('c0000000-0000-4000-8000-000000000003', 'role-moderator@lw.test'),
  ('c0000000-0000-4000-8000-000000000004', 'role-player@lw.test');
-- Hồ sơ do trigger on_auth_user_created tạo (vai trò 'player'); c...04 giữ nguyên mặc định.
update public.profiles set role = 'admin'     where id = 'c0000000-0000-4000-8000-000000000001';
update public.profiles set role = 'editor'    where id = 'c0000000-0000-4000-8000-000000000002';
update public.profiles set role = 'moderator' where id = 'c0000000-0000-4000-8000-000000000003';

select col_type_is('public', 'profiles', 'role', 'user_role', 'profiles.role có kiểu enum user_role');
select is((select role::text from public.profiles where id = 'c0000000-0000-4000-8000-000000000004'),
  'player', 'vai trò mặc định là player');
select throws_ok(
  $$ update public.profiles set role = 'superadmin' where id = 'c0000000-0000-4000-8000-000000000004' $$,
  '22P02', null, 'vai trò không có trong enum bị từ chối');


-- ---------------------------------------------------------------- editor
select set_config('request.jwt.claims',
  '{"sub":"c0000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal2"}', true);
set local role authenticated;
select lives_ok($$ update public.profiles set role = 'admin' where id = 'c0000000-0000-4000-8000-000000000004' $$,
  'editor chạy UPDATE không lỗi nhưng...');
select lives_ok($$ update public.profiles set role = 'admin' where id = 'c0000000-0000-4000-8000-000000000002' $$,
  'editor tự nâng quyền không lỗi nhưng...');
reset role;
select is((select role::text from public.profiles where id = 'c0000000-0000-4000-8000-000000000004'),
  'player', '...editor không đổi được vai trò người khác');
select is((select role::text from public.profiles where id = 'c0000000-0000-4000-8000-000000000002'),
  'editor', '...editor không tự nâng quyền được');


-- ---------------------------------------------------------------- moderator
select set_config('request.jwt.claims',
  '{"sub":"c0000000-0000-4000-8000-000000000003","role":"authenticated","aal":"aal2"}', true);
set local role authenticated;
select lives_ok($$ update public.profiles set role = 'admin' where id = 'c0000000-0000-4000-8000-000000000004' $$,
  'moderator chạy UPDATE không lỗi nhưng...');
select is((select count(*)::int from public.profiles where id::text like 'c0000000-%'), 4,
  'moderator đọc được mọi hồ sơ');
reset role;
select is((select role::text from public.profiles where id = 'c0000000-0000-4000-8000-000000000004'),
  'player', '...moderator không đổi được vai trò');


-- ---------------------------------------------------------------- player
select set_config('request.jwt.claims',
  '{"sub":"c0000000-0000-4000-8000-000000000004","role":"authenticated","aal":"aal2"}', true);
set local role authenticated;
select lives_ok($$ update public.profiles set role = 'admin' where id = 'c0000000-0000-4000-8000-000000000004' $$,
  'người chơi chạy UPDATE không lỗi nhưng...');
reset role;
select is((select role::text from public.profiles where id = 'c0000000-0000-4000-8000-000000000004'),
  'player', '...người chơi không tự nâng quyền được');


-- ---------------------------------------------------------------- admin mới nhập mật khẩu (aal1)
select set_config('request.jwt.claims',
  '{"sub":"c0000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}', true);
set local role authenticated;
select lives_ok($$ update public.profiles set role = 'editor' where id = 'c0000000-0000-4000-8000-000000000004' $$,
  'admin aal1 chạy UPDATE không lỗi nhưng...');
reset role;
select is((select role::text from public.profiles where id = 'c0000000-0000-4000-8000-000000000004'),
  'player', '...admin chưa qua 2 lớp không đổi được vai trò');


-- ---------------------------------------------------------------- admin đã qua 2 lớp
select set_config('request.jwt.claims',
  '{"sub":"c0000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}', true);
set local role authenticated;
select throws_ok($$ update public.profiles set username = 'doi-ten' where id = 'c0000000-0000-4000-8000-000000000004' $$,
  '42501', null, 'admin không sửa được cột khác ngoài role (ví dụ username)');
select lives_ok($$ update public.profiles set role = 'player' where id = 'c0000000-0000-4000-8000-000000000001' $$,
  'admin tự đổi vai trò không lỗi nhưng...');
select lives_ok($$ update public.profiles set role = 'moderator' where id = 'c0000000-0000-4000-8000-000000000004' $$,
  'admin đổi vai trò người khác');
reset role;
select is((select role::text from public.profiles where id = 'c0000000-0000-4000-8000-000000000001'),
  'admin', '...admin không tự đổi vai trò của mình được');
select is((select role::text from public.profiles where id = 'c0000000-0000-4000-8000-000000000004'),
  'moderator', 'admin (aal2) đổi được vai trò người khác');

select * from finish();
rollback;
