-- =============================================================================
-- Nhật ký thao tác quản trị (admin_logs): chỉ được THÊM và ĐỌC, không ai sửa hay xóa được.
--
-- Ba lớp chặn sửa/xóa:
--   1. Không cấp quyền UPDATE/DELETE/TRUNCATE cho anon, authenticated, service_role.
--   2. RLS chỉ có chính sách INSERT và SELECT.
--   3. Trigger từ chối mọi câu UPDATE/DELETE/TRUNCATE, kể cả của chủ bảng (postgres) và service_role.
--
-- actor_id không có khóa ngoại tới auth.users: nhật ký phải còn nguyên kể cả khi tài khoản bị xóa.
-- =============================================================================

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


-- -----------------------------------------------------------------------------
-- QUYỀN TRUY CẬP
-- -----------------------------------------------------------------------------

revoke all on public.admin_logs from anon, authenticated, service_role;
grant select, insert on public.admin_logs to authenticated, service_role;


-- -----------------------------------------------------------------------------
-- ROW LEVEL SECURITY: chỉ INSERT và SELECT.
-- -----------------------------------------------------------------------------

alter table public.admin_logs enable row level security;

-- Nhân viên (đã qua 2 lớp) chỉ ghi được nhật ký mang tên và vai trò THẬT của chính mình.
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


-- -----------------------------------------------------------------------------
-- TRIGGER: chặn sửa/xóa cho mọi vai trò.
-- Trigger theo câu lệnh (for each statement) nên báo lỗi ngay cả khi câu lệnh không khớp dòng nào.
-- Lưu ý: chủ bảng vẫn có thể DROP/DISABLE trigger bằng một migration mới; việc đó hiện rõ trong git.
-- -----------------------------------------------------------------------------

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

create trigger admin_logs_no_update_delete
  before update or delete on public.admin_logs
  for each statement execute function public.admin_logs_reject_change();

create trigger admin_logs_no_truncate
  before truncate on public.admin_logs
  for each statement execute function public.admin_logs_reject_change();
