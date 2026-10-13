-- Test: công tắc admin_settings.require_mfa điều khiển việc RLS có đòi xác thực hai lớp (aal2) hay không.
-- Chạy: pnpm supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

insert into auth.users (id, email) values
  ('e0000000-0000-4000-8000-000000000001', 'mfa-admin@lw.test'),
  ('e0000000-0000-4000-8000-000000000002', 'mfa-player@lw.test');
update public.profiles set role = 'admin' where id = 'e0000000-0000-4000-8000-000000000001';

select is(public.admin_mfa_required(), true, 'mặc định bắt buộc xác thực hai lớp');

-- ---------------------------------------------------------------- công tắc BẬT: admin aal1 bị chặn
select set_config('request.jwt.claims',
  '{"sub":"e0000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}', true);
set local role authenticated;
select is(public.has_staff_role('{admin}'), false, 'bật: admin aal1 không qua has_staff_role');
select throws_ok($$ update public.admin_settings set require_mfa = false $$, '42501', null,
  'người dùng không tự tắt được công tắc');
reset role;

-- ---------------------------------------------------------------- công tắc TẮT: admin aal1 đổi được vai trò
update public.admin_settings set require_mfa = false;
select is(public.admin_mfa_required(), false, 'tắt công tắc');

select set_config('request.jwt.claims',
  '{"sub":"e0000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}', true);
set local role authenticated;
select is(public.has_staff_role('{admin}'), true, 'tắt: admin aal1 qua has_staff_role');
select lives_ok($$ update public.profiles set role = 'editor' where id = 'e0000000-0000-4000-8000-000000000002' $$,
  'tắt: admin aal1 chạy UPDATE vai trò');
reset role;
select is((select role::text from public.profiles where id = 'e0000000-0000-4000-8000-000000000002'), 'editor',
  'tắt: vai trò đã đổi; vai trò vẫn được kiểm tra như cũ');

select * from finish();
rollback;
