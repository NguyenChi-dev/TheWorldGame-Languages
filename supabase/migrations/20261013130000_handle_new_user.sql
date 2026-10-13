-- =============================================================================
-- Tự tạo hồ sơ (profiles) khi có tài khoản mới trong auth.users.
--
-- Dùng cho mọi đường đăng ký (game, trang quản trị đăng ký, tạo tay trong dashboard).
-- AN TOÀN: vai trò KHÔNG BAO GIỜ lấy từ dữ liệu người dùng gửi lên (raw_user_meta_data
-- do người đăng ký tự điền), nên luôn là mặc định 'player'. Chỉ admin cấp quyền sau.
-- username lấy từ raw_user_meta_data.username nếu chưa ai dùng, không thì để trống.
-- =============================================================================

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  wanted text := left(nullif(trim(new.raw_user_meta_data ->> 'username'), ''), 32);
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    case
      when wanted is null or exists (select 1 from public.profiles where username = wanted) then null
      else wanted
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Chỉ trigger được gọi hàm này, không ai gọi trực tiếp qua API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Tài khoản tạo trước migration này mà chưa có hồ sơ: tạo bù (vai trò 'player').
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;
