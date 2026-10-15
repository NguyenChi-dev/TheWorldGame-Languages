-- =============================================================================
-- 0004. TÀI KHOẢN NGƯỜI CHƠI: tên nhân vật
--
-- Đăng ký / đăng nhập / đăng xuất / quên mật khẩu do Supabase Auth lo (bảng auth.users).
-- Hồ sơ người chơi nằm ở public.profiles (tạo tự động khi đăng ký, xem 0001).
--
-- Thêm 2 hàm để người chơi làm việc với tên nhân vật (profiles.username) mà KHÔNG phải cấp quyền
-- UPDATE bảng profiles cho trình duyệt (nếu cấp, người chơi có thể tự sửa cột role của mình):
--   username_available(tên)  → true nếu tên hợp lệ và chưa ai dùng (form đăng ký hỏi trước).
--   set_my_username(tên)     → đổi tên nhân vật của CHÍNH người đang đăng nhập.
--
-- Tên hợp lệ: 3–32 ký tự gồm chữ (có dấu), số, dấu _ . -  (giống kiểm tra ở apps/web và apps/api).
-- Không phân biệt hoa thường khi so trùng: "Meo" và "meo" coi là một.
-- =============================================================================

-- Tên trùng không phân biệt hoa thường. Ràng buộc unique (username) cũ vẫn giữ.
create unique index profiles_username_lower_key on public.profiles (lower(username));

create function public.username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_username ~ '^[[:alnum:]_.-]{3,32}$'
     and not exists (select 1 from public.profiles where lower(username) = lower(p_username))
$$;

create function public.set_my_username(p_username text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  wanted text := trim(p_username);
begin
  if me is null then
    raise exception 'Chưa đăng nhập' using errcode = 'insufficient_privilege';
  end if;
  if wanted !~ '^[[:alnum:]_.-]{3,32}$' then
    raise exception 'Tên nhân vật không hợp lệ' using errcode = 'check_violation';
  end if;
  -- Trùng tên (kể cả khác hoa thường): unique index báo lỗi unique_violation (23505).
  update public.profiles set username = wanted where id = me;
  return wanted;
end;
$$;

-- Form đăng ký (chưa đăng nhập) cần hỏi tên còn trống không.
revoke execute on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated, service_role;
revoke execute on function public.set_my_username(text) from public, anon;
grant execute on function public.set_my_username(text) to authenticated;
