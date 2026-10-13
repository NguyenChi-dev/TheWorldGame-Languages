# apps/api: backend của Language World

Máy chủ **Hono** chạy trên **Node.js**, cổng **4000**.

Đây là nơi **duy nhất** được thay đổi dữ liệu game: vàng, nông trại, mua bán, bài học.
Web (`apps/web`), trang quản trị (`apps/admin`) và app điện thoại sau này đều gọi vào đây.
Máy chủ realtime (`apps/realtime`) chỉ lo vị trí và chat, không đụng tới dữ liệu này.

Vì sao phải có backend riêng? Mọi thứ chạy trên trình duyệt đều có thể bị người chơi sửa
(số vàng, giờ máy, giá tiền...). Backend nhận yêu cầu, **tự kiểm tra lại mọi thứ** theo dữ liệu
trong database và giờ máy chủ, rồi mới ghi.

## Chạy

```bash
cp apps/api/.env.example apps/api/.env   # lần đầu (để trống Supabase cũng chạy được)
pnpm --filter @lw/api dev                # http://localhost:4000, tự khởi động lại khi sửa code
pnpm --filter @lw/api test               # chạy test một lần
pnpm --filter @lw/api test:watch         # chạy test liên tục khi sửa code
pnpm --filter @lw/api build              # đóng gói ra dist/index.js
pnpm --filter @lw/api start              # chạy bản đã build
```

`pnpm dev` ở thư mục gốc cũng chạy luôn API cùng các app khác.

### Biến môi trường (`apps/api/.env`)

| Biến                        | Mặc định                                      | Ghi chú                                          |
| --------------------------- | --------------------------------------------- | ------------------------------------------------ |
| `PORT`                      | `4000`                                        |                                                  |
| `SUPABASE_URL`              | (trống)                                       | Thiếu thì route cần đăng nhập trả 503            |
| `SUPABASE_SERVICE_ROLE_KEY` | (trống)                                       | **KHÓA BÍ MẬT**, không bao giờ đưa vào web/admin |
| `CORS_ORIGINS`              | `http://localhost:3000,http://localhost:3001` | Các trang web được phép gọi API                  |

Khi thiếu Supabase, máy chủ vẫn chạy và in cảnh báo; các route cần đăng nhập trả
`503 { "error": "Chưa cấu hình Supabase" }` thay vì làm sập máy chủ.

## Danh sách route

| Route                      | Đăng nhập | Trạng thái | Việc làm                                           |
| -------------------------- | --------- | ---------- | -------------------------------------------------- |
| `GET /health`              | không     | chạy được  | `{ ok: true, service: "api", time }`               |
| `GET /catalog/seeds`       | không     | chạy được  | `{ seeds: [...] }` lấy từ `@lw/shared`             |
| `GET /me`                  | có        | chạy được  | `{ id, email }` của người đang đăng nhập           |
| `POST /farm/plant`         | có        | khung, 501 | Gieo hạt `{ plotId, seedId }`                      |
| `POST /farm/water`         | có        | khung, 501 | Tưới cây `{ plotId }`                              |
| `POST /farm/harvest`       | có        | khung, 501 | Thu hoạch `{ plotId }` → `{ gold, inventory }`     |
| `POST /shop/buy`           | có        | khung, 501 | Mua `{ itemId, quantity }` → `{ gold, inventory }` |
| `POST /shop/sell`          | có        | khung, 501 | Bán `{ itemId, quantity }` → `{ gold, inventory }` |
| `POST /lessons/:id/submit` | có        | khung, 501 | Nộp bài `{ answers: [{ wordId, answer }] }`        |
| `GET /admin/stats?days=7`  | admin     | khung, 501 | Thống kê cho trang quản trị                        |

Mọi lỗi đều có dạng `{ "error": "<thông báo tiếng Việt>" }`:

| Mã  | Khi nào                                                               |
| --- | --------------------------------------------------------------------- |
| 400 | Dữ liệu gửi lên sai, ví dụ `"Dữ liệu gửi lên không hợp lệ: plotId"`   |
| 401 | Không có token, hoặc token sai/hết hạn                                |
| 403 | Không phải admin, hoặc gọi từ trang web không có trong `CORS_ORIGINS` |
| 404 | Đường dẫn không tồn tại                                               |
| 501 | Route mới có khung, chưa làm                                          |
| 503 | Chưa cấu hình Supabase, hoặc không kết nối được Supabase              |

### Thử bằng curl

```bash
curl http://localhost:4000/health
curl http://localhost:4000/catalog/seeds
curl http://localhost:4000/me                                  # 401 Chưa đăng nhập
curl -H "Authorization: Bearer <access_token>" http://localhost:4000/me
curl -X POST http://localhost:4000/farm/harvest \
  -H "Authorization: Bearer <access_token>" -H "Content-Type: application/json" \
  -d '{"plotId":"33333333-3333-4333-8333-333333333333"}'       # 501 Chưa làm
```

`<access_token>` là token đăng nhập Supabase của người chơi (khi có trang đăng nhập, `apps/web`
sẽ tự gắn token này, xem `apps/web/src/lib/api.ts`).

## Cấu trúc thư mục

```
src/
├── index.ts            khởi động máy chủ (cổng, cảnh báo thiếu Supabase)
├── app.ts              ghép app: chặn nguồn lạ, CORS, giới hạn 64 KB, các route, xử lý lỗi
├── env.ts              đọc và kiểm tra biến môi trường bằng Zod
├── routes/             mỗi file một nhóm đường dẫn; chỉ nhận yêu cầu và trả kết quả
├── services/           logic nghiệp vụ (tính toán, quy tắc game), không biết gì về HTTP
├── middleware/
│   ├── auth.ts         kiểm tra token Supabase, gắn user vào context: c.get("user")
│   └── require-admin.ts đọc profiles.role trong database, chặn nếu không phải admin
└── lib/
    ├── supabase.ts     client Supabase dùng khóa bí mật (null nếu chưa cấu hình)
    ├── validate.ts     validate("json" | "query" | "param", schema): kiểm tra dữ liệu bằng Zod
    └── errors.ts       ApiError, thông báo lỗi tiếng Việt dùng chung
```

Schema Zod và kiểu dữ liệu của từng route **không** viết ở đây mà ở
`packages/shared/src/api.ts` (nhập bằng `@lw/shared/api`), để `apps/web` dùng chung đúng kiểu đó.

## Thêm một route mới

Ví dụ thêm `POST /shop/gift` để tặng vật phẩm cho bạn:

**1. Khai báo dữ liệu trong `packages/shared/src/api.ts`:**

```ts
export const GiftRequest = z.object({ toPlayerId: z.uuid(), itemId: z.string(), quantity: Quantity });
export type GiftRequest = z.infer<typeof GiftRequest>;
export const GiftResponse = z.object({ inventory: z.array(InventoryEntry) });
export type GiftResponse = z.infer<typeof GiftResponse>;
```

**2. Viết logic trong `src/services/shop.service.ts`** (hàm thường, nhận dữ liệu, trả kết quả):

```ts
export async function giftItem(fromUserId: string, input: GiftRequest): Promise<GiftResponse> {
  // kiểm tra túi đồ, trừ của người tặng, cộng cho người nhận...
}
```

**3. Gắn route trong `src/routes/shop.ts`:**

```ts
.post("/gift", validate("json", GiftRequest), async (c) => {
  const input = c.req.valid("json");             // đã kiểm tra, đúng kiểu
  const result = await giftItem(c.get("user").id, input); // user id lấy từ TOKEN, không lấy từ body
  return c.json(result satisfies GiftResponse);
})
```

Nếu là nhóm đường dẫn mới (file mới trong `routes/`), nhớ gắn nó trong `src/app.ts`:
`app.route("/ten-nhom", tenNhomRoutes)`.

**4. Thêm hàm gọi trong `apps/web/src/lib/api.ts`:**

```ts
gift: (body: GiftRequest) => apiFetch<GiftResponse>("/shop/gift", { method: "POST", body }),
```

**5. Viết test** (xem mục dưới), chạy `pnpm --filter @lw/api test`.

Quy tắc khi viết route:

- User id **luôn** lấy từ `c.get("user").id`, không bao giờ từ nội dung yêu cầu.
- Giá tiền, thời gian lớn, đáp án đúng: **đọc từ database hoặc `@lw/shared`**, không nhận từ trình duyệt.
- Thời gian: dùng **giờ máy chủ** (`new Date()` trên máy chủ, hoặc `now()` trong SQL).
- Khóa bí mật bỏ qua RLS, nên mọi truy vấn dữ liệu người chơi phải tự lọc `.eq("user_id", user.id)`.
- Muốn báo lỗi cho người dùng: `throw new ApiError(400, "Thông báo tiếng Việt")`.
- Các bước trừ/cộng (vàng, vật phẩm) phải nằm trong một giao dịch (hàm SQL), để không bị mất đồ giữa chừng.

## Test

Dùng **Vitest**. File test đặt cạnh file được test, tên kết thúc bằng `.test.ts`.

| File                                | Kiểm tra gì                                                         |
| ----------------------------------- | ------------------------------------------------------------------- |
| `src/services/farm.service.test.ts` | Hàm `isReady` thuần: cây chín đúng lúc, nhận chuỗi ISO, dữ liệu lỗi |
| `src/app.test.ts`                   | Gọi route thật bằng `app.request()`: health, 401, 503, CORS, 404    |
| `src/routes/routes.test.ts`         | Thay Supabase bằng bản giả (`vi.mock`) để thử token, 400, 403, 501  |

Một test cơ bản:

```ts
import { describe, expect, it } from "vitest";
import { isReady } from "./farm.service";

describe("isReady", () => {
  it("chín đúng lúc đủ thời gian", () => {
    const planted = new Date("2026-01-01T08:00:00Z");
    const now = new Date("2026-01-01T08:01:00Z"); // 60 giây sau
    expect(isReady(planted, 60, now)).toBe(true);
  });
});
```

Test luôn chạy với Supabase **để trống** (đặt trong `vitest.config.ts`), nên không bao giờ
chạm vào dữ liệu thật, kể cả khi máy bạn có file `.env`.

## Cấp quyền admin

Vai trò nằm ở cột `profiles.role` (`player` hoặc `admin`, mặc định `player`), thêm bởi migration
`supabase/migrations/*_add_profile_role.sql`. Người chơi không tự sửa được cột này. Để cấp quyền,
chạy trong SQL editor của Supabase:

```sql
update public.profiles set role = 'admin' where id = '<uuid của người dùng>';
```
