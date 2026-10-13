-- =============================================================================
-- Công tắc "bắt buộc xác thực hai lớp" cho trang quản trị.
--
-- Một chỗ duy nhất quyết định, cả 3 lớp cùng đọc:
--   - RLS: hàm has_staff_role() bên dưới.
--   - apps/admin: gọi hàm admin_mfa_required() (src/lib/auth.ts).
--   - apps/api: đọc bảng admin_settings bằng khóa bí mật (middleware require-role).
--
-- Mặc định BẬT. Tắt tạm (ví dụ khi phát triển) bằng SQL editor:
--   update public.admin_settings set require_mfa = false;
-- Bật lại:
--   update public.admin_settings set require_mfa = true;
-- =============================================================================

create table public.admin_settings (
  -- Bảng chỉ có đúng 1 dòng.
  id          boolean primary key default true check (id),
  require_mfa boolean not null default true,
  updated_at  timestamptz not null default now()
);

insert into public.admin_settings (id) values (true);

-- Không ai đọc/sửa trực tiếp qua API, trừ máy chủ. Trang admin hỏi qua hàm admin_mfa_required().
revoke all on public.admin_settings from anon, authenticated, service_role;
grant select on public.admin_settings to service_role;
alter table public.admin_settings enable row level security;

/** true khi đang bắt buộc xác thực hai lớp. Thiếu dòng cấu hình thì coi như BẬT (an toàn). */
create function public.admin_mfa_required()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select require_mfa from public.admin_settings where id), true)
$$;

-- Chỉ là 1 giá trị đúng/sai, cho cả khách chưa đăng nhập hỏi để trang login biết có bước 2 hay không.
revoke execute on function public.admin_mfa_required() from public;
grant execute on function public.admin_mfa_required() to anon, authenticated, service_role;

-- has_staff_role: chỉ đòi aal2 khi công tắc đang bật.
create or replace function public.has_staff_role(allowed public.user_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (not public.admin_mfa_required() or coalesce((select auth.jwt() ->> 'aal') = 'aal2', false))
     and coalesce(public.current_user_role() = any (allowed), false)
$$;
