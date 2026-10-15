-- Test: cột profiles.appearance (màn chọn nhân vật: nam / nữ + phối trang phục).
-- Chạy: pnpm supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (id, email, raw_user_meta_data) values
  ('e0000000-0000-4000-8000-000000000001', 'nv-1@lw.test', '{"username":"Nhân_Vật"}');

select is((select appearance from public.profiles where id = 'e0000000-0000-4000-8000-000000000001'), null,
  'tài khoản mới chưa có nhân vật');

update public.profiles
  set appearance = '{"gender":"male","hat":"bearskin","top":"kimono","bottom":"chima"}'
  where id = 'e0000000-0000-4000-8000-000000000001';
select is((select appearance ->> 'top' from public.profiles where id = 'e0000000-0000-4000-8000-000000000001'),
  'kimono', 'lưu được ngoại hình phối tự do');

select throws_ok(
  $$update public.profiles set appearance = '{"gender":"rong","hat":"none","top":"aodai","bottom":"silk"}'
    where id = 'e0000000-0000-4000-8000-000000000001'$$,
  '23514', null, 'giới tính lạ bị chặn');
select throws_ok(
  $$update public.profiles set appearance = '{"gender":"male","hat":"none","top":"aodai"}'
    where id = 'e0000000-0000-4000-8000-000000000001'$$,
  '23514', null, 'thiếu trường bị chặn');
select throws_ok(
  $$update public.profiles set appearance = '{"gender":"male","hat":"none","top":"aodai","bottom":"silk","x":1}'
    where id = 'e0000000-0000-4000-8000-000000000001'$$,
  '23514', null, 'trường thừa bị chặn');
select throws_ok(
  $$update public.profiles set appearance = '["male"]' where id = 'e0000000-0000-4000-8000-000000000001'$$,
  '23514', null, 'không phải object bị chặn');

-- Người chơi đăng nhập (trình duyệt) không tự sửa thẳng được cột này.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"e0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

select throws_ok(
  $$update public.profiles set appearance = null where id = 'e0000000-0000-4000-8000-000000000001'$$,
  '42501', null, 'trình duyệt không có quyền UPDATE appearance');
select is((select appearance ->> 'gender' from public.profiles where id = 'e0000000-0000-4000-8000-000000000001'),
  'male', 'người chơi đọc được ngoại hình của mình');

reset role;
select * from finish();
rollback;
