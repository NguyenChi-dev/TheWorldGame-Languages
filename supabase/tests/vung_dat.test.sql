-- Test quyền và quy tắc của Vùng đất (lands) / Khu vực (areas):
--   - editor tạo, sửa, bật/tắt, đổi thứ tự được vùng đất và khu vực.
--   - moderator và player KHÔNG ghi được (RLS chặn ở database, không chỉ ẩn nút).
--   - player / khách chỉ đọc được vùng đất và khu vực đang bật.
--   - Không xóa được dòng nào trong lands và areas.
--   - Đảo ngược thứ tự khu vực không bị lỗi trùng unlock_order; trùng thật thì bị chặn.
-- Chạy: pnpm supabase test db   (mọi thay đổi bị rollback cuối file)
begin;
create extension if not exists pgtap with schema extensions;
select plan(36);

-- Không phụ thuộc công tắc 2 lớp đang bật hay tắt trên database đang chạy.
update public.admin_settings set require_mfa = true;

insert into auth.users (id, email) values
  ('9a000000-0000-4000-8000-000000000001', 'vd-editor@lw.test'),
  ('9a000000-0000-4000-8000-000000000002', 'vd-moderator@lw.test'),
  ('9a000000-0000-4000-8000-000000000003', 'vd-player@lw.test');
update public.profiles set role = 'editor'    where id = '9a000000-0000-4000-8000-000000000001';
update public.profiles set role = 'moderator' where id = '9a000000-0000-4000-8000-000000000002';

-- L1 đang bật (3 khu vực, khu thứ 3 đang tắt), L2 đang tắt.
insert into public.lands (id, slug, language_code, name, sort_order, is_active) values
  ('9b000000-0000-4000-8000-000000000001', 'vd-mot', 'xa', 'Vùng một', 10, true),
  ('9b000000-0000-4000-8000-000000000002', 'vd-hai', 'xb', 'Vùng hai', 11, false);
insert into public.areas (id, land_id, name, scene, skill_id, unlock_order, is_active) values
  ('9c000000-0000-4000-8000-000000000001', '9b000000-0000-4000-8000-000000000001', 'Khu A', 'farm',   (select id from public.skills where name = 'Từ vựng'), 0, true),
  ('9c000000-0000-4000-8000-000000000002', '9b000000-0000-4000-8000-000000000001', 'Khu B', 'cinema', (select id from public.skills where name = 'Nghe'),  1, true),
  ('9c000000-0000-4000-8000-000000000003', '9b000000-0000-4000-8000-000000000001', 'Khu C', 'park',   (select id from public.skills where name = 'Hội thoại nhóm'), 2, false);

select col_type_is('public', 'lands', 'id', 'uuid', 'lands.id là uuid');
select col_is_unique('public', 'lands', 'slug', 'slug không trùng');
select col_default_is('public', 'lands', 'is_active', 'false', 'vùng đất mới mặc định đang tắt');


-- ================================================================= editor (đã qua 2 lớp)
select set_config('request.jwt.claims',
  '{"sub":"9a000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}', true);
set local role authenticated;

select lives_ok(
  $$ insert into public.lands (id, slug, language_code, name) values
     ('9b000000-0000-4000-8000-000000000003', 'vd-ba', 'xc', 'Vùng ba') $$,
  'editor tạo được vùng đất');
select throws_ok(
  $$ insert into public.lands (slug, language_code, name) values ('vd-ba', 'xd', 'Trùng slug') $$,
  '23505', null, 'trùng slug bị chặn');
select throws_ok(
  $$ insert into public.lands (slug, language_code, name) values ('Có Dấu', 'xe', 'Slug sai') $$,
  '23514', null, 'slug sai định dạng bị chặn');
select lives_ok(
  $$ update public.lands set name = 'Vùng một (sửa)' where id = '9b000000-0000-4000-8000-000000000001' $$,
  'editor sửa được vùng đất');
select lives_ok(
  $$ update public.lands set is_active = true where id = '9b000000-0000-4000-8000-000000000002' $$,
  'editor bật được vùng đất');
select lives_ok(
  $$ select public.reorder_lands(array['9b000000-0000-4000-8000-000000000002',
                                       '9b000000-0000-4000-8000-000000000001']::uuid[]) $$,
  'editor đổi thứ tự vùng đất');
select lives_ok(
  $$ insert into public.areas (land_id, name, scene, skill_id, unlock_order) values
     ('9b000000-0000-4000-8000-000000000002', 'Khu mới', 'cafe', (select id from public.skills where name = 'Hội thoại'), 0) $$,
  'editor tạo được khu vực');
select lives_ok(
  $$ update public.areas set is_active = true where id = '9c000000-0000-4000-8000-000000000003' $$,
  'editor bật được khu vực');
select lives_ok(
  $$ select public.reorder_areas('9b000000-0000-4000-8000-000000000001',
       array['9c000000-0000-4000-8000-000000000003',
             '9c000000-0000-4000-8000-000000000002',
             '9c000000-0000-4000-8000-000000000001']::uuid[]) $$,
  'editor đảo ngược thứ tự khu vực');
-- Ép kiểm tra ràng buộc DEFERRABLE ngay (bình thường kiểm tra lúc COMMIT).
select lives_ok($$ set constraints public.areas_land_order_key immediate $$,
  'đảo ngược thứ tự không bị lỗi trùng unlock_order');
set constraints public.areas_land_order_key deferred;
-- Từ migration *_media_xoa_vung_dat: chỉ admin xóa được (RLS); editor chạy DELETE thì không dòng nào bị xóa.
select lives_ok($$ delete from public.lands where id = '9b000000-0000-4000-8000-000000000003' $$,
  'editor chạy DELETE vùng đất không lỗi nhưng...');
-- Từ migration *_xoa_khu_vuc: khu vực cũng chỉ admin xóa được (RLS).
select lives_ok($$ delete from public.areas where id = '9c000000-0000-4000-8000-000000000001' $$,
  'editor chạy DELETE khu vực không lỗi nhưng...');
reset role;

select is((select count(*)::int from public.areas where id = '9c000000-0000-4000-8000-000000000001'), 1,
  '...RLS chặn: editor không xóa được khu vực');

select is((select count(*)::int from public.lands where id = '9b000000-0000-4000-8000-000000000003'), 1,
  '...RLS chặn: editor không xóa được vùng đất');
select results_eq(
  $$ select name, sort_order, is_active from public.lands
     where id in ('9b000000-0000-4000-8000-000000000001', '9b000000-0000-4000-8000-000000000002') order by sort_order $$,
  $$ values ('Vùng hai'::text, 0, true), ('Vùng một (sửa)'::text, 1, true) $$,
  'tên, trạng thái và thứ tự vùng đất đã đổi');
select results_eq(
  $$ select name, unlock_order from public.areas
     where land_id = '9b000000-0000-4000-8000-000000000001' order by unlock_order $$,
  $$ values ('Khu C'::text, 0), ('Khu B'::text, 1), ('Khu A'::text, 2) $$,
  'thứ tự khu vực đã đảo ngược');
-- Trùng thứ tự thật thì vẫn bị chặn.
update public.areas set unlock_order = 0 where id = '9c000000-0000-4000-8000-000000000001';
select throws_ok($$ set constraints public.areas_land_order_key immediate $$,
  '23505', null, 'hai khu vực cùng unlock_order trong một vùng bị chặn');
set constraints public.areas_land_order_key deferred;
update public.areas set unlock_order = 2 where id = '9c000000-0000-4000-8000-000000000001';

-- Trả trạng thái về như ban đầu cho các phần dưới: L2 tắt, khu C tắt.
update public.lands set is_active = false where id = '9b000000-0000-4000-8000-000000000002';
update public.areas set is_active = false where id = '9c000000-0000-4000-8000-000000000003';


-- ================================================================= moderator
select set_config('request.jwt.claims',
  '{"sub":"9a000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal2"}', true);
set local role authenticated;
select is((select count(*)::int from public.lands where slug like 'vd-%'), 3, 'moderator thấy cả vùng đang tắt');
select throws_ok(
  $$ insert into public.lands (slug, language_code, name) values ('vd-mod', 'xf', 'Của moderator') $$,
  '42501', null, 'moderator không tạo được vùng đất');
select throws_ok(
  $$ insert into public.areas (land_id, name, scene, skill_id, unlock_order) values
     ('9b000000-0000-4000-8000-000000000001', 'Khu moderator', 'cafe', (select id from public.skills where name = 'Đọc'), 9) $$,
  '42501', null, 'moderator không tạo được khu vực');
select lives_ok($$ update public.lands set name = 'Moderator sửa' where id = '9b000000-0000-4000-8000-000000000001' $$,
  'moderator chạy UPDATE vùng đất không lỗi nhưng...');
select lives_ok($$ update public.areas set is_active = false where id = '9c000000-0000-4000-8000-000000000001' $$,
  'moderator chạy UPDATE khu vực không lỗi nhưng...');
select lives_ok($$ select public.reorder_lands(array['9b000000-0000-4000-8000-000000000001']::uuid[]) $$,
  'moderator gọi reorder_lands không lỗi nhưng...');
reset role;
select results_eq(
  $$ select name, sort_order from public.lands where id = '9b000000-0000-4000-8000-000000000001' $$,
  $$ values ('Vùng một (sửa)'::text, 1) $$,
  '...RLS chặn: vùng đất của moderator không đổi');
select is((select is_active from public.areas where id = '9c000000-0000-4000-8000-000000000001'), true,
  '...RLS chặn: khu vực không bị moderator tắt');


-- ================================================================= player
select set_config('request.jwt.claims',
  '{"sub":"9a000000-0000-4000-8000-000000000003","role":"authenticated","aal":"aal2"}', true);
set local role authenticated;
select is((select count(*)::int from public.lands where slug like 'vd-%'), 1, 'player chỉ thấy vùng đang bật');
select is((select count(*)::int from public.areas where land_id = '9b000000-0000-4000-8000-000000000001'), 2,
  'player chỉ thấy khu vực đang bật');
select throws_ok(
  $$ insert into public.lands (slug, language_code, name) values ('vd-player', 'xg', 'Của player') $$,
  '42501', null, 'player không tạo được vùng đất');
select lives_ok($$ update public.areas set name = 'Player sửa' where id = '9c000000-0000-4000-8000-000000000001' $$,
  'player chạy UPDATE khu vực không lỗi nhưng...');
select lives_ok(
  $$ select public.reorder_areas('9b000000-0000-4000-8000-000000000001',
       array['9c000000-0000-4000-8000-000000000001']::uuid[]) $$,
  'player gọi reorder_areas không lỗi nhưng...');
reset role;
select results_eq(
  $$ select name, unlock_order from public.areas where id = '9c000000-0000-4000-8000-000000000001' $$,
  $$ values ('Khu A'::text, 2) $$,
  '...RLS chặn: khu vực không đổi');


-- ================================================================= khách (anon)
set local role anon;
select is((select count(*)::int from public.lands where slug like 'vd-%'), 1, 'khách chỉ thấy vùng đang bật');
select throws_ok($$ select public.reorder_lands(array[]::uuid[]) $$, '42501', null, 'khách không gọi được reorder');
reset role;

select * from finish();
rollback;
