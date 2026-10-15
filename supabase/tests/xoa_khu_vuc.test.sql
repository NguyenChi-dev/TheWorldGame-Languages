-- Test: XÓA khu vực.
--   - Chỉ admin xóa được (editor, người chơi chạy DELETE thì không dòng nào bị xóa).
--   - Admin xóa được khu vực; vùng đất chứa nó vẫn còn.
-- Chạy: pnpm supabase test db   (mọi thay đổi bị rollback cuối file)
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

update public.admin_settings set require_mfa = true;

insert into auth.users (id, email) values
  ('9a000000-0000-4000-8000-000000000001', 'xk-admin@lw.test'),
  ('9a000000-0000-4000-8000-000000000002', 'xk-editor@lw.test'),
  ('9a000000-0000-4000-8000-000000000003', 'xk-player@lw.test');
update public.profiles set role = 'admin'  where id = '9a000000-0000-4000-8000-000000000001';
update public.profiles set role = 'editor' where id = '9a000000-0000-4000-8000-000000000002';

insert into public.lands (id, slug, language_code, name, is_active) values
  ('9b000000-0000-4000-8000-000000000001', 'xk-vung', 'xk', 'Vùng thử xóa khu vực', true);
insert into public.areas (id, land_id, name, scene, skill_id, unlock_order, is_active) values
  ('9c000000-0000-4000-8000-000000000001', '9b000000-0000-4000-8000-000000000001', 'Khu thử', 'farm', (select id from public.skills where name = 'Từ vựng'), 0, true);


-- ================================================================= editor, người chơi: không xóa được
select set_config('request.jwt.claims',
  '{"sub":"9a000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal2"}', true);
set local role authenticated;
select lives_ok($$ delete from public.areas where id = '9c000000-0000-4000-8000-000000000001' $$,
  'editor chạy DELETE không lỗi nhưng...');
reset role;
select is((select count(*)::int from public.areas where id = '9c000000-0000-4000-8000-000000000001'), 1,
  '...khu vực vẫn còn (RLS chỉ cho admin)');

select set_config('request.jwt.claims',
  '{"sub":"9a000000-0000-4000-8000-000000000003","role":"authenticated","aal":"aal2"}', true);
set local role authenticated;
select lives_ok($$ delete from public.areas where id = '9c000000-0000-4000-8000-000000000001' $$,
  'người chơi chạy DELETE không lỗi nhưng...');
reset role;
select is((select count(*)::int from public.areas where id = '9c000000-0000-4000-8000-000000000001'), 1,
  '...khu vực vẫn còn');

-- ================================================================= admin
select set_config('request.jwt.claims',
  '{"sub":"9a000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}', true);
set local role authenticated;
select lives_ok($$ delete from public.areas where id = '9c000000-0000-4000-8000-000000000001' $$,
  'admin xóa được khu vực');
reset role;

select is((select count(*)::int from public.areas where id = '9c000000-0000-4000-8000-000000000001'), 0,
  'khu vực đã bị xóa');
select is((select count(*)::int from public.lands where id = '9b000000-0000-4000-8000-000000000001'), 1,
  'vùng đất chứa khu vực vẫn còn');

select * from finish();
rollback;
