-- =============================================================================
-- Vai trò người dùng dạng enum, thêm 2 vai trò editor và moderator.
--
-- Migration trước (add_profile_role) tạo cột profiles.role kiểu text + check ('player','admin').
-- Migration này đổi cột sang enum public.user_role, giữ nguyên dữ liệu đang có.
--
-- Quyền đổi vai trò:
--   - Chỉ admin ĐÃ QUA XÁC THỰC HAI LỚP (aal2) được đổi vai trò, và chỉ của NGƯỜI KHÁC
--     (không tự đổi của mình, tránh admin cuối cùng tự hạ quyền rồi khóa luôn hệ thống).
--   - Quyền UPDATE chỉ cấp cho riêng cột role: admin cũng không sửa được vàng hay username qua đường này.
--   - Máy chủ (khóa bí mật) vẫn bỏ qua RLS như trước.
-- =============================================================================

create type public.user_role as enum ('player', 'admin', 'editor', 'moderator');

alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles alter column role drop default;
alter table public.profiles alter column role type public.user_role using role::public.user_role;
alter table public.profiles alter column role set default 'player';


-- -----------------------------------------------------------------------------
-- Hàm kiểm tra vai trò, dùng trong chính sách RLS.
-- security definer: đọc profiles mà không bị chính RLS của profiles chặn (tránh vòng lặp).
-- search_path rỗng: mọi tên đều ghi đầy đủ schema, không ai chèn được hàm giả.
-- -----------------------------------------------------------------------------

-- Vai trò của người đang gọi (null nếu chưa đăng nhập hoặc chưa có hồ sơ).
create function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid())
$$;

-- true khi người gọi có một trong các vai trò `allowed` VÀ phiên đã qua xác thực hai lớp.
-- Kiểm tra aal ở đây để tài khoản quản trị chỉ có mật khẩu (aal1) không gọi thẳng API Supabase được.
create function public.has_staff_role(allowed public.user_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select auth.jwt() ->> 'aal') = 'aal2', false)
     and coalesce(public.current_user_role() = any (allowed), false)
$$;

revoke execute on function public.current_user_role() from public, anon;
revoke execute on function public.has_staff_role(public.user_role[]) from public, anon;
grant execute on function public.current_user_role() to authenticated, service_role;
grant execute on function public.has_staff_role(public.user_role[]) to authenticated, service_role;


-- -----------------------------------------------------------------------------
-- RLS cho profiles
-- -----------------------------------------------------------------------------

-- Trang "Người chơi và báo cáo" cần xem hồ sơ của mọi người.
create policy "Admin và moderator đọc mọi hồ sơ"
  on public.profiles for select to authenticated
  using (public.has_staff_role('{admin,moderator}'));

-- Chỉ cho phép UPDATE đúng cột role; RLS bên dưới giới hạn tiếp ai được đổi.
grant update (role) on public.profiles to authenticated;

create policy "Chỉ admin đổi vai trò của người khác"
  on public.profiles for update to authenticated
  using (public.has_staff_role('{admin}') and id <> (select auth.uid()))
  with check (public.has_staff_role('{admin}') and id <> (select auth.uid()));
