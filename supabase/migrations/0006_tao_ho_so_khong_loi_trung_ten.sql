-- =============================================================================
-- 0006. TẠO HỒ SƠ KHÔNG BAO GIỜ LÀM HỎNG VIỆC ĐĂNG KÝ
--
-- Lỗi cũ: handle_new_user (0001) so trùng tên phân biệt hoa thường, còn index
-- profiles_username_lower_key (0004) chặn trùng KHÔNG phân biệt hoa thường. Đăng ký tên "meo_ú" khi đã
-- có "Mèo_Ú" làm trigger lỗi → Supabase hủy luôn việc tạo tài khoản ("Database error saving new user").
--
-- Sửa: so trùng không phân biệt hoa thường; và nếu vẫn trùng (2 người đăng ký cùng lúc) thì tạo hồ sơ
-- với tên trống thay vì báo lỗi. Người chơi đặt lại tên sau.
-- =============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  wanted text := left(nullif(trim(new.raw_user_meta_data ->> 'username'), ''), 32);
begin
  if wanted is not null and exists (select 1 from public.profiles where lower(username) = lower(wanted)) then
    wanted := null;
  end if;
  begin
    insert into public.profiles (id, username) values (new.id, wanted) on conflict (id) do nothing;
  exception when unique_violation then
    insert into public.profiles (id, username) values (new.id, null) on conflict (id) do nothing;
  end;
  return new;
end;
$$;
