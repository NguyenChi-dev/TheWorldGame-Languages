-- Test: cột profiles.land_id (màn chọn vùng đất).
-- Chạy: pnpm supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

insert into auth.users (id, email, raw_user_meta_data) values
  ('f0000000-0000-4000-8000-000000000001', 'vd-1@lw.test', '{"username":"Chọn_Vùng"}');
insert into public.lands (id, slug, name, language_code, is_active) values
  ('f1000000-0000-4000-8000-000000000001', 'vung-thu', 'Vùng thử', 'zz', true);

select is((select land_id from public.profiles where id = 'f0000000-0000-4000-8000-000000000001'), null,
  'tài khoản mới chưa chọn vùng đất');

update public.profiles set land_id = 'f1000000-0000-4000-8000-000000000001'
  where id = 'f0000000-0000-4000-8000-000000000001';
select is((select land_id from public.profiles where id = 'f0000000-0000-4000-8000-000000000001'),
  'f1000000-0000-4000-8000-000000000001'::uuid, 'lưu được vùng đất đã chọn');

select throws_ok(
  $$update public.profiles set land_id = 'f1000000-0000-4000-8000-0000000000ff'
    where id = 'f0000000-0000-4000-8000-000000000001'$$,
  '23503', null, 'vùng đất không tồn tại bị chặn');

-- Người chơi đăng nhập (trình duyệt) không tự sửa thẳng được cột này.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"f0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select throws_ok(
  $$update public.profiles set land_id = null where id = 'f0000000-0000-4000-8000-000000000001'$$,
  '42501', null, 'trình duyệt không có quyền UPDATE land_id');
reset role;

delete from public.lands where id = 'f1000000-0000-4000-8000-000000000001';
select is((select land_id from public.profiles where id = 'f0000000-0000-4000-8000-000000000001'), null,
  'xóa vùng đất: người chơi ở đó về "chưa chọn"');

select * from finish();
rollback;
