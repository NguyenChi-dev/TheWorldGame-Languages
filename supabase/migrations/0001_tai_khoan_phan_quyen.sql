-- =============================================================================
-- 0001. TÀI KHOẢN VÀ PHÂN QUYỀN
--
--   profiles        hồ sơ của mỗi tài khoản (auth.users), có vai trò role.
--   admin_settings  công tắc "bắt buộc xác thực hai lớp" cho trang quản trị (1 dòng).
--   admin_logs      nhật ký thao tác quản trị: chỉ THÊM và ĐỌC, không ai sửa / xóa được.
--
-- Vai trò: player (mặc định), admin, editor, moderator. Bảng phân quyền trang nằm ở
-- packages/shared/src/roles.ts.
--
-- Cấp quyền admin cho một tài khoản (chạy trong SQL editor của Supabase):
--   update public.profiles set role = 'admin' where id = '<uuid của người dùng>';
-- Tắt / bật bắt buộc 2 lớp (ví dụ khi phát triển):
--   update public.admin_settings set require_mfa = false;   -- hoặc true
-- =============================================================================


-- -----------------------------------------------------------------------------
-- HỒ SƠ
-- -----------------------------------------------------------------------------

create type public.user_role as enum ('player', 'admin', 'editor', 'moderator');

create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  username   text unique,
  role       public.user_role not null default 'player',
  created_at timestamptz not null default now()
);


-- -----------------------------------------------------------------------------
-- CÔNG TẮC XÁC THỰC HAI LỚP
-- -----------------------------------------------------------------------------

create table public.admin_settings (
  -- Bảng chỉ có đúng 1 dòng.
  id          boolean primary key default true check (id),
  require_mfa boolean not null default true
);
insert into public.admin_settings (id) values (true);

-- Không ai đọc / sửa trực tiếp qua API, trừ máy chủ. Trang admin hỏi qua hàm admin_mfa_required().
revoke all on public.admin_settings from anon, authenticated, service_role;
grant select on public.admin_settings to service_role;
alter table public.admin_settings enable row level security;


-- -----------------------------------------------------------------------------
-- HÀM KIỂM TRA VAI TRÒ (dùng trong RLS)
-- security definer: đọc profiles mà không bị chính RLS của profiles chặn (tránh vòng lặp).
-- search_path rỗng: mọi tên đều ghi đầy đủ schema, không ai chèn được hàm giả.
-- -----------------------------------------------------------------------------

-- true khi đang bắt buộc xác thực hai lớp. Thiếu dòng cấu hình thì coi như BẬT (an toàn).
create function public.admin_mfa_required()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select require_mfa from public.admin_settings where id), true)
$$;

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

-- true khi người gọi có một trong các vai trò `allowed`, VÀ phiên đã qua xác thực hai lớp (aal2)
-- nếu công tắc đang bật.
create function public.has_staff_role(allowed public.user_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (not public.admin_mfa_required() or coalesce((select auth.jwt() ->> 'aal') = 'aal2', false))
     and coalesce(public.current_user_role() = any (allowed), false)
$$;

-- admin_mfa_required: chỉ là 1 giá trị đúng/sai, cho cả khách hỏi để trang đăng nhập biết có bước 2 không.
revoke execute on function public.admin_mfa_required() from public;
grant execute on function public.admin_mfa_required() to anon, authenticated, service_role;
revoke execute on function public.current_user_role() from public, anon;
revoke execute on function public.has_staff_role(public.user_role[]) from public, anon;
grant execute on function public.current_user_role() to authenticated, service_role;
grant execute on function public.has_staff_role(public.user_role[]) to authenticated, service_role;


-- -----------------------------------------------------------------------------
-- QUYỀN TRÊN profiles
-- Trình duyệt chỉ ĐỌC được; UPDATE chỉ cấp cho riêng cột role, RLS giới hạn tiếp ai được đổi.
-- -----------------------------------------------------------------------------

revoke all on public.profiles from anon, authenticated;
grant all on public.profiles to service_role;
grant select on public.profiles to authenticated;
grant update (role) on public.profiles to authenticated;
alter table public.profiles enable row level security;

-- (select auth.uid()) được Postgres tính một lần cho cả câu truy vấn, nhanh hơn auth.uid().
create policy "Người chơi đọc hồ sơ của mình"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

-- Trang "Người chơi và báo cáo" cần xem hồ sơ của mọi người.
create policy "Admin và moderator đọc mọi hồ sơ"
  on public.profiles for select to authenticated
  using (public.has_staff_role('{admin,moderator}'));

-- Chỉ admin đổi vai trò, và chỉ của NGƯỜI KHÁC (tránh admin cuối cùng tự hạ quyền rồi khóa hệ thống).
create policy "Chỉ admin đổi vai trò của người khác"
  on public.profiles for update to authenticated
  using (public.has_staff_role('{admin}') and id <> (select auth.uid()))
  with check (public.has_staff_role('{admin}') and id <> (select auth.uid()));


-- -----------------------------------------------------------------------------
-- TỰ TẠO HỒ SƠ KHI CÓ TÀI KHOẢN MỚI
-- Vai trò KHÔNG BAO GIỜ lấy từ dữ liệu người đăng ký gửi lên, nên luôn là 'player'.
-- username lấy từ raw_user_meta_data.username nếu chưa ai dùng, không thì để trống.
-- -----------------------------------------------------------------------------

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

-- Tài khoản đã có từ trước mà chưa có hồ sơ: tạo bù (vai trò 'player').
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;


-- -----------------------------------------------------------------------------
-- NHẬT KÝ QUẢN TRỊ
-- Ba lớp chặn sửa / xóa: không cấp quyền UPDATE/DELETE/TRUNCATE; RLS chỉ có INSERT và SELECT;
-- trigger từ chối mọi UPDATE/DELETE/TRUNCATE, kể cả của chủ bảng và service_role.
-- actor_id không có khóa ngoại: nhật ký phải còn nguyên kể cả khi tài khoản bị xóa.
-- -----------------------------------------------------------------------------

create table public.admin_logs (
  id           bigint generated always as identity primary key,
  created_at   timestamptz not null default now(),
  actor_id     uuid not null,
  actor_role   text not null,
  action       text not null,
  target_table text,
  target_id    text,
  before       jsonb,
  after        jsonb,
  reason       text
);

-- Tra cứu "người này đã làm gì, theo thời gian".
create index admin_logs_actor_id_created_at_idx on public.admin_logs (actor_id, created_at);

revoke all on public.admin_logs from anon, authenticated, service_role;
grant select, insert on public.admin_logs to authenticated, service_role;
alter table public.admin_logs enable row level security;

-- Nhân viên chỉ ghi được nhật ký mang tên và vai trò THẬT của chính mình.
create policy "Nhân viên ghi nhật ký của chính mình"
  on public.admin_logs for insert to authenticated
  with check (
    public.has_staff_role('{admin,editor,moderator}')
    and actor_id = (select auth.uid())
    and actor_role = public.current_user_role()::text
  );

create policy "Admin đọc nhật ký"
  on public.admin_logs for select to authenticated
  using (public.has_staff_role('{admin}'));

create function public.admin_logs_reject_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'admin_logs chỉ được thêm mới, không được %', tg_op
    using errcode = 'insufficient_privilege';
end;
$$;

-- Trigger theo câu lệnh nên báo lỗi ngay cả khi câu lệnh không khớp dòng nào.
create trigger admin_logs_no_update_delete
  before update or delete on public.admin_logs
  for each statement execute function public.admin_logs_reject_change();

create trigger admin_logs_no_truncate
  before truncate on public.admin_logs
  for each statement execute function public.admin_logs_reject_change();
