-- Test: tài khoản mới tự có hồ sơ, vai trò luôn là 'player' dù người đăng ký tự khai gì.
-- Chạy: pnpm supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

insert into auth.users (id, email, raw_user_meta_data) values
  ('d0000000-0000-4000-8000-000000000001', 'new-1@lw.test', '{"username":"nguoi_moi","role":"admin"}'),
  ('d0000000-0000-4000-8000-000000000002', 'new-2@lw.test', '{"username":"nguoi_moi"}'),
  ('d0000000-0000-4000-8000-000000000003', 'new-3@lw.test', '{}'),
  ('d0000000-0000-4000-8000-000000000004', 'new-4@lw.test', '{"username":"NGUOI_MOI"}');

select is((select count(*)::int from public.profiles where id::text like 'd0000000-%'), 4,
  'mỗi tài khoản mới có đúng 1 hồ sơ');
select is((select role::text from public.profiles where id = 'd0000000-0000-4000-8000-000000000001'), 'player',
  'tự khai role admin trong metadata vẫn chỉ là player');
select is((select username from public.profiles where id = 'd0000000-0000-4000-8000-000000000001'), 'nguoi_moi',
  'lấy username từ metadata');
select is((select username from public.profiles where id = 'd0000000-0000-4000-8000-000000000002'), null,
  'username đã có người dùng thì để trống, không làm hỏng việc đăng ký');
select is((select username from public.profiles where id = 'd0000000-0000-4000-8000-000000000004'), null,
  'trùng tên khác hoa thường (NGUOI_MOI) cũng để trống, tài khoản vẫn được tạo');
select is((select username from public.profiles where id = 'd0000000-0000-4000-8000-000000000003'), null,
  'không khai username thì để trống');

select * from finish();
rollback;
