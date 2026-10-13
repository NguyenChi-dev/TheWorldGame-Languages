-- Vai trò của người dùng, dùng bởi middleware require-admin trong apps/api.
--
-- Không tạo bảng mới, chỉ thêm 1 cột vào profiles.
-- An toàn: trình duyệt không có quyền UPDATE profiles (xem migration init_schema), nên người chơi
-- KHÔNG thể tự nâng mình lên admin. Chỉ máy chủ (khóa bí mật) hoặc SQL trong Supabase Studio đổi được.
--
-- Cấp quyền admin cho một tài khoản (chạy trong SQL editor của Supabase):
--   update public.profiles set role = 'admin' where id = '<uuid của người dùng>';

alter table public.profiles
  add column role text not null default 'player'
  check (role in ('player', 'admin'));
