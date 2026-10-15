-- Test: admin_logs chỉ được thêm và đọc, KHÔNG ai sửa/xóa được (kể cả service_role và chủ bảng).
-- Chạy: pnpm supabase test db   (cần Supabase local đang chạy)
begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

-- Test không phụ thuộc công tắc 2 lớp đang bật hay tắt trên database đang chạy (rollback cuối test).
update public.admin_settings set require_mfa = true;

-- Người dùng riêng cho test (không phụ thuộc dữ liệu có sẵn).
insert into auth.users (id, email) values
  ('b0000000-0000-4000-8000-000000000001', 'test-admin@lw.test'),
  ('b0000000-0000-4000-8000-000000000002', 'test-editor@lw.test'),
  ('b0000000-0000-4000-8000-000000000004', 'test-player@lw.test');
-- Hồ sơ do trigger on_auth_user_created tạo (vai trò 'player'); cấp vai trò cho test.
update public.profiles set role = 'admin'  where id = 'b0000000-0000-4000-8000-000000000001';
update public.profiles set role = 'editor' where id = 'b0000000-0000-4000-8000-000000000002';


-- ---------------------------------------------------------------- admin, đã qua 2 lớp
select set_config('request.jwt.claims',
  '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}', true);
set local role authenticated;

select lives_ok(
  $$ insert into public.admin_logs (actor_id, actor_role, action, target_table)
     values ('b0000000-0000-4000-8000-000000000001', 'admin', 'test.admin', 'profiles') $$,
  'admin (aal2) ghi được nhật ký của mình');

select is((select count(*)::int from public.admin_logs where action like 'test.%'), 1,
  'admin đọc được nhật ký');

select throws_ok(
  $$ insert into public.admin_logs (actor_id, actor_role, action, target_table)
     values ('b0000000-0000-4000-8000-000000000002', 'editor', 'test.fake', 'profiles') $$,
  '42501', null, 'không ghi được nhật ký dưới tên người khác');

select throws_ok($$ update public.admin_logs set reason = 'sửa' $$, '42501', null,
  'admin không UPDATE được');
select throws_ok($$ delete from public.admin_logs $$, '42501', null,
  'admin không DELETE được');


-- ---------------------------------------------------------------- admin, mới nhập mật khẩu
select set_config('request.jwt.claims',
  '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}', true);

select throws_ok(
  $$ insert into public.admin_logs (actor_id, actor_role, action, target_table)
     values ('b0000000-0000-4000-8000-000000000001', 'admin', 'test.aal1', 'profiles') $$,
  '42501', null, 'admin chưa qua 2 lớp (aal1) không ghi được');


-- ---------------------------------------------------------------- editor
select set_config('request.jwt.claims',
  '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal2"}', true);

select lives_ok(
  $$ insert into public.admin_logs (actor_id, actor_role, action, target_table)
     values ('b0000000-0000-4000-8000-000000000002', 'editor', 'test.editor', 'words') $$,
  'editor ghi được nhật ký của mình');

select throws_ok(
  $$ insert into public.admin_logs (actor_id, actor_role, action, target_table)
     values ('b0000000-0000-4000-8000-000000000002', 'admin', 'test.fake_role', 'words') $$,
  '42501', null, 'không khai man vai trò trong nhật ký');

select is((select count(*)::int from public.admin_logs), 0,
  'editor không đọc được nhật ký');


-- ---------------------------------------------------------------- player
select set_config('request.jwt.claims',
  '{"sub":"b0000000-0000-4000-8000-000000000004","role":"authenticated","aal":"aal2"}', true);

select throws_ok(
  $$ insert into public.admin_logs (actor_id, actor_role, action, target_table)
     values ('b0000000-0000-4000-8000-000000000004', 'player', 'test.player', 'profiles') $$,
  '42501', null, 'người chơi không ghi được nhật ký');


-- ---------------------------------------------------------------- service_role (khóa bí mật)
reset role;
set local role service_role;

select throws_ok($$ update public.admin_logs set reason = 'sửa' $$, '42501', null,
  'service_role không UPDATE được');
select throws_ok($$ delete from public.admin_logs $$, '42501', null,
  'service_role không DELETE được');


-- ---------------------------------------------------------------- postgres (chủ bảng, bỏ qua RLS và GRANT)
reset role;

select throws_ok($$ update public.admin_logs set reason = 'sửa' $$, '42501',
  'admin_logs chỉ được thêm mới, không được UPDATE', 'chủ bảng UPDATE bị trigger chặn');
select throws_ok($$ update public.admin_logs set reason = 'sửa' where false $$, '42501',
  'admin_logs chỉ được thêm mới, không được UPDATE', 'UPDATE không khớp dòng nào cũng bị chặn');
select throws_ok($$ delete from public.admin_logs $$, '42501',
  'admin_logs chỉ được thêm mới, không được DELETE', 'chủ bảng DELETE bị trigger chặn');
select throws_ok($$ truncate public.admin_logs $$, '42501',
  'admin_logs chỉ được thêm mới, không được TRUNCATE', 'chủ bảng TRUNCATE bị trigger chặn');

select is((select count(*)::int from public.admin_logs where action like 'test.%'), 2,
  'nhật ký vẫn còn nguyên 2 dòng');

select * from finish();
rollback;
