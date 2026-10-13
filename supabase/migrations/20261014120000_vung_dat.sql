-- =============================================================================
-- Vùng đất (lands) và Khu vực (areas): chỉnh bảng cho phần quản trị Vùng đất.
--
-- Chỉ áp lên Supabase local hoặc dự án THỬ NGHIỆM.
--
-- So với SQL gốc trong yêu cầu, đã chỉnh cho khớp repo thật:
--   - lands, areas ĐÃ CÓ (migration 20261014090000). lands.id đang là TEXT ('en') và được
--     words, user_lands, farm_plots, areas tham chiếu. Migration này đổi lands.id sang UUID,
--     thêm slug, và chuyển cả 4 khóa ngoại sang UUID (giữ nguyên dữ liệu).
--     Vùng 'en' nhận UUID cố định a17d0000-...-000000000001 (khớp ENGLISH_LAND_ID trong @lw/shared).
--   - Kiểu kỹ năng / mẫu cảnh đã có tên area_skill / area_scene, giữ nguyên (không tạo skill_kind, scene_kind).
--   - Không dùng app_role(): dùng has_staff_role() đã có, vì hàm này còn kiểm tra xác thực hai lớp
--     (công tắc admin_settings.require_mfa), giống mọi bảng khác.
--   - Khách chưa đăng nhập (anon) vẫn đọc được vùng đất / khu vực ĐANG BẬT như trước đây.
--   - Chưa có bảng media nên cover_media_id chưa có khóa ngoại.
--   - KHÔNG xóa user_lands (chờ chủ dự án quyết định).
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 0. Bỏ các chính sách RLS cũ sẽ được viết lại (một số đang tham chiếu cột land_id sắp đổi kiểu).
-- -----------------------------------------------------------------------------

drop policy if exists "Ai cũng đọc được vùng đất đang mở" on public.lands;
drop policy if exists "Admin, editor quản lý vùng đất" on public.lands;
drop policy if exists "Ai cũng đọc được khu vực đang mở" on public.areas;
drop policy if exists "Admin, editor quản lý khu vực" on public.areas;


-- -----------------------------------------------------------------------------
-- 1. lands: id TEXT -> UUID, thêm slug / sort_order / updated_at, bỏ cột mở khóa.
-- -----------------------------------------------------------------------------

alter table public.lands add column new_id uuid;
update public.lands
set new_id = case id when 'en' then 'a17d0000-0000-4000-8000-000000000001'::uuid else gen_random_uuid() end;
alter table public.lands alter column new_id set not null;

-- slug: lấy từ id cũ (chỉ gồm a-z, 0-9, dấu gạch ngang).
alter table public.lands add column slug text;
update public.lands set slug = regexp_replace(lower(id), '[^a-z0-9-]+', '-', 'g');
alter table public.lands
  alter column slug set not null,
  add constraint lands_slug_key unique (slug),
  add constraint lands_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  add constraint lands_language_code_key unique (language_code);

-- Vùng đất không có điều kiện mở khóa: unlock_order thành thứ tự hiển thị sort_order.
alter table public.lands add column sort_order integer not null default 0;
update public.lands set sort_order = unlock_order;
alter table public.lands drop column unlock_order;
alter table public.lands drop column if exists unlock_requirement;

alter table public.lands
  add column updated_at timestamptz not null default now(),
  alter column is_active set default false;

create trigger lands_updated_at before update on public.lands
  for each row execute function public.set_updated_at();


-- -----------------------------------------------------------------------------
-- 2. Chuyển 4 bảng con sang land_id UUID (giữ dữ liệu, dựng lại khóa/chỉ mục).
--    DROP COLUMN land_id tự bỏ khóa ngoại, khóa chính/unique và chỉ mục có cột đó.
-- -----------------------------------------------------------------------------

-- words
alter table public.words add column land_uuid uuid;
update public.words w set land_uuid = l.new_id from public.lands l where l.id = w.land_id;
alter table public.words drop column land_id;
alter table public.words rename column land_uuid to land_id;
alter table public.words
  alter column land_id set not null,
  add constraint words_land_id_word_key unique (land_id, word);

-- user_lands
alter table public.user_lands add column land_uuid uuid;
update public.user_lands u set land_uuid = l.new_id from public.lands l where l.id = u.land_id;
alter table public.user_lands drop column land_id;
alter table public.user_lands rename column land_uuid to land_id;
alter table public.user_lands
  alter column land_id set not null,
  add primary key (user_id, land_id);

-- farm_plots
alter table public.farm_plots add column land_uuid uuid;
update public.farm_plots f set land_uuid = l.new_id from public.lands l where l.id = f.land_id;
alter table public.farm_plots drop column land_id;
alter table public.farm_plots rename column land_uuid to land_id;
alter table public.farm_plots
  alter column land_id set not null,
  add constraint farm_plots_user_id_land_id_x_z_key unique (user_id, land_id, x, z);

-- areas
alter table public.areas add column land_uuid uuid;
update public.areas a set land_uuid = l.new_id from public.lands l where l.id = a.land_id;
alter table public.areas drop column land_id;
alter table public.areas rename column land_uuid to land_id;
alter table public.areas alter column land_id set not null;
create index areas_land_id_idx on public.areas (land_id);

-- Đổi khóa chính của lands sang cột UUID.
alter table public.lands drop constraint lands_pkey;
alter table public.lands drop column id;
alter table public.lands rename column new_id to id;
alter table public.lands
  alter column id set default gen_random_uuid(),
  add primary key (id);

-- Khóa ngoại mới. Vùng đất không bị xóa trong app (chỉ tắt), areas dùng RESTRICT cho chắc.
alter table public.words
  add constraint words_land_id_fkey foreign key (land_id) references public.lands (id) on delete cascade;
alter table public.user_lands
  add constraint user_lands_land_id_fkey foreign key (land_id) references public.lands (id) on delete cascade;
alter table public.farm_plots
  add constraint farm_plots_land_id_fkey foreign key (land_id) references public.lands (id) on delete cascade;
alter table public.areas
  add constraint areas_land_id_fkey foreign key (land_id) references public.lands (id) on delete restrict;


-- -----------------------------------------------------------------------------
-- 3. areas: ảnh bìa, điều kiện mở khóa, thứ tự mở khóa không trùng trong một vùng.
-- -----------------------------------------------------------------------------

alter table public.areas
  add column cover_media_id uuid,
  add column unlock_requirement jsonb not null default '{}'::jsonb,
  add constraint areas_unlock_requirement_object check (jsonb_typeof(unlock_requirement) = 'object'),
  alter column is_active set default false,
  -- DEFERRABLE: đổi thứ tự cả danh sách trong một câu lệnh không bị lỗi trùng giữa chừng.
  add constraint areas_land_order_key unique (land_id, unlock_order) deferrable initially deferred;

-- areas đã có trigger areas_set_updated_at từ migration trước.


-- -----------------------------------------------------------------------------
-- 4. RLS. Không có chính sách DELETE và thu hồi quyền DELETE: chỉ ẩn bằng is_active = false.
-- -----------------------------------------------------------------------------

revoke delete on public.lands, public.areas from anon, authenticated;

-- Người chơi / khách: chỉ vùng đất đang bật.
create policy lands_select_active on public.lands for select to anon, authenticated
  using (is_active);
-- Nhân viên (admin, editor, moderator): thấy cả vùng đang tắt.
create policy lands_select_staff on public.lands for select to authenticated
  using (public.has_staff_role('{admin,editor,moderator}'));
create policy lands_insert on public.lands for insert to authenticated
  with check (public.has_staff_role('{admin,editor}'));
create policy lands_update on public.lands for update to authenticated
  using (public.has_staff_role('{admin,editor}'))
  with check (public.has_staff_role('{admin,editor}'));

create policy areas_select_active on public.areas for select to anon, authenticated
  using (is_active and exists (select 1 from public.lands l where l.id = land_id and l.is_active));
create policy areas_select_staff on public.areas for select to authenticated
  using (public.has_staff_role('{admin,editor,moderator}'));
create policy areas_insert on public.areas for insert to authenticated
  with check (public.has_staff_role('{admin,editor}'));
create policy areas_update on public.areas for update to authenticated
  using (public.has_staff_role('{admin,editor}'))
  with check (public.has_staff_role('{admin,editor}'));


-- -----------------------------------------------------------------------------
-- 5. Đổi thứ tự bằng một lần gọi. SECURITY INVOKER: chạy với quyền người gọi, RLS vẫn áp dụng
--    (moderator / người chơi gọi thì không dòng nào được cập nhật).
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


-- -----------------------------------------------------------------------------
-- 6. user_lands không còn cần (vùng đất không khóa) nhưng KHÔNG tự xóa: chờ chủ dự án quyết định.
-- drop table if exists public.user_lands;
-- -----------------------------------------------------------------------------
