-- =============================================================================
-- 0008. CHỌN VÙNG ĐẤT (NGÔN NGỮ) CỦA NGƯỜI CHƠI
--
-- Sau khi tạo nhân vật, người chơi chọn vùng đất muốn học (mỗi vùng đất = một ngôn ngữ, xem 0002).
-- Vùng đất đang chọn lưu ở profiles.land_id; null = chưa chọn, game mở màn chọn vùng đất (/lands).
-- Người chơi đổi vùng đất lúc nào cũng được.
--
-- Admin xóa vùng đất: land_id của người chơi đang ở đó tự về null (on delete set null), lần sau vào
-- game họ được hỏi chọn lại. Vùng đất bị TẮT: người chơi không đọc được nó (RLS 0002), game cũng
-- coi như chưa chọn.
--
-- Người chơi đổi cột này qua apps/api (PATCH /me, chỉ nhận vùng đất đang bật). Trình duyệt vẫn chỉ
-- được UPDATE cột role (0001), nên không tự sửa thẳng được.
-- =============================================================================

alter table public.profiles
  add column land_id uuid
    constraint profiles_land_id_fkey references public.lands (id) on delete set null;

-- Tìm nhanh người chơi theo vùng đất (và để xóa vùng đất không phải quét cả bảng profiles).
create index profiles_land_id_idx on public.profiles (land_id);

comment on column public.profiles.land_id is
  'Vùng đất (ngôn ngữ) người chơi đang chọn; null = chưa chọn.';
