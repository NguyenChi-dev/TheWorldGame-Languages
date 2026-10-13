-- =============================================================================
-- Language World: lược đồ đầu tiên (9 bảng)
--
-- Nội dung học (lands, words, items): ai cũng đọc được, không ai sửa được từ trình duyệt.
-- Tiến độ người chơi (profiles, characters, user_lands, word_progress, farm_plots, inventory):
--   người chơi chỉ đọc được dòng của chính mình. Mọi thay đổi (vàng, thu hoạch, làm bài...)
--   sẽ do máy chủ thực hiện bằng khóa bí mật, khóa này bỏ qua RLS.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- NỘI DUNG HỌC
-- -----------------------------------------------------------------------------

-- Vùng đất theo ngôn ngữ, ví dụ 'en' = tiếng Anh.
create table public.lands (
  id            text primary key,
  name          text not null,
  language_code text not null,
  description   text not null default '',
  created_at    timestamptz not null default now()
);

-- Từ vựng thuộc một vùng đất. id khớp với packages/shared (ví dụ 'en-carrot').
create table public.words (
  id         text primary key,
  land_id    text not null references public.lands (id) on delete cascade,
  word       text not null,
  meaning    text not null,
  level      smallint not null default 1 check (level between 1 and 3),
  topic      text not null default '',
  created_at timestamptz not null default now(),
  unique (land_id, word)
);

-- Vật phẩm: hạt giống, nông sản, dụng cụ. id khớp với packages/shared (ví dụ 'carrot').
create table public.items (
  id           text primary key,
  kind         text not null check (kind in ('seed', 'crop', 'tool')),
  name         text not null,
  buy_price    integer not null default 0 check (buy_price >= 0),
  sell_price   integer not null default 0 check (sell_price >= 0),
  grow_seconds integer check (grow_seconds is null or grow_seconds > 0),
  word_id      text references public.words (id) on delete set null,
  created_at   timestamptz not null default now()
);


-- -----------------------------------------------------------------------------
-- NGƯỜI CHƠI VÀ TIẾN ĐỘ
-- -----------------------------------------------------------------------------

-- Hồ sơ người chơi, mỗi tài khoản đăng nhập (auth.users) có đúng một dòng.
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  username   text unique,
  gold       integer not null default 100 check (gold >= 0),
  created_at timestamptz not null default now()
);

-- Nhân vật người chơi tạo ra.
create table public.characters (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  name       text not null,
  body_color text not null default '#f59e0b',
  hair_style text not null default 'short',
  created_at timestamptz not null default now()
);
create index characters_user_id_idx on public.characters (user_id);

-- Vùng đất người chơi đã mở khóa.
create table public.user_lands (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  land_id    text not null references public.lands (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, land_id)
);

-- Tiến độ học từng từ.
create table public.word_progress (
  user_id       uuid not null references public.profiles (id) on delete cascade,
  word_id       text not null references public.words (id) on delete cascade,
  correct_count integer not null default 0 check (correct_count >= 0),
  wrong_count   integer not null default 0 check (wrong_count >= 0),
  last_seen_at  timestamptz,
  created_at    timestamptz not null default now(),
  primary key (user_id, word_id)
);

-- Ô đất trong nông trại. item_id là hạt giống đang trồng (null = ô trống).
create table public.farm_plots (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  land_id    text not null references public.lands (id) on delete cascade,
  x          smallint not null,
  z          smallint not null,
  item_id    text references public.items (id) on delete set null,
  planted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, land_id, x, z)
);

-- Túi đồ.
create table public.inventory (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  item_id    text not null references public.items (id) on delete cascade,
  quantity   integer not null default 0 check (quantity >= 0),
  created_at timestamptz not null default now(),
  primary key (user_id, item_id)
);


-- -----------------------------------------------------------------------------
-- QUYỀN TRUY CẬP
-- anon = khách chưa đăng nhập, authenticated = người chơi đã đăng nhập (cả hai dùng khóa publishable).
-- service_role = máy chủ dùng khóa bí mật.
-- Khai báo GRANT rõ ràng để không phụ thuộc vào cài đặt "auto expose" của dự án.
-- -----------------------------------------------------------------------------

revoke all on
  public.lands, public.words, public.items,
  public.profiles, public.characters, public.user_lands,
  public.word_progress, public.farm_plots, public.inventory
from anon, authenticated;

grant all on
  public.lands, public.words, public.items,
  public.profiles, public.characters, public.user_lands,
  public.word_progress, public.farm_plots, public.inventory
to service_role;

-- Nội dung học: chỉ được đọc.
grant select on public.lands, public.words, public.items to anon, authenticated;

-- Tiến độ: chỉ người đã đăng nhập được đọc (RLS bên dưới giới hạn vào dòng của chính họ).
grant select on
  public.profiles, public.characters, public.user_lands,
  public.word_progress, public.farm_plots, public.inventory
to authenticated;


-- -----------------------------------------------------------------------------
-- ROW LEVEL SECURITY: bật cho cả 9 bảng.
-- Không có chính sách INSERT/UPDATE/DELETE nào, nên trình duyệt không thể sửa dữ liệu.
-- -----------------------------------------------------------------------------

alter table public.lands         enable row level security;
alter table public.words         enable row level security;
alter table public.items         enable row level security;
alter table public.profiles      enable row level security;
alter table public.characters    enable row level security;
alter table public.user_lands    enable row level security;
alter table public.word_progress enable row level security;
alter table public.farm_plots    enable row level security;
alter table public.inventory     enable row level security;

-- Nội dung học: ai cũng đọc được.
create policy "Ai cũng đọc được vùng đất"
  on public.lands for select to anon, authenticated using (true);

create policy "Ai cũng đọc được từ vựng"
  on public.words for select to anon, authenticated using (true);

create policy "Ai cũng đọc được vật phẩm"
  on public.items for select to anon, authenticated using (true);

-- Tiến độ: người chơi chỉ đọc dòng của mình.
-- (select auth.uid()) được Postgres tính một lần cho cả câu truy vấn, nhanh hơn auth.uid().
create policy "Người chơi đọc hồ sơ của mình"
  on public.profiles for select to authenticated using ((select auth.uid()) = id);

create policy "Người chơi đọc nhân vật của mình"
  on public.characters for select to authenticated using ((select auth.uid()) = user_id);

create policy "Người chơi đọc vùng đất đã mở của mình"
  on public.user_lands for select to authenticated using ((select auth.uid()) = user_id);

create policy "Người chơi đọc tiến độ học của mình"
  on public.word_progress for select to authenticated using ((select auth.uid()) = user_id);

create policy "Người chơi đọc ô đất của mình"
  on public.farm_plots for select to authenticated using ((select auth.uid()) = user_id);

create policy "Người chơi đọc túi đồ của mình"
  on public.inventory for select to authenticated using ((select auth.uid()) = user_id);
