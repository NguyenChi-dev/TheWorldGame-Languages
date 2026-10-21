-- Test 0009: thao tác nhạy cảm luôn cần aal2 (kể cả khi công tắc 2 lớp tắt) + hàm set_admin_mfa_required.
-- Chạy: pnpm supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

update public.admin_settings set require_mfa = false;

insert into auth.users (id, email) values
  ('f0000000-0000-4000-8000-000000000001', 'aal-admin@lw.test'),
  ('f0000000-0000-4000-8000-000000000002', 'aal-editor@lw.test'),
  ('f0000000-0000-4000-8000-000000000003', 'aal-player@lw.test');
update public.profiles set role = 'admin' where id = 'f0000000-0000-4000-8000-000000000001';
update public.profiles set role = 'editor' where id = 'f0000000-0000-4000-8000-000000000002';

insert into public.lands (id, slug, name, language_code) values
  ('f1000000-0000-4000-8000-000000000001', 'aal-test-land', 'AAL test', 'zzq');
insert into public.skills (id, name) values ('f2000000-0000-4000-8000-000000000001', 'AAL test skill');

-- ---------------------------------------------------------------- has_aal2
select set_config('request.jwt.claims',
  '{"sub":"f0000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}', true);
set local role authenticated;
select is(public.has_aal2(), false, 'aal1: has_aal2 = false');

-- ---------------------------------------------------------------- admin aal1 (công tắc tắt)
update public.profiles set role = 'editor' where id = 'f0000000-0000-4000-8000-000000000003';
delete from public.lands where id = 'f1000000-0000-4000-8000-000000000001';
delete from public.skills where id = 'f2000000-0000-4000-8000-000000000001';
select is(public.has_staff_role('{admin,editor}'), true, 'aal1 vẫn là nhân viên (sửa nội dung thường được)');
select throws_ok($$ select public.set_admin_mfa_required(true) $$, '42501', null,
  'aal1: không đổi được công tắc 2 lớp');
reset role;
select is((select role::text from public.profiles where id = 'f0000000-0000-4000-8000-000000000003'), 'player',
  'aal1: không đổi được vai trò');
select is((select count(*)::int from public.lands where id = 'f1000000-0000-4000-8000-000000000001'), 1,
  'aal1: không xóa được vùng đất');
select is((select count(*)::int from public.skills where id = 'f2000000-0000-4000-8000-000000000001'), 1,
  'aal1: không xóa được kỹ năng');

-- Sửa nội dung thường không cần aal2 khi công tắc tắt.
select set_config('request.jwt.claims',
  '{"sub":"f0000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}', true);
set local role authenticated;
update public.lands set name = 'AAL sửa' where id = 'f1000000-0000-4000-8000-000000000001';
reset role;
select is((select name from public.lands where id = 'f1000000-0000-4000-8000-000000000001'), 'AAL sửa',
  'aal1: sửa vùng đất vẫn được (không phải thao tác nhạy cảm)');

-- ---------------------------------------------------------------- editor aal2: vẫn đúng vai trò
select set_config('request.jwt.claims',
  '{"sub":"f0000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal2"}', true);
set local role authenticated;
update public.profiles set role = 'admin' where id = 'f0000000-0000-4000-8000-000000000002';
delete from public.lands where id = 'f1000000-0000-4000-8000-000000000001';
select throws_ok($$ select public.set_admin_mfa_required(true) $$, '42501', null,
  'editor aal2: không đổi được công tắc');
reset role;
select is((select role::text from public.profiles where id = 'f0000000-0000-4000-8000-000000000002'), 'editor',
  'editor aal2: không tự nâng lên admin');
select is((select count(*)::int from public.lands where id = 'f1000000-0000-4000-8000-000000000001'), 1,
  'editor aal2: không xóa được vùng đất');

-- ---------------------------------------------------------------- admin aal2
select set_config('request.jwt.claims',
  '{"sub":"f0000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}', true);
set local role authenticated;
update public.profiles set role = 'moderator' where id = 'f0000000-0000-4000-8000-000000000003';
update public.profiles set role = 'player' where id = 'f0000000-0000-4000-8000-000000000001';
delete from public.skills where id = 'f2000000-0000-4000-8000-000000000001';
select is(public.set_admin_mfa_required(true), true, 'admin aal2: bật được công tắc');
reset role;
select is((select role::text from public.profiles where id = 'f0000000-0000-4000-8000-000000000003'), 'moderator',
  'admin aal2: đổi được vai trò người khác');
select is((select role::text from public.profiles where id = 'f0000000-0000-4000-8000-000000000001'), 'admin',
  'admin aal2: vẫn không tự đổi vai trò của mình');
select is((select count(*)::int from public.skills where id = 'f2000000-0000-4000-8000-000000000001'), 0,
  'admin aal2: xóa được kỹ năng');
select is(public.admin_mfa_required(), true, 'công tắc đã bật');
select is(
  (select after ->> 'require_mfa' from public.admin_logs
    where action = 'admin_settings.update_require_mfa' and actor_id = 'f0000000-0000-4000-8000-000000000001'
    order by id desc limit 1),
  'true', 'đổi công tắc có ghi admin_logs');

select * from finish();
rollback;
