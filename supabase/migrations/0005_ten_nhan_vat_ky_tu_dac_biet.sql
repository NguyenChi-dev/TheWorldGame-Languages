-- =============================================================================
-- 0005. QUY TẮC TÊN NHÂN VẬT MỚI
--
-- Trước (0004): 3–32 ký tự chỉ gồm chữ, số và dấu _ . -
-- Nay:          3–32 ký tự gồm chữ (có dấu), số và ký tự đặc biệt, KHÔNG có dấu cách,
--               và phải có ÍT NHẤT 1 ký tự đặc biệt (không phải chữ / số, ví dụ _ . - ! @ # ★).
--               Không có ký tự điều khiển.
-- Giống USERNAME_PATTERN trong packages/shared/src/slug.ts (apps/web, apps/admin, apps/api).
-- Tên đã đặt từ trước không bị đổi; quy tắc chỉ áp khi đăng ký / đổi tên.
-- =============================================================================

create or replace function public.username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_username ~ '^[^[:space:][:cntrl:]]{3,32}$'
     and p_username ~ '[^[:alnum:]]'
     and not exists (select 1 from public.profiles where lower(username) = lower(p_username))
$$;

create or replace function public.set_my_username(p_username text)
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
  if wanted !~ '^[^[:space:][:cntrl:]]{3,32}$' or wanted !~ '[^[:alnum:]]' then
    raise exception 'Tên nhân vật không hợp lệ' using errcode = 'check_violation';
  end if;
  -- Trùng tên (kể cả khác hoa thường): unique index báo lỗi unique_violation (23505).
  update public.profiles set username = wanted where id = me;
  return wanted;
end;
$$;
