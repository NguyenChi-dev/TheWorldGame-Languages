-- Test: bảng media (ảnh Cloudinary) và chức năng XÓA vùng đất.
--   - Ai cũng đọc được media; chỉ admin/editor thêm được; người chơi không.
--   - Xóa media thì ảnh bìa của vùng đất tự về null.
--   - Chỉ admin xóa được vùng đất, và chỉ khi vùng đất không còn khu vực (RESTRICT).
-- Chạy: pnpm supabase test db   (mọi thay đổi bị rollback cuối file)
begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

update public.admin_settings set require_mfa = true;

insert into auth.users (id, email) values
  ('8a000000-0000-4000-8000-000000000001', 'mx-admin@lw.test'),
  ('8a000000-0000-4000-8000-000000000002', 'mx-editor@lw.test'),
  ('8a000000-0000-4000-8000-000000000003', 'mx-player@lw.test');
update public.profiles set role = 'admin'  where id = '8a000000-0000-4000-8000-000000000001';
update public.profiles set role = 'editor' where id = '8a000000-0000-4000-8000-000000000002';

insert into public.lands (id, slug, language_code, name) values
  ('8b000000-0000-4000-8000-000000000001', 'mx-trong',   'qa', 'Vùng trống'),
  ('8b000000-0000-4000-8000-000000000002', 'mx-co-khu',  'qb', 'Vùng có khu vực');
insert into public.areas (land_id, name, scene, skill_id, unlock_order) values
  ('8b000000-0000-4000-8000-000000000002', 'Khu', 'farm', (select id from public.skills where name = 'Từ vựng'), 0);


-- ================================================================= editor: thêm media, gắn làm ảnh bìa
select set_config('request.jwt.claims',
  '{"sub":"8a000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal2"}', true);
set local role authenticated;
select lives_ok(
  $$ insert into public.media (id, public_id, secure_url, width, height) values
     ('8c000000-0000-4000-8000-000000000001', 'language-world/lands/mx', 'https://res.cloudinary.com/x/image/upload/v1/language-world/lands/mx.png', 10, 10) $$,
  'editor thêm được media');
select throws_ok(
  $$ insert into public.media (public_id, secure_url) values ('lạ', 'https://trang-la.example/a.png') $$,
  '23514', null, 'URL ngoài Cloudinary bị chặn');
select lives_ok(
  $$ update public.lands set cover_media_id = '8c000000-0000-4000-8000-000000000001'
     where id = '8b000000-0000-4000-8000-000000000001' $$,
  'editor gắn ảnh bìa cho vùng đất');
select throws_ok(
  $$ update public.lands set cover_media_id = '8c000000-0000-4000-8000-0000000000ff'
     where id = '8b000000-0000-4000-8000-000000000001' $$,
  '23503', null, 'không gắn được mã ảnh không tồn tại');
reset role;

-- ================================================================= player, khách
select set_config('request.jwt.claims',
  '{"sub":"8a000000-0000-4000-8000-000000000003","role":"authenticated","aal":"aal2"}', true);
set local role authenticated;
select throws_ok(
  $$ insert into public.media (public_id, secure_url) values ('p', 'https://res.cloudinary.com/x/p.png') $$,
  '42501', null, 'người chơi không thêm được media');
reset role;
set local role anon;
select is((select count(*)::int from public.media where public_id = 'language-world/lands/mx'), 1,
  'khách đọc được thông tin media (ảnh công khai)');
reset role;

-- ================================================================= xóa vùng đất
-- editor: không xóa được (RLS chỉ cho admin).
select set_config('request.jwt.claims',
  '{"sub":"8a000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal2"}', true);
set local role authenticated;
select lives_ok($$ delete from public.lands where id = '8b000000-0000-4000-8000-000000000001' $$,
  'editor chạy DELETE không lỗi nhưng...');
reset role;
select is((select count(*)::int from public.lands where id = '8b000000-0000-4000-8000-000000000001'), 1,
  '...vùng đất vẫn còn');

-- admin
select set_config('request.jwt.claims',
  '{"sub":"8a000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}', true);
set local role authenticated;
select throws_ok($$ delete from public.lands where id = '8b000000-0000-4000-8000-000000000002' $$,
  '23503', null, 'admin không xóa được vùng đất còn khu vực');
select lives_ok($$ delete from public.lands where id = '8b000000-0000-4000-8000-000000000001' $$,
  'admin xóa được vùng đất trống');
-- Xóa media: ảnh bìa (nếu còn vùng nào dùng) tự về null, không lỗi.
select lives_ok($$ delete from public.media where id = '8c000000-0000-4000-8000-000000000001' $$,
  'admin xóa được media');
reset role;
select is((select count(*)::int from public.lands where id = '8b000000-0000-4000-8000-000000000001'), 0,
  'vùng đất trống đã bị xóa');
select is((select count(*)::int from public.media where id = '8c000000-0000-4000-8000-000000000001'), 0,
  'media đã bị xóa');

select * from finish();
rollback;
