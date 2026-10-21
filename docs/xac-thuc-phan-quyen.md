# Xác thực và phân quyền — Language World

Tài liệu cho lập trình viên làm việc với trang quản trị (`apps/admin`), game (`apps/web`), API (`apps/api`), máy chủ realtime (`apps/realtime`) và database (`supabase/`).

## 1. Ba lớp bảo vệ

Mọi quyền được kiểm tra **ở máy chủ**. Ẩn nút / menu trên giao diện chỉ để dễ dùng, không phải bảo mật.

| Lớp | Ở đâu | Làm gì |
|---|---|---|
| 1. Giao diện | `sectionsForRole`, `can()` trong `@lw/shared` | Chỉ hiện menu / nút đúng quyền |
| 2. Máy chủ | `requireSection`, `requireRole`, `requirePermission` (`apps/admin/src/lib/auth.ts`); middleware `auth` + `requireRole` (`apps/api/src/middleware`) | Chặn trước khi đọc / ghi dữ liệu. **Mọi** trang và server action đều gọi |
| 3. Database | RLS + `has_staff_role()`, `has_aal2()` (`supabase/migrations`) | Chặn lần cuối, kể cả khi ai đó gọi thẳng Supabase REST bằng token của họ |

`proxy.ts` chỉ chuyển hướng nhanh người chưa đăng nhập về `/login`, không phải lớp phân quyền.

## 2. Vai trò và nguồn vai trò

- 4 vai trò, khớp enum `public.user_role`: `admin`, `editor`, `moderator`, `player` (`packages/shared/src/roles.ts`).
- Vai trò **luôn đọc từ `profiles.role`** ở mỗi request. Không lấy từ JWT, `user_metadata`, query string hay dữ liệu trình duyệt gửi lên.
- Tài khoản mới luôn là `player` (trigger `handle_new_user`). Chỉ admin đổi được vai trò của **người khác** (RLS).
- Đổi vai trò có hiệu lực ở request kế tiếp. Tab đang mở tự tải lại khi `SessionWatch` thấy vai trò khác.
- Vai trò lạ hoặc thiếu hồ sơ: coi là `player`, tức là không có quyền quản trị nào.

## 3. Ma trận quyền

Nguồn duy nhất: `PERMISSIONS` trong `packages/shared/src/permissions.ts`. Admin dùng `requirePermission(...)` / `can(...)`, API dùng `rolesFor(...)`. Test `apps/admin/src/lib/permissions-rls.test.ts` đối chiếu ma trận này với policy RLS trong migrations.

| Quyền | admin | editor | moderator | player |
|---|:-:|:-:|:-:|:-:|
| `admin.access` vào trang quản trị | ✔ | ✔ | ✔ | |
| `content.read` (cả nội dung đang tắt) | ✔ | ✔ | ✔ | |
| `content.create` / `content.update` / `content.publish` | ✔ | ✔ | | |
| `content.delete` 🔒 | ✔ | | | |
| `media.create` / `media.update` / `media.delete` | ✔ | ✔ | | |
| `players.read` | ✔ | | ✔ | |
| `players.manage` 🔒 (xác nhận email, đặt lại mật khẩu, đổi tên, khóa, xóa) | ✔ | | | |
| `staff.manage` 🔒 (đổi vai trò, đặt lại 2 lớp của nhân viên) | ✔ | | | |
| `logs.read` | ✔ | | | |
| `economy.manage` | ✔ | | | |
| `settings.manage` 🔒 (công tắc bắt buộc 2 lớp) | ✔ | | | |

🔒 = `AAL2_PERMISSIONS`: **luôn cần xác thực hai lớp**, kể cả khi công tắc tắt.

Trang và vai trò được vào (`ADMIN_SECTIONS`):
- `/` — mọi nhân viên;
- `/lands`, `/lands/skills`, `/map-editor`, `/words` — admin, editor;
- `/media` — admin, editor;
- `/players` — admin, moderator;
- `/economy`, `/logs`, `/settings` — admin.

Không đủ quyền thì về `/?denied=1`. Người chơi vào trang quản trị thì về `/login?denied=1`.
Vì có `app/(admin)/loading.tsx`, khi bị chặn quyền, trang trả 200 kèm khung chờ rồi trình duyệt mới chuyển hướng. Trang chặn trước khi đọc dữ liệu, nên không lộ nội dung.

Supabase **thu hồi các phiên khác** của tài khoản ngay khi tài khoản đó thiết lập xong 2 lớp. Tab đang mở ở máy khác sẽ bị đưa về trang đăng nhập.

## 4. Phiên đăng nhập

- Cookie riêng từng app: `lw-admin-auth` (admin) và `lw-game-auth` (game), để đăng nhập game không kéo theo đăng nhập admin.
- Cookie admin: `httpOnly`, `sameSite=lax`, `secure` khi chạy production. Admin không có Supabase client trên trình duyệt.
- Mỗi request ở máy chủ:
  1. `getClaims()` kiểm tra chữ ký và hạn dùng của JWT, token hết hạn thì tự làm mới.
  2. `getUser()` hỏi Supabase Auth để chặn **phiên đã bị thu hồi / tài khoản bị khóa**. JWT ký ES256 nên bước 1 không biết những việc này: token cũ vẫn "hợp lệ" tới khoảng 1 giờ.
- Bước 2 áp dụng ở admin (`getSession`), API (middleware `auth`, gồm cả `/me` của người chơi) và realtime (`verifyPlayer`).
- Mất kết nối tới Supabase: báo lỗi và cho thử lại (`AuthError("unavailable")`, API trả 503). **Không** coi là đăng xuất.
- Hết phiên:
  - Proxy chuyển về `/login?next=...&expired=1`.
  - Server action không bị chuyển hướng giữa chừng; nó trả lỗi "Phiên đăng nhập đã hết hạn" để giữ dữ liệu form.
  - `SessionWatch` hỏi máy chủ khi quay lại tab, khi có mạng lại, mỗi 5 phút, hoặc khi tab khác vừa đăng xuất (BroadcastChannel).
- Đăng xuất: `signOut({ scope: "local" })`. Supabase lỗi thì vẫn xóa cookie phiên. Nút Back không hiện lại trang cũ (`BackCacheGuard`).
- Chuyển hướng sau đăng nhập: chỉ qua `safeNextPath()` (`apps/admin/src/lib/safe-next.ts`). Hàm này chỉ nhận đường dẫn nội bộ nằm trong danh sách trang quản trị, chặn `//evil`, `/\evil`, ký tự điều khiển và trang đăng nhập (tránh vòng lặp).

## 5. Xác thực hai lớp (TOTP, AAL2)

- **Thiết lập:** `/login/mfa` → "Tạo mã QR" → quét bằng ứng dụng xác thực → nhập mã 6 số. Khóa hiện tên "Language World Admin". Có nút "Tạo mã QR mới" để xóa khóa đang thiết lập dở.
- **Đăng nhập khi công tắc `require_mfa` bật:** mật khẩu (aal1) → nhập mã → aal2. Chưa có aal2 thì không vào được trang nào.
- **Công tắc tắt:** vào được bằng mật khẩu. Thao tác 🔒 báo "cần xác thực hai lớp", thanh bên có nút khiên vàng để xác thực bổ sung.
- **Mã sai / hết hạn / nhập sai quá nhiều lần:** có thông báo riêng (`totpErrorMessage`). Supabase không phân biệt mã sai với mã của khung 30 giây đã qua.
- **Mất điện thoại:** admin (aal2) vào Người chơi → tab Quản trị viên → ⋮ → "Đặt lại xác thực hai lớp". API `POST /admin/players/:id/mfa-reset` cần lý do, ghi nhật ký và không tự đặt lại cho chính mình.
- **Đổi công tắc:** trang `/settings` (admin, aal2) gọi hàm database `set_admin_mfa_required`; hàm tự ghi `admin_logs`. **Cần migration `0009`.**
- **Nhật ký:** `auth.mfa_enrolled`, `auth.mfa_reset`, `admin_settings.update_require_mfa`.

## 6. Khóa bí mật

- Biến `NEXT_PUBLIC_*` bị nhúng vào JavaScript gửi cho trình duyệt, nên chỉ chứa giá trị công khai: URL Supabase, khóa `sb_publishable_…`, địa chỉ API / realtime.
- `next.config.ts` của admin và web **từ chối khởi động** nếu một biến `NEXT_PUBLIC_*` trông giống khóa bí mật.
- `SUPABASE_SERVICE_ROLE_KEY` chỉ nằm trong `apps/api/.env`. `CLOUDINARY_URL` chỉ đọc ở máy chủ admin.
- Test `apps/admin/src/lib/security-scan.test.ts` quét mã nguồn để giữ các quy tắc này.

## 7. Thông báo lỗi

| Tình huống | Hiển thị |
|---|---|
| Sai email / mật khẩu | "Email hoặc mật khẩu không đúng" (không cho biết email có tồn tại hay không) |
| Email chưa xác nhận / tài khoản bị khóa / thử quá nhiều | Thông báo riêng (Supabase chỉ trả các mã này khi mật khẩu đúng) |
| Không đủ quyền | Trang: về Tổng quan kèm "Bạn không có quyền vào trang vừa mở.". API: 403 |
| Chưa đăng nhập / hết phiên | Trang: `/login` (kèm "Phiên đăng nhập đã hết hạn" nếu còn cookie cũ). API: 401 |
| Mất mạng / máy chủ lỗi | Trang lỗi có nút "Thử lại"; admin gọi API dạng đọc tự thử lại 1 lần; realtime của game tự kết nối lại (chờ 1→30 giây) |
| Trang không tồn tại | Trang 404 tiếng Việt |

## 8. Kiểm thử

| Loại | Lệnh / file |
|---|---|
| Unit + typecheck + lint | `pnpm turbo run typecheck lint test --filter=./apps/admin --filter=./apps/api --filter=./apps/web --filter=./apps/realtime --filter=./packages/shared` |
| RLS (pgTAP) | `pnpm supabase test db` — `supabase/tests/*.test.sql` (vai trò, nhật ký, công tắc 2 lớp, `0009`) |
| Ma trận ↔ RLS | `apps/admin/src/lib/permissions-rls.test.ts` |
| Đăng nhập / phiên / chuyển hướng | `apps/admin/src/app/(auth)/actions.test.ts`, `src/proxy.test.ts`, `src/lib/auth.test.ts`, `src/lib/safe-next.test.ts` |
| API | `apps/api/src/routes/routes.test.ts`, `admin-players.test.ts` |

Thử tay một lượt:
1. Đăng nhập sai, rồi đúng.
2. Vào lần lượt từng trang bằng tài khoản editor / moderator / player.
3. Thiết lập 2 lớp, rồi làm một thao tác 🔒.
4. Đăng xuất rồi bấm Back.
5. Mở 2 tab, đăng xuất ở một tab.
