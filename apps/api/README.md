# apps/api: backend của Language World

Máy chủ **Hono** chạy trên **Node.js**, cổng **4000**.

Đây là nơi **duy nhất** được thay đổi dữ liệu của người chơi khi game có các tính năng đó
(hiện mới có kiểm tra máy chủ, tài khoản và quyền nhân viên; route game thêm dần khi làm tới phần nào).
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

### Swagger UI

Mở **http://localhost:4000/api-docs** để xem và gọi thử mọi route (đặc tả OpenAPI ở `/openapi.json`).
Route cần đăng nhập: bấm **Authorize**, dán `access_token` Supabase (cách lấy ghi ngay đầu trang docs).

Tài liệu sinh tự động từ schema Zod trong `@lw/shared/api` (xem `src/openapi.ts`), nên luôn khớp với
cách API kiểm tra dữ liệu. Thêm route mới thì thêm 1 dòng vào `ROUTES` trong `src/openapi.ts`;
`src/openapi.test.ts` sẽ báo lỗi nếu quên.

### Biến môi trường (`apps/api/.env`)

| Biến                        | Mặc định                                      | Ghi chú                                          |
| --------------------------- | --------------------------------------------- | ------------------------------------------------ |
| `PORT`                      | `4000`                                        |                                                  |
| `SUPABASE_URL`              | (trống)                                       | Thiếu thì route cần đăng nhập trả 503            |
| `SUPABASE_SERVICE_ROLE_KEY` | (trống)                                       | **KHÓA BÍ MẬT**, không bao giờ đưa vào web/admin |
| `CORS_ORIGINS`              | `http://localhost:3000,http://localhost:3001` | Các trang web được phép gọi API                  |
| `API_DOCS`                  | `true`                                        | `false` để tắt `/api-docs` và `/openapi.json`    |

Khi thiếu Supabase, máy chủ vẫn chạy và in cảnh báo; các route cần đăng nhập trả
`503 { "error": "Chưa cấu hình Supabase" }` thay vì làm sập máy chủ.

## Danh sách route

| Route               | Đăng nhập | Việc làm                                           |
| ------------------- | --------- | -------------------------------------------------- |
| `GET /api-docs`     | không     | Swagger UI (tắt bằng `API_DOCS=false`)             |
| `GET /openapi.json` | không     | Đặc tả OpenAPI 3.1                                 |
| `GET /health`       | không     | `{ ok: true, service: "api", time }`               |
| `GET /me`           | có        | `{ id, email }` của người đang đăng nhập           |
| `GET /admin/me`     | nhân viên | `{ id, email, role }` của nhân viên đang đăng nhập |

Mọi lỗi đều có dạng `{ "error": "<thông báo tiếng Việt>" }`:

| Mã  | Khi nào                                                           |
| --- | ----------------------------------------------------------------- |
| 400 | Dữ liệu gửi lên sai, ví dụ `"Dữ liệu gửi lên không hợp lệ: name"` |
| 401 | Không có token, hoặc token sai/hết hạn                            |
| 403 | Không phải nhân viên, token chưa qua TOTP, hoặc nguồn lạ (CORS)   |
| 404 | Đường dẫn không tồn tại                                           |
| 501 | Route mới có khung, chưa làm                                      |
| 503 | Chưa cấu hình Supabase, hoặc không kết nối được Supabase          |

### Thử bằng curl

```bash
curl http://localhost:4000/health
curl http://localhost:4000/me                                  # 401 Chưa đăng nhập
curl -H "Authorization: Bearer <access_token>" http://localhost:4000/me
curl -H "Authorization: Bearer <access_token>" http://localhost:4000/admin/me   # 403 nếu không phải nhân viên
```

`<access_token>` là token đăng nhập Supabase của người chơi (khi có trang đăng nhập, `apps/web`
sẽ tự gắn token này, xem `apps/web/src/lib/api.ts`).

## Cấu trúc thư mục

```
src/
├── index.ts            khởi động máy chủ (cổng, cảnh báo thiếu Supabase)
├── app.ts              ghép app: chặn nguồn lạ, CORS, giới hạn 64 KB, các route, /api-docs, xử lý lỗi
├── openapi.ts          tài liệu OpenAPI (Swagger) sinh từ schema Zod, mỗi route 1 dòng trong ROUTES
├── env.ts              đọc và kiểm tra biến môi trường bằng Zod
├── routes/             mỗi file một nhóm đường dẫn; chỉ nhận yêu cầu và trả kết quả
├── services/           (tạo khi cần) logic nghiệp vụ, không biết gì về HTTP
├── middleware/
│   ├── auth.ts         kiểm tra token Supabase, gắn user vào context: c.get("user")
│   └── require-role.ts requireRole([...]): đọc profiles.role, bắt buộc token đã qua TOTP (aal2)
└── lib/
    ├── supabase.ts     client Supabase dùng khóa bí mật (null nếu chưa cấu hình)
    ├── validate.ts     validate("json" | "query" | "param", schema): kiểm tra dữ liệu bằng Zod
    └── errors.ts       ApiError, thông báo lỗi tiếng Việt dùng chung
```

Schema Zod và kiểu dữ liệu của từng route **không** viết ở đây mà ở
`packages/shared/src/api.ts` (nhập bằng `@lw/shared/api`), để `apps/web` dùng chung đúng kiểu đó.

## Thêm một route mới

Ví dụ thêm `GET /lands` để game đọc danh sách vùng đất đang bật:

**1. Khai báo dữ liệu trong `packages/shared/src/api.ts`:**

```ts
export const LandsResponse = z.object({
  lands: z.array(z.object({ id: z.string(), slug: z.string(), name: z.string() })),
});
export type LandsResponse = z.infer<typeof LandsResponse>;
```

**2. Viết logic trong `src/services/lands.service.ts`** (hàm thường, nhận dữ liệu, trả kết quả):

```ts
export async function listActiveLands(): Promise<LandsResponse> {
  // đọc bảng lands (is_active = true), sắp theo sort_order...
}
```

**3. Gắn route trong `src/routes/lands.ts`:**

```ts
export const landRoutes = new Hono().get("/", async (c) =>
  c.json((await listActiveLands()) satisfies LandsResponse),
);
```

Route nhận dữ liệu gửi lên thì kiểm tra bằng `validate("json", Schema)`, và user id **luôn** lấy từ
token (`c.get("user").id`), không lấy từ nội dung yêu cầu.

Nếu là nhóm đường dẫn mới (file mới trong `routes/`), nhớ gắn nó trong `src/app.ts`:
`app.route("/ten-nhom", tenNhomRoutes)`.

**4. Thêm hàm gọi trong `apps/web/src/lib/api.ts`:**

```ts
lands: () => apiFetch<LandsResponse>("/lands", { auth: false }),
```

**5. Thêm vào tài liệu Swagger:** 1 dòng trong `ROUTES` của `src/openapi.ts`.

**6. Viết test** (xem mục dưới), chạy `pnpm --filter @lw/api test`.

Quy tắc khi viết route:

- User id **luôn** lấy từ `c.get("user").id`, không bao giờ từ nội dung yêu cầu.
- Giá tiền, thời gian, đáp án đúng: **đọc từ database**, không nhận từ trình duyệt.
- Thời gian: dùng **giờ máy chủ** (`new Date()` trên máy chủ, hoặc `now()` trong SQL).
- Khóa bí mật bỏ qua RLS, nên mọi truy vấn dữ liệu người chơi phải tự lọc `.eq("user_id", user.id)`.
- Muốn báo lỗi cho người dùng: `throw new ApiError(400, "Thông báo tiếng Việt")`.
- Các bước trừ/cộng (vàng, vật phẩm) phải nằm trong một giao dịch (hàm SQL), để không bị mất đồ giữa chừng.

## Test

Dùng **Vitest**. File test đặt cạnh file được test, tên kết thúc bằng `.test.ts`.

| File                        | Kiểm tra gì                                                      |
| --------------------------- | ---------------------------------------------------------------- |
| `src/app.test.ts`           | Gọi route thật bằng `app.request()`: health, 401, 503, CORS, 404 |
| `src/routes/routes.test.ts` | Thay Supabase bằng bản giả (`vi.mock`) để thử token, 401, 403    |
| `src/openapi.test.ts`       | Tài liệu Swagger khớp đủ route thật, `/api-docs` chạy, tắt được  |

Một test cơ bản:

```ts
import { describe, expect, it } from "vitest";
import { app } from "./app";

describe("GET /health", () => {
  it("trả về ok", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
  });
});
```

Test luôn chạy với Supabase **để trống** (đặt trong `vitest.config.ts`), nên không bao giờ
chạm vào dữ liệu thật, kể cả khi máy bạn có file `.env`.

## Vai trò và cấp quyền

"Nhân viên" là tài khoản có `profiles.role` là `admin`, `editor` hoặc `moderator` (enum `user_role`,
mặc định `player`). Route `/admin/*` còn đòi token đã qua xác thực hai lớp (claim `aal` = `aal2`),
giống trang quản trị và RLS. Route chỉ dành cho một số vai trò: thêm `requireRole(["admin"])` riêng.

Tài khoản mới (đăng ký ở game hoặc `apps/admin/signup`) tự có hồ sơ vai trò `player`. Admin cấp
vai trò ở trang **Người chơi** của `apps/admin` (có ghi nhật ký), hoặc chạy trong SQL editor:

```sql
update public.profiles set role = 'admin' where id = '<uuid của người dùng>';
```
