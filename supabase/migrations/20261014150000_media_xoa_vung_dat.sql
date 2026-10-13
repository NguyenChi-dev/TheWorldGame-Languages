-- =============================================================================
-- 1. Bảng media: ảnh / âm thanh đã tải lên Cloudinary (file nằm ở Cloudinary, ở đây chỉ lưu thông tin).
--    lands.cover_media_id, areas.cover_media_id trỏ vào đây.
-- 2. Cho phép XÓA vùng đất (CRUD đầy đủ), nhưng an toàn:
--    - chỉ admin (đã qua 2 lớp nếu công tắc bật) được xóa;
--    - vùng đất còn khu vực / từ vựng / dữ liệu người chơi thì database CHẶN (ON DELETE RESTRICT),
--      tránh xóa dây chuyền mất dữ liệu. Muốn ẩn thì vẫn tắt is_active như cũ.
--    Khu vực vẫn KHÔNG xóa được (chưa có yêu cầu).
--
-- Chỉ áp lên Supabase local hoặc dự án THỬ NGHIỆM.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. MEDIA
-- -----------------------------------------------------------------------------

create table public.media (
  id                uuid primary key default gen_random_uuid(),
  provider          text not null default 'cloudinary' check (provider = 'cloudinary'),
  -- Mã file trên Cloudinary, ví dụ language-world/lands/abc123. Không trùng.
  public_id         text not null unique,
  resource_type     text not null default 'image' check (resource_type in ('image', 'video', 'raw')),
  format            text,
  secure_url        text not null check (secure_url like 'https://res.cloudinary.com/%'),
  width             integer check (width is null or width > 0),
  height            integer check (height is null or height > 0),
  bytes             bigint check (bytes is null or bytes >= 0),
  original_filename text,
  created_by        uuid default auth.uid(),
  created_at        timestamptz not null default now()
);
create index media_created_at_idx on public.media (created_at desc);

revoke all on public.media from anon, authenticated;
grant all on public.media to service_role;
-- Ảnh dùng trong game là công khai (URL Cloudinary vốn công khai), nên ai cũng đọc được thông tin.
grant select on public.media to anon, authenticated;
grant insert, update, delete on public.media to authenticated;

alter table public.media enable row level security;

create policy media_select on public.media for select to anon, authenticated
  using (true);
create policy media_insert on public.media for insert to authenticated
  with check (public.has_staff_role('{admin,editor}'));
create policy media_update on public.media for update to authenticated
  using (public.has_staff_role('{admin,editor}'))
  with check (public.has_staff_role('{admin,editor}'));
create policy media_delete on public.media for delete to authenticated
  using (public.has_staff_role('{admin,editor}'));

-- Ảnh bìa: trước đây chưa có bảng media nên chưa có khóa ngoại. Bỏ mã ảnh không tồn tại (nếu có) rồi gắn.
update public.lands set cover_media_id = null where cover_media_id is not null;
update public.areas set cover_media_id = null where cover_media_id is not null;
alter table public.lands
  add constraint lands_cover_media_id_fkey foreign key (cover_media_id) references public.media (id) on delete set null;
alter table public.areas
  add constraint areas_cover_media_id_fkey foreign key (cover_media_id) references public.media (id) on delete set null;


-- -----------------------------------------------------------------------------
-- 2. XÓA VÙNG ĐẤT
-- -----------------------------------------------------------------------------

-- Không xóa dây chuyền: còn dữ liệu con thì từ chối xóa (areas đã RESTRICT từ migration trước).
alter table public.words drop constraint words_land_id_fkey;
alter table public.words
  add constraint words_land_id_fkey foreign key (land_id) references public.lands (id) on delete restrict;
alter table public.user_lands drop constraint user_lands_land_id_fkey;
alter table public.user_lands
  add constraint user_lands_land_id_fkey foreign key (land_id) references public.lands (id) on delete restrict;
alter table public.farm_plots drop constraint farm_plots_land_id_fkey;
alter table public.farm_plots
  add constraint farm_plots_land_id_fkey foreign key (land_id) references public.lands (id) on delete restrict;

-- Migration trước đã thu hồi DELETE trên lands; cấp lại, RLS chỉ cho admin.
grant delete on public.lands to authenticated;
create policy lands_delete on public.lands for delete to authenticated
  using (public.has_staff_role('{admin}'));
