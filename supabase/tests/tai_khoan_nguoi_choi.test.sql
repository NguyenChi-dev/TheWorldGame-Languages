-- Test: tên nhân vật (username_available, set_my_username) và quyền trên profiles của người chơi.
-- Chạy: pnpm supabase test db   (mọi thay đổi bị rollback cuối file)
begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

insert into auth.users (id, email, raw_user_meta_data) values
  ('5a000000-0000-4000-8000-000000000001', 'nc-a@lw.test', '{"username":"Mèo_Ú"}'),
  ('5a000000-0000-4000-8000-000000000002', 'nc-b@lw.test', '{"username":"cun.con"}');

-- ================================================================= username_available (khách gọi được)
set local role anon;
select is(public.username_available('Tên_Mới-1'), true, 'tên mới hợp lệ: còn trống');
select is(public.username_available('mèo_ú'), false, 'trùng tên (khác hoa thường): đã có người dùng');
select is(public.username_available('a_'), false, 'quá ngắn: không hợp lệ');
select is(public.username_available('KhongDacBiet'), false, 'không có ký tự đặc biệt: không hợp lệ');
select is(public.username_available('Mèo@123'), true, 'có @ (ký tự đặc biệt mới được phép)');
select is(public.username_available('Sao★Sáng'), true, 'có ký hiệu ★');
select is(public.username_available('Mèo!'), true, 'có !');
select is(public.username_available('có_dấu cách'), false, 'có dấu cách: không hợp lệ');
select throws_ok($$ select public.set_my_username('khach') $$, '42501', null, 'khách không gọi được set_my_username');
reset role;

-- ================================================================= người chơi A
select set_config('request.jwt.claims', '{"sub":"5a000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is(public.set_my_username('  Mèo_Mập  '), 'Mèo_Mập', 'đổi tên của chính mình (bỏ khoảng trắng 2 đầu)');
select throws_ok($$ select public.set_my_username('CUN.CON') $$, '23505', null, 'không lấy được tên người khác đang dùng');
select throws_ok($$ select public.set_my_username('KhongDacBiet') $$, '23514', null, 'tên không có ký tự đặc biệt bị chặn');
select throws_ok($$ update public.profiles set username = 'Hack' where id = '5a000000-0000-4000-8000-000000000001' $$,
  '42501', null, 'người chơi không UPDATE thẳng được profiles.username');
select lives_ok($$ update public.profiles set role = 'admin' where id = '5a000000-0000-4000-8000-000000000001' $$,
  'người chơi chạy UPDATE role không lỗi nhưng...');
select is((select count(*)::int from public.profiles where id = '5a000000-0000-4000-8000-000000000002'), 0,
  'người chơi không đọc được hồ sơ người khác');
reset role;

select is((select role::text from public.profiles where id = '5a000000-0000-4000-8000-000000000001'), 'player',
  '...RLS chặn: vẫn là player');
select is((select username from public.profiles where id = '5a000000-0000-4000-8000-000000000002'), 'cun.con',
  'tên của người chơi B không bị đổi');

select * from finish();
rollback;
