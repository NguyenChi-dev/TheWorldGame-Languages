# Language World

Web game học ngoại ngữ dạng thế giới thu nhỏ 3D low-poly. Người chơi tạo nhân vật, chọn vùng đất
theo ngôn ngữ, học qua nông trại và các cửa hàng trong thành phố, chơi online cùng nhau theo thời gian
thực và cài được trên điện thoại như app (PWA). Có trang admin để quản lý nội dung học.

> Trạng thái: đã có trang quản trị (tài khoản, phân quyền, vùng đất, khu vực, ảnh). Phần game (bài học,
> từ vựng, nông trại, cửa hàng) chưa làm; bảng database cho phần nào sẽ được tạo khi làm tới phần đó.

## Cấu trúc

```
language-world/
├── apps/
│   ├── web/        Next.js: trang giới thiệu, game                       → cổng 3000
│   ├── admin/      Next.js: trang quản trị nội dung                      → cổng 3001
│   ├── api/        Hono + Node.js: backend xử lý MỌI thay đổi dữ liệu    → cổng 4000
│   └── realtime/   Node.js + Colyseus: phòng theo vùng, vị trí, chat     → cổng 2567
├── packages/
│   ├── game/       Babylon.js: engine, cảnh 3D, nhân vật (KHÔNG React)
│   ├── shared/     Kiểu dữ liệu, vai trò, kỹ năng/mẫu cảnh, tin nhắn realtime,
│   │               schema Zod của API (`@lw/shared/api`)
│   ├── ui/         Component React dùng chung (Button, Panel) cho web và admin
│   └── tsconfig/   Cấu hình TypeScript gốc, các gói khác kế thừa
├── supabase/
│   ├── config.toml cấu hình Supabase CLI
│   ├── migrations/ file SQL tạo bảng + bảo mật RLS, đánh số theo thứ tự chạy:
│   │                 0001_tai_khoan_phan_quyen.sql, 0002_vung_dat_khu_vuc.sql, ...
│   └── tests/      test SQL (pgTAP) cho RLS, admin_logs, vùng đất/khu vực
│                   (chưa có dữ liệu mẫu: dữ liệu được tạo qua trang quản trị)
├── pnpm-workspace.yaml   khai báo các gói trong monorepo
├── turbo.json            các tác vụ dev, build, lint, typecheck, test
└── package.json          lệnh chạy chung ở thư mục gốc
```

### Mỗi phần làm gì

| Phần                | Tên gói        | Việc chính                                                                                                                                                                                                                                                                                                                            |
| ------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web`          | `@lw/web`      | Trang `/` giới thiệu, `/play` chơi game (canvas toàn màn hình), store Zustand giữ trạng thái kết nối, kết nối realtime, gọi `apps/api` qua `src/lib/api.ts`, manifest PWA.                                                                                                                                                            |
| `apps/admin`        | `@lw/admin`    | Đăng ký (`/signup`, tài khoản mới là `player`, chờ admin cấp quyền ở trang Người chơi) và đăng nhập Supabase + bắt buộc TOTP cho admin/editor/moderator, chặn người chơi. Menu theo vai trò (`ADMIN_SECTIONS` trong `@lw/shared`), `requireRole` trong `src/lib/auth.ts`, nhật ký `logAction` trong `src/lib/audit.ts`. Có `noindex`. |
| `apps/api`          | `@lw/api`      | Backend Hono: kiểm tra máy chủ, tài khoản, route quản trị (route game thêm dần). Kiểm tra token Supabase và dữ liệu gửi lên bằng Zod. Xem [apps/api/README.md](apps/api/README.md).                                                                                                                                                   |
| `apps/realtime`     | `@lw/realtime` | Máy chủ Colyseus, phòng `region` tối đa 30 người, đồng bộ vị trí `x, z` và chat bằng câu có sẵn.                                                                                                                                                                                                                                      |
| `packages/game`     | `@lw/game`     | `startGame(canvas, options)` trả về `{ dispose, setRemotePlayers }`. Lưới đất 6x6, camera xoay/kéo/phóng bằng chuột và cảm ứng.                                                                                                                                                                                                       |
| `packages/shared`   | `@lw/shared`   | Nguồn dữ liệu gốc dùng chung: kiểu, vai trò, kỹ năng/mẫu cảnh, `REGION_ROOM`, `CHAT_PHRASES`. `@lw/shared/api`: schema Zod và kiểu cho từng route của `apps/api`.                                                                                                                                                                     |
| `packages/ui`       | `@lw/ui`       | `Button`, `Panel` viết bằng Tailwind.                                                                                                                                                                                                                                                                                                 |
| `packages/tsconfig` | `@lw/tsconfig` | `base.json`, `nextjs.json`, `react-library.json`, `browser-library.json`, `node.json`.                                                                                                                                                                                                                                                |

Các gói trong `packages/` xuất thẳng mã TypeScript, không cần build riêng. Next.js tự biên dịch
chúng (khai báo trong `transpilePackages`), còn máy chủ realtime và `apps/api` dùng `tsx` khi dev và `esbuild` khi build.

## Cài đặt lần đầu

Yêu cầu: Node.js 22 trở lên, Git. pnpm được bật qua Corepack (đi kèm Node), phiên bản ghi trong
`package.json` (`packageManager`).

```bash
pnpm install
```

Sao chép file môi trường mẫu (điền giá trị khi có dự án Supabase thật):

```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/admin/.env.example apps/admin/.env.local
cp apps/realtime/.env.example apps/realtime/.env
cp apps/api/.env.example apps/api/.env
```

Chưa điền gì cũng chạy được: game kết nối tới `ws://localhost:2567` và `http://localhost:4000`.
`apps/api` khi chưa có Supabase vẫn chạy, chỉ các route cần đăng nhập trả 503.

## Các lệnh

Chạy ở thư mục gốc:

| Lệnh             | Việc làm                                                               |
| ---------------- | ---------------------------------------------------------------------- |
| `pnpm dev`       | Chạy cả 4 app cùng lúc (web 3000, admin 3001, api 4000, realtime 2567) |
| `pnpm build`     | Build tất cả                                                           |
| `pnpm lint`      | Kiểm tra code bằng ESLint                                              |
| `pnpm typecheck` | Kiểm tra kiểu TypeScript ở mọi gói                                     |
| `pnpm test`      | Chạy test Vitest (`apps/api`, `apps/admin`)                            |
| `pnpm format`    | Định dạng lại code bằng Prettier                                       |

Chạy riêng từng app bằng `--filter`:

```bash
pnpm --filter @lw/web dev        # http://localhost:3000
pnpm --filter @lw/admin dev      # http://localhost:3001
pnpm --filter @lw/api dev        # http://localhost:4000 (tự khởi động lại khi sửa code)
pnpm --filter @lw/realtime dev   # ws://localhost:2567 (tự khởi động lại khi sửa code)
```

`--filter` dùng được với mọi lệnh, ví dụ `pnpm --filter @lw/game typecheck`.

### Thử nhanh

1. `pnpm dev`, mở http://localhost:3000, bấm **Chơi game**.
2. Góc trên bên phải hiện `Online: 1`. Mở thêm một tab `/play` thì thành `Online: 2`.
3. Chạm vào một ô đất: khối vàng (bạn) di chuyển, tab kia thấy một khối màu đi tới đúng ô đó.
4. Tắt máy chủ realtime rồi tải lại trang: game vẫn chạy, góc màn hình hiện `Offline`.
5. Góc phải hiện thêm `API: OK`. Tắt `apps/api` thì sau tối đa 15 giây thành `API: Offline`, game vẫn chạy.
   http://localhost:4000/health trả về `{"ok":true,"service":"api","time":"..."}`.
6. Trang admin: http://localhost:3001 chuyển về `/login`. Đăng ký ở `/signup` (tài khoản mới là `player`),
   rồi cấp quyền admin bằng SQL (xem apps/api/README.md, mục Vai trò). Menu chỉ hiện các trang vai trò đó được vào.

### Supabase

Supabase CLI được cài sẵn trong dự án, gọi qua `pnpm supabase ...`:

```bash
pnpm supabase start                         # chạy Supabase trên máy (cần Docker Desktop)
pnpm supabase db reset                      # tạo lại database từ các file migrations
pnpm supabase test db                       # chạy test SQL trong supabase/tests (RLS, admin_logs)
```

Thêm bảng mới: tạo file tiếp theo trong `supabase/migrations`, ví dụ `0003_bai_hoc.sql` (số đứng đầu
quyết định thứ tự chạy, Supabase bắt buộc phải có). Chỉ tạo bảng khi bắt đầu làm tới phần đó.

## Bốn quy tắc bắt buộc

1. **`packages/game` không import React.** Game chỉ nói chuyện với web qua `startGame()` và callback.
   Nhờ vậy engine 3D không phụ thuộc vào cách React vẽ lại giao diện.
2. **Mọi thay đổi dữ liệu game đều đi qua `apps/api`.** Vàng, vật phẩm, tiến độ học: web, admin
   và app điện thoại sau này đều gọi `apps/api`, không tự ghi vào database. API kiểm tra token, kiểm tra
   dữ liệu bằng schema trong `@lw/shared/api` và tính toán theo giờ máy chủ.
3. **Máy chủ realtime không xử lý vàng.** Nó chỉ đồng bộ vị trí và chat.
4. **Khóa bí mật Supabase chỉ nằm phía máy chủ** (`apps/api`, `apps/realtime`). Không bao giờ đặt khóa bí mật vào biến
   `NEXT_PUBLIC_...` hay vào code chạy trên trình duyệt. Trình duyệt chỉ dùng khóa publishable, và RLS
   trong `supabase/migrations` đảm bảo người chơi chỉ đọc được dữ liệu của mình.

## Công nghệ

pnpm workspaces · Turborepo · TypeScript · Next.js 16 (App Router, Turbopack) · Tailwind CSS 4 ·
Zustand · Babylon.js 9 · Colyseus 0.18 (`@colyseus/sdk` ở trình duyệt) · Hono 4 · Zod 4 · Vitest ·
Supabase (`@supabase/ssr`, `@supabase/supabase-js`).
