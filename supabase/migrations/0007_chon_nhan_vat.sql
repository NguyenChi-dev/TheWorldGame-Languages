-- =============================================================================
-- 0007. CHỌN NHÂN VẬT
--
-- Lần đầu vào game (/play), người chơi chưa có nhân vật sẽ được đưa tới màn chọn nhân vật (/character):
-- chọn nam / nữ rồi tự phối trang phục. Ngoại hình lưu ở profiles.appearance; null = chưa chọn.
--
--   appearance = {"gender": "female", "hat": "conical", "top": "aodai", "bottom": "silk"}
--
-- Database chỉ kiểm tra CẤU TRÚC (đúng 4 trường chữ, giới tính nam / nữ). Mã từng món đồ do apps/api
-- kiểm tra theo danh sách HATS / TOPS / BOTTOMS trong packages/shared/src/characters.ts, nên thêm món
-- đồ mới không cần migration.
--
-- Người chơi đổi cột này qua apps/api (PATCH /me). Trình duyệt vẫn chỉ được UPDATE cột role (0001),
-- nên không tự sửa thẳng được.
-- =============================================================================

alter table public.profiles
  add column appearance jsonb
    constraint profiles_appearance_check check (
      appearance is null or (
        jsonb_typeof(appearance) = 'object'
        -- Có đủ và chỉ có 4 trường dưới (không thiếu, không thừa).
        and appearance ?& array['gender', 'hat', 'top', 'bottom']
        and appearance - array['gender', 'hat', 'top', 'bottom'] = '{}'::jsonb
        and appearance ->> 'gender' in ('female', 'male')
        and jsonb_typeof(appearance -> 'hat') = 'string'
        and jsonb_typeof(appearance -> 'top') = 'string'
        and jsonb_typeof(appearance -> 'bottom') = 'string'
      )
    );

comment on column public.profiles.appearance is
  'Ngoại hình nhân vật {gender, hat, top, bottom} (packages/shared/src/characters.ts); null = chưa chọn.';
