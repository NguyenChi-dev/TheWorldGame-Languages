-- =============================================================================
-- Tổ chức thế giới game: Vùng đất › Khu vực › Bài học, Từ vựng thuộc Vùng đất.
--
--   lands         vùng đất = một ngôn ngữ. Thêm ảnh bìa, thứ tự mở khóa, bật/tắt.
--   areas         khu vực trong vùng đất (nông trại, rạp chiếu phim...), mỗi khu vực MỘT kỹ năng. MỚI.
--   lessons       bài học, bắt buộc thuộc một khu vực. MỚI (trước đây chưa có bảng này).
--   lesson_words  bảng nối bài học ↔ từ vựng, một từ dùng được trong nhiều bài. MỚI.
--   words         giữ nguyên: đã thuộc land_id.
--
-- Trước migration này KHÔNG có bảng shops, nên không có gì để đổi tên; areas được tạo mới.
-- lands.id giữ kiểu text (ví dụ 'en') vì words, user_lands, farm_plots đang tham chiếu tới nó.
--
-- Danh sách kỹ năng / mẫu cảnh phải khớp packages/shared/src/world.ts.
--
-- Quyền (cùng quy tắc vai trò như trước, xem packages/shared/src/roles.ts):
--   - Người chơi / khách: chỉ ĐỌC nội dung đang mở (vùng đất, khu vực bật; bài học đã xuất bản).
--   - admin, editor (đã qua 2 lớp nếu công tắc bật): đọc tất cả, thêm/sửa/xóa vùng đất, khu vực,
--     bài học, từ vựng.
--   - moderator: không sửa nội dung học.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- KIỂU DỮ LIỆU
-- -----------------------------------------------------------------------------

create type public.area_skill as enum (
  'vocabulary', 'listening', 'conversation', 'reading', 'writing', 'grammar', 'directions', 'group_talk'
);

create type public.area_scene as enum (
  'farm', 'market', 'cinema', 'cafe', 'library', 'post_office', 'school', 'suburb', 'park'
);

create type public.lesson_status as enum ('draft', 'published');

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
-- VÙNG ĐẤT: thêm cột
-- -----------------------------------------------------------------------------

alter table public.lands
  -- Ảnh bìa. Chưa có bảng media nên chưa gắn khóa ngoại; thêm khi làm trang Media.
  add column cover_media_id uuid,
  add column unlock_order   integer not null default 0,
  add column is_active      boolean not null default true,
  add constraint lands_language_code_format check (language_code ~ '^[a-z]{2,3}$');


-- -----------------------------------------------------------------------------
-- KHU VỰC
-- -----------------------------------------------------------------------------

create table public.areas (
  id           uuid primary key default gen_random_uuid(),
  land_id      text not null references public.lands (id) on delete cascade,
  name         text not null,
  scene        public.area_scene not null,
  skill        public.area_skill not null,
  unlock_order integer not null default 0,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index areas_land_id_idx on public.areas (land_id, unlock_order);
create trigger areas_set_updated_at before update on public.areas
  for each row execute function public.set_updated_at();


-- -----------------------------------------------------------------------------
-- BÀI HỌC
-- -----------------------------------------------------------------------------

create table public.lessons (
  id         uuid primary key default gen_random_uuid(),
  area_id    uuid not null references public.areas (id) on delete cascade,
  title      text not null,
  status     public.lesson_status not null default 'draft',
  position   integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index lessons_area_id_idx on public.lessons (area_id, position);
create trigger lessons_set_updated_at before update on public.lessons
  for each row execute function public.set_updated_at();


-- -----------------------------------------------------------------------------
-- TỪ VỰNG CỦA BÀI HỌC
-- -----------------------------------------------------------------------------

create table public.lesson_words (
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  word_id   text not null references public.words (id) on delete cascade,
  position  integer not null default 0,
  primary key (lesson_id, word_id)
);
create index lesson_words_word_id_idx on public.lesson_words (word_id);

-- Bài học chỉ dùng được từ của CHÍNH vùng đất (ngôn ngữ) chứa nó.
create function public.lesson_words_check_land()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.lessons l
    join public.areas a on a.id = l.area_id
    join public.words w on w.land_id = a.land_id
    where l.id = new.lesson_id and w.id = new.word_id
  ) then
    raise exception 'Từ "%" không thuộc vùng đất của bài học', new.word_id
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger lesson_words_same_land before insert or update on public.lesson_words
  for each row execute function public.lesson_words_check_land();


-- -----------------------------------------------------------------------------
-- QUYỀN TRUY CẬP
-- -----------------------------------------------------------------------------

revoke all on public.areas, public.lessons, public.lesson_words from anon, authenticated;
grant all on public.areas, public.lessons, public.lesson_words to service_role;
grant select on public.areas, public.lessons, public.lesson_words to anon, authenticated;

-- Ghi nội dung học: cấp quyền bảng cho authenticated, RLS bên dưới chỉ cho admin/editor.
grant insert, update, delete on
  public.lands, public.areas, public.lessons, public.lesson_words, public.words
to authenticated;

alter table public.areas        enable row level security;
alter table public.lessons      enable row level security;
alter table public.lesson_words enable row level security;

-- Vùng đất: người chơi/khách chỉ thấy vùng đang mở (trước đây thấy tất cả).
drop policy "Ai cũng đọc được vùng đất" on public.lands;
create policy "Ai cũng đọc được vùng đất đang mở"
  on public.lands for select to anon, authenticated
  using (is_active);

-- Khu vực đang mở trong vùng đất đang mở.
create policy "Ai cũng đọc được khu vực đang mở"
  on public.areas for select to anon, authenticated
  using (
    is_active
    and exists (select 1 from public.lands l where l.id = land_id and l.is_active)
  );

-- Bài học đã xuất bản trong khu vực đang mở. Bài nháp chỉ nhân viên nội dung thấy.
create policy "Ai cũng đọc được bài học đã xuất bản"
  on public.lessons for select to anon, authenticated
  using (
    status = 'published'
    and exists (select 1 from public.areas a where a.id = area_id and a.is_active)
  );

create policy "Ai cũng đọc được từ vựng của bài đã xuất bản"
  on public.lesson_words for select to anon, authenticated
  using (exists (select 1 from public.lessons l where l.id = lesson_id and l.status = 'published'));

-- admin, editor: đọc tất cả (kể cả bản nháp, vùng/khu vực đang tắt) và thêm/sửa/xóa.
-- Chính sách riêng cho authenticated vì anon không được gọi has_staff_role().
create policy "Admin, editor quản lý vùng đất"
  on public.lands for all to authenticated
  using (public.has_staff_role('{admin,editor}'))
  with check (public.has_staff_role('{admin,editor}'));

create policy "Admin, editor quản lý khu vực"
  on public.areas for all to authenticated
  using (public.has_staff_role('{admin,editor}'))
  with check (public.has_staff_role('{admin,editor}'));

create policy "Admin, editor quản lý bài học"
  on public.lessons for all to authenticated
  using (public.has_staff_role('{admin,editor}'))
  with check (public.has_staff_role('{admin,editor}'));

create policy "Admin, editor quản lý từ vựng của bài học"
  on public.lesson_words for all to authenticated
  using (public.has_staff_role('{admin,editor}'))
  with check (public.has_staff_role('{admin,editor}'));

create policy "Admin, editor quản lý kho từ vựng"
  on public.words for all to authenticated
  using (public.has_staff_role('{admin,editor}'))
  with check (public.has_staff_role('{admin,editor}'));
