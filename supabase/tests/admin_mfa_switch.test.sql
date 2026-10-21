-- Test: công tắc admin_settings.require_mfa điều khiển việc RLS có đòi xác thực hai lớp (aal2) hay không.
-- Chạy: pnpm supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

-- Bắt đầu từ trạng thái mặc định (BẬT), bất kể database đang chạy bật hay tắt. Tất cả bị rollback cuối test.
update public.admin_settings set require_mfa = true;

insert into auth.users (id, email) values
  ('e0000000-0000-4000-8000-000000000001', 'mfa-admin@lw.test'),
  ('e0000000-0000-4000-8000-000000000002', 'mfa-player@lw.test');
update public.profiles set role = 'admin' where id = 'e0000000-0000-4000-8000-000000000001';

select is(public.admin_mfa_required(), true, 'công tắc bật: bắt buộc xác thực hai lớp');

-- ---------------------------------------------------------------- công tắc BẬT: admin aal1 bị chặn
select set_config('request.jwt.claims',
  '{"sub":"e0000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}', true);
set local role authenticated;
select is(public.has_staff_role('{admin}'), false, 'bật: admin aal1 không qua has_staff_role');
select throws_ok($$ update public.admin_settings set require_mfa = false $$, '42501', null,
  'người dùng không tự tắt được công tắc');
reset role;

-- ---------------------------------------------------------------- công tắc TẮT
-- Vào trang quản trị bằng aal1 được, nhưng đổi vai trò là thao tác nhạy cảm: LUÔN cần aal2 (0009).
update public.admin_settings set require_mfa = false;
select is(public.admin_mfa_required(), false, 'tắt công tắc');

select set_config('request.jwt.claims',
  '{"sub":"e0000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}', true);
set local role authenticated;
select is(public.has_staff_role('{admin}'), true, 'tắt: admin aal1 qua has_staff_role (xem được trang quản trị)');
select lives_ok($$ update public.profiles set role = 'editor' where id = 'e0000000-0000-4000-8000-000000000002' $$,
  'tắt: admin aal1 chạy UPDATE vai trò (không lỗi, nhưng RLS lọc hết dòng)');
reset role;
select is((select role::text from public.profiles where id = 'e0000000-0000-4000-8000-000000000002'), 'player',
  'tắt: admin aal1 KHÔNG đổi được vai trò (thao tác nhạy cảm luôn cần aal2)');

select set_config('request.jwt.claims',
  '{"sub":"e0000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}', true);
set local role authenticated;
update public.profiles set role = 'editor' where id = 'e0000000-0000-4000-8000-000000000002';
reset role;
select is((select role::text from public.profiles where id = 'e0000000-0000-4000-8000-000000000002'), 'editor',
  'tắt: admin aal2 đổi được vai trò');

select * from finish();
rollback;
