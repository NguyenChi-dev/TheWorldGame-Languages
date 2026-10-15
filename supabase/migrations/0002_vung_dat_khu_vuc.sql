-- =============================================================================
-- 0002. VÙNG ĐẤT, KHU VỰC VÀ ẢNH
--
--   media   ảnh đã tải lên Cloudinary (file nằm ở Cloudinary, ở đây chỉ lưu thông tin).
--   lands   vùng đất = một ngôn ngữ. Không có điều kiện mở khóa: đang bật là vào được.
--   areas   khu vực trong vùng đất (nông trại, rạp chiếu phim...), mỗi khu vực MỘT kỹ năng.
--
-- Danh sách kỹ năng / mẫu cảnh phải khớp packages/shared/src/world.ts.
--
-- Quyền:
--   - Người chơi / khách: chỉ ĐỌC vùng đất và khu vực đang bật.
--   - admin, editor: đọc tất cả, thêm / sửa / bật tắt / đổi thứ tự.
--   - Chỉ admin XÓA được vùng đất và khu vực. Vùng đất còn khu vực thì database chặn (RESTRICT).
--   - moderator: chỉ xem.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- KIỂU DỮ LIỆU VÀ HÀM DÙNG CHUNG
-- -----------------------------------------------------------------------------

create type public.area_skill as enum (
  'vocabulary', 'listening', 'conversation', 'reading', 'writing', 'grammar', 'directions', 'group_talk'
);

create type public.area_scene as enum (
  'farm', 'market', 'cinema', 'cafe', 'library', 'post_office', 'school', 'suburb', 'park'
);

-- Tự cập nhật cột updated_at khi sửa dòng.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;


-- -----------------------------------------------------------------------------
-- ẢNH (MEDIA)
-- -----------------------------------------------------------------------------

create table public.media (
  id                uuid primary key default gen_random_uuid(),
  -- Mã file trên Cloudinary, ví dụ language-world/lands/abc123. Không trùng.
  public_id         text not null unique,
  resource_type     text not null default 'image' check (resource_type in ('image', 'video', 'raw')),
  format            text,
  secure_url        text not null check (secure_url like 'https://res.cloudinary.com/%'),
  width             integer check (width is null or width > 0),
  height            integer check (height is null or height > 0),
  bytes             bigint check (bytes is null or bytes >= 0),
  original_filename text,
  -- Ai tải lên (tự điền từ phiên đăng nhập).
  created_by        uuid default auth.uid(),
  created_at        timestamptz not null default now()
);
create index media_created_at_idx on public.media (created_at desc);


-- -----------------------------------------------------------------------------
-- VÙNG ĐẤT
-- -----------------------------------------------------------------------------

create table public.lands (
  id             uuid primary key default gen_random_uuid(),
  -- Định danh dễ đọc trong URL, chỉ a-z, 0-9 và dấu gạch ngang, ví dụ "tieng-anh".
  slug           text not null
                   constraint lands_slug_key unique
                   constraint lands_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name           text not null,
  language_code  text not null
                   constraint lands_language_code_key unique
                   constraint lands_language_code_format check (language_code ~ '^[a-z]{2,3}$'),
  description    text not null default '',
  cover_media_id uuid constraint lands_cover_media_id_fkey references public.media (id) on delete set null,
  -- Thứ tự hiển thị, nhỏ đứng trước.
  sort_order     integer not null default 0,
  is_active      boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create trigger lands_updated_at before update on public.lands
  for each row execute function public.set_updated_at();


-- -----------------------------------------------------------------------------
-- KHU VỰC
-- -----------------------------------------------------------------------------

create table public.areas (
  id             uuid primary key default gen_random_uuid(),
  land_id        uuid not null constraint areas_land_id_fkey references public.lands (id) on delete restrict,
  name           text not null,
  scene          public.area_scene not null,
  skill          public.area_skill not null,
  cover_media_id uuid constraint areas_cover_media_id_fkey references public.media (id) on delete set null,
  -- Thứ tự trong vùng đất, nhỏ đứng trước.
  unlock_order   integer not null default 0,
  is_active      boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  -- DEFERRABLE: đổi thứ tự cả danh sách trong một câu lệnh không bị lỗi trùng giữa chừng.
  constraint areas_land_order_key unique (land_id, unlock_order) deferrable initially deferred
);
create index areas_land_id_idx on public.areas (land_id);
create trigger areas_set_updated_at before update on public.areas
  for each row execute function public.set_updated_at();


-- -----------------------------------------------------------------------------
-- QUYỀN TRUY CẬP
-- Cấp quyền bảng cho authenticated; RLS bên dưới mới quyết định ai được làm gì.
-- -----------------------------------------------------------------------------

revoke all on public.media, public.lands, public.areas from anon, authenticated;
grant all on public.media, public.lands, public.areas to service_role;
grant select on public.media, public.lands, public.areas to anon, authenticated;
grant insert, update, delete on public.media, public.lands, public.areas to authenticated;

alter table public.media enable row level security;
alter table public.lands enable row level security;
alter table public.areas enable row level security;

-- Ảnh dùng trong game là công khai (URL Cloudinary vốn công khai), nên ai cũng đọc được thông tin.
create policy media_select on public.media for select to anon, authenticated
  using (true);
create policy media_insert on public.media for insert to authenticated
  with check (public.has_staff_role('{admin,editor}'));
create policy media_update on public.media for update to authenticated
  using (public.has_staff_role('{admin,editor}'))
  with check (public.has_staff_role('{admin,editor}'));
create policy media_delete on public.media for delete to authenticated
  using (public.has_staff_role('{admin,editor}'));

-- Người chơi / khách: chỉ vùng đất đang bật. Nhân viên: thấy cả vùng đang tắt.
create policy lands_select_active on public.lands for select to anon, authenticated
  using (is_active);
create policy lands_select_staff on public.lands for select to authenticated
  using (public.has_staff_role('{admin,editor,moderator}'));
create policy lands_insert on public.lands for insert to authenticated
  with check (public.has_staff_role('{admin,editor}'));
create policy lands_update on public.lands for update to authenticated
  using (public.has_staff_role('{admin,editor}'))
  with check (public.has_staff_role('{admin,editor}'));
create policy lands_delete on public.lands for delete to authenticated
  using (public.has_staff_role('{admin}'));

-- Khu vực đang bật trong vùng đất đang bật.
create policy areas_select_active on public.areas for select to anon, authenticated
  using (is_active and exists (select 1 from public.lands l where l.id = land_id and l.is_active));
create policy areas_select_staff on public.areas for select to authenticated
  using (public.has_staff_role('{admin,editor,moderator}'));
create policy areas_insert on public.areas for insert to authenticated
  with check (public.has_staff_role('{admin,editor}'));
create policy areas_update on public.areas for update to authenticated
  using (public.has_staff_role('{admin,editor}'))
  with check (public.has_staff_role('{admin,editor}'));
create policy areas_delete on public.areas for delete to authenticated
  using (public.has_staff_role('{admin}'));


-- -----------------------------------------------------------------------------
-- ĐỔI THỨ TỰ BẰNG MỘT LẦN GỌI
-- SECURITY INVOKER: chạy với quyền người gọi, RLS vẫn áp dụng (moderator / người chơi gọi thì
-- không dòng nào được cập nhật).
-- -----------------------------------------------------------------------------

create function public.reorder_lands(ids uuid[])
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.lands l set sort_order = x.ord - 1
  from unnest(ids) with ordinality as x(id, ord)
  where l.id = x.id
$$;

create function public.reorder_areas(p_land_id uuid, ids uuid[])
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.areas a set unlock_order = x.ord - 1
  from unnest(ids) with ordinality as x(id, ord)
  where a.id = x.id and a.land_id = p_land_id
$$;

revoke execute on function public.reorder_lands(uuid[]) from public, anon;
revoke execute on function public.reorder_areas(uuid, uuid[]) from public, anon;
grant execute on function public.reorder_lands(uuid[]) to authenticated, service_role;
grant execute on function public.reorder_areas(uuid, uuid[]) to authenticated, service_role;
