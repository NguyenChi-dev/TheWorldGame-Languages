# Language World

Web game học ngoại ngữ dạng thế giới thu nhỏ 3D low-poly. Người chơi tạo nhân vật, chọn vùng đất
theo ngôn ngữ, học qua nông trại và các cửa hàng trong thành phố, chơi online cùng nhau theo thời gian
thực và cài được trên điện thoại như app (PWA). Có trang admin để quản lý nội dung học.

> Trạng thái: **mới có phần khung**. Chưa có đăng nhập thật, nông trại, bài học hay kết nối Supabase thật.

## Cấu trúc

```
language-world/
├── apps/
│   ├── web/        Next.js: trang giới thiệu, game, API tính vàng       → cổng 3000
│   ├── admin/      Next.js: trang quản trị nội dung                      → cổng 3001
│   └── realtime/   Node.js + Colyseus: phòng theo vùng, vị trí, chat     → cổng 2567
├── packages/
│   ├── game/       Babylon.js: engine, cảnh 3D, nhân vật (KHÔNG React)
│   ├── shared/     Kiểu dữ liệu, bảng giá, công thức thưởng, tin nhắn realtime, từ vựng
│   ├── ui/         Component React dùng chung (Button, Panel) cho web và admin
│   └── tsconfig/   Cấu hình TypeScript gốc, các gói khác kế thừa
├── supabase/
│   ├── config.toml cấu hình Supabase CLI
│   ├── migrations/ file SQL tạo bảng + bảo mật RLS
│   └── seed.sql    dữ liệu mẫu (1 vùng đất, 10 từ, 3 hạt giống)
├── pnpm-workspace.yaml   khai báo các gói trong monorepo
├── turbo.json            các tác vụ dev, build, lint, typecheck
└── package.json          lệnh chạy chung ở thư mục gốc
```

### Mỗi phần làm gì

| Phần                | Tên gói        | Việc chính                                                                                                                                    |
| ------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web`          | `@lw/web`      | Trang `/` giới thiệu, `/play` chơi game (canvas toàn màn hình), store Zustand giữ số vàng, kết nối realtime, `/api/health`, manifest PWA.     |
| `apps/admin`        | `@lw/admin`    | Thanh bên: Tổng quan, Từ vựng, Vật phẩm, Người chơi. Có `noindex` để Google không lập chỉ mục. `src/proxy.ts` là nơi sẽ kiểm tra quyền admin. |
| `apps/realtime`     | `@lw/realtime` | Máy chủ Colyseus, phòng `region` tối đa 30 người, đồng bộ vị trí `x, z` và chat bằng câu có sẵn.                                              |
| `packages/game`     | `@lw/game`     | `startGame(canvas, options)` trả về `{ dispose, setRemotePlayers }`. Lưới đất 6x6, camera xoay/kéo/phóng bằng chuột và cảm ứng.               |
| `packages/shared`   | `@lw/shared`   | Nguồn dữ liệu gốc dùng chung: kiểu, `SEEDS`, phần thưởng, `REGION_ROOM`, `CHAT_PHRASES`, 10 từ vựng.                                          |
| `packages/ui`       | `@lw/ui`       | `Button`, `Panel` viết bằng Tailwind.                                                                                                         |
| `packages/tsconfig` | `@lw/tsconfig` | `base.json`, `nextjs.json`, `react-library.json`, `browser-library.json`, `node.json`.                                                        |

Các gói trong `packages/` xuất thẳng mã TypeScript, không cần build riêng. Next.js tự biên dịch
chúng (khai báo trong `transpilePackages`), còn máy chủ realtime dùng `tsx` khi dev và `esbuild` khi build.

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
```

Chưa điền gì cũng chạy được: game sẽ kết nối tới `ws://localhost:2567`.

## Các lệnh

Chạy ở thư mục gốc:

| Lệnh             | Việc làm                                                     |
| ---------------- | ------------------------------------------------------------ |
| `pnpm dev`       | Chạy cả 3 app cùng lúc (web 3000, admin 3001, realtime 2567) |
| `pnpm build`     | Build tất cả                                                 |
| `pnpm lint`      | Kiểm tra code bằng ESLint                                    |
| `pnpm typecheck` | Kiểm tra kiểu TypeScript ở mọi gói                           |
| `pnpm format`    | Định dạng lại code bằng Prettier                             |

Chạy riêng từng app bằng `--filter`:

```bash
pnpm --filter @lw/web dev        # http://localhost:3000
pnpm --filter @lw/admin dev      # http://localhost:3001
pnpm --filter @lw/realtime dev   # ws://localhost:2567 (tự khởi động lại khi sửa code)
```

`--filter` dùng được với mọi lệnh, ví dụ `pnpm --filter @lw/game typecheck`.

### Thử nhanh

1. `pnpm dev`, mở http://localhost:3000, bấm **Chơi game**.
2. Góc trên bên phải hiện `Online: 1`. Mở thêm một tab `/play` thì thành `Online: 2`.
3. Chạm vào một ô đất: khối vàng (bạn) di chuyển, tab kia thấy một khối màu đi tới đúng ô đó.
4. Tắt máy chủ realtime rồi tải lại trang: game vẫn chạy, góc màn hình hiện `Offline`.
5. http://localhost:3000/api/health trả về `{"ok":true}`.
6. http://localhost:3001/words hiện bảng 10 từ, `/items` hiện 3 hạt giống.

### Supabase

Supabase CLI được cài sẵn trong dự án, gọi qua `pnpm supabase ...`:

```bash
pnpm supabase migration new ten_migration   # tạo file SQL mới trong supabase/migrations
pnpm supabase start                         # chạy Supabase trên máy (cần Docker Desktop)
pnpm supabase db reset                      # tạo lại database từ migrations + seed.sql
```

## Ba quy tắc bắt buộc

1. **`packages/game` không import React.** Game chỉ nói chuyện với web qua `startGame()` và callback.
   Nhờ vậy engine 3D không phụ thuộc vào cách React vẽ lại giao diện.
2. **Máy chủ realtime không xử lý vàng.** Nó chỉ đồng bộ vị trí và chat. Mọi thay đổi vàng/phần thưởng
   đi qua API của `apps/web` (đặt cạnh `src/app/api/health`), dùng công thức trong `@lw/shared`.
3. **Khóa bí mật Supabase chỉ nằm phía máy chủ.** Không bao giờ đặt khóa bí mật vào biến
   `NEXT_PUBLIC_...` hay vào code chạy trên trình duyệt. Trình duyệt chỉ dùng khóa publishable, và RLS
   trong `supabase/migrations` đảm bảo người chơi chỉ đọc được dữ liệu của mình.

## Công nghệ

pnpm workspaces · Turborepo · TypeScript · Next.js 16 (App Router, Turbopack) · Tailwind CSS 4 ·
Zustand · Babylon.js 9 · Colyseus 0.18 (`@colyseus/sdk` ở trình duyệt) · Supabase (`@supabase/ssr`).
