-- =============================================================================
-- 0003. KỸ NĂNG LUYỆN TẬP
--
-- Trước đây kỹ năng là danh sách cố định (enum area_skill). Giờ thành bảng skills để admin tự
-- thêm / sửa / xóa ở trang Vùng đất › Kỹ năng luyện tập. Dùng chung cho mọi vùng đất.
--
--   skills        tên, mô tả, icon, màu (icon / màu là mã trong danh sách cố định của apps/admin,
--                 xem SKILL_ICON_KEYS / SKILL_COLOR_KEYS trong packages/shared/src/world.ts).
--   areas.skill   (enum) đổi thành areas.skill_id trỏ tới skills. Kỹ năng đang được khu vực dùng
--                 thì không xóa được (ON DELETE RESTRICT).
--
-- 8 kỹ năng cũ được chuyển thành 8 dòng đầu tiên, khu vực đang có giữ đúng kỹ năng của mình.
--
-- Quyền: ai cũng đọc được (game cần hiện tên kỹ năng); admin, editor thêm / sửa / đổi thứ tự;
-- chỉ admin xóa.
-- =============================================================================

create table public.skills (
  id          uuid primary key default gen_random_uuid(),
  name        text not null constraint skills_name_length check (char_length(trim(name)) between 1 and 60),
  description text not null default '' constraint skills_description_length check (char_length(description) <= 300),
  icon        text not null default 'book' constraint skills_icon_format check (icon ~ '^[a-z0-9-]+$'),
  color       text not null default 'pink' constraint skills_color_format check (color ~ '^[a-z]+$'),
  -- Thứ tự hiển thị, nhỏ đứng trước.
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
-- Không trùng tên (không phân biệt hoa thường).
create unique index skills_name_key on public.skills (lower(name));
create trigger skills_updated_at before update on public.skills
  for each row execute function public.set_updated_at();


-- -----------------------------------------------------------------------------
-- Chuyển areas.skill (enum) sang areas.skill_id, giữ nguyên kỹ năng của khu vực đang có.
-- -----------------------------------------------------------------------------

alter table public.areas add column skill_id uuid;

with seed (code, name, icon, color, ord) as (
  values
    ('vocabulary',   'Từ vựng',        'book',         'pink',    0),
    ('listening',    'Nghe',           'headphones',   'sky',     1),
    ('conversation', 'Hội thoại',      'comments',     'violet',  2),
    ('reading',      'Đọc',            'book-open',    'amber',   3),
    ('writing',      'Viết',           'pen-nib',      'emerald', 4),
    ('grammar',      'Ngữ pháp',       'spell-check',  'indigo',  5),
    ('directions',   'Hỏi đường',      'signs-post',   'teal',    6),
    ('group_talk',   'Hội thoại nhóm', 'people-group', 'orange',  7)
),
inserted as (
  insert into public.skills (name, icon, color, sort_order)
  select name, icon, color, ord from seed
  returning id, name
)
update public.areas a
set skill_id = inserted.id
from inserted
join seed on seed.name = inserted.name
where a.skill::text = seed.code;

alter table public.areas
  alter column skill_id set not null,
  add constraint areas_skill_id_fkey foreign key (skill_id) references public.skills (id) on delete restrict,
  drop column skill;
create index areas_skill_id_idx on public.areas (skill_id);
drop type public.area_skill;


-- -----------------------------------------------------------------------------
-- QUYỀN TRUY CẬP
-- -----------------------------------------------------------------------------

revoke all on public.skills from anon, authenticated;
grant all on public.skills to service_role;
grant select on public.skills to anon, authenticated;
grant insert, update, delete on public.skills to authenticated;
alter table public.skills enable row level security;

create policy skills_select on public.skills for select to anon, authenticated
  using (true);
create policy skills_insert on public.skills for insert to authenticated
  with check (public.has_staff_role('{admin,editor}'));
create policy skills_update on public.skills for update to authenticated
  using (public.has_staff_role('{admin,editor}'))
  with check (public.has_staff_role('{admin,editor}'));
create policy skills_delete on public.skills for delete to authenticated
  using (public.has_staff_role('{admin}'));

-- Đổi thứ tự bằng một lần gọi. SECURITY INVOKER: RLS vẫn áp dụng.
create function public.reorder_skills(ids uuid[])
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.skills s set sort_order = x.ord - 1
  from unnest(ids) with ordinality as x(id, ord)
  where s.id = x.id
$$;

revoke execute on function public.reorder_skills(uuid[]) from public, anon;
grant execute on function public.reorder_skills(uuid[]) to authenticated, service_role;
