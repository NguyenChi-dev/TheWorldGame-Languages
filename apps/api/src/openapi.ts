/**
 * Tài liệu OpenAPI 3.1 cho Swagger UI (GET /api-docs, GET /openapi.json).
 *
 * Schema KHÔNG viết tay: sinh thẳng từ các schema Zod trong @lw/shared/api (z.toJSONSchema),
 * chính là các schema route dùng để kiểm tra dữ liệu. Sửa schema thì tài liệu tự đổi theo.
 *
 * Thêm route mới thì thêm 1 dòng vào ROUTES bên dưới. Test src/openapi.test.ts báo lỗi nếu
 * có route trong app mà chưa có trong tài liệu (hoặc ngược lại).
 */
import { z } from "zod";
import {
  AdminMeResponse,
  AdminStatsQuery,
  AdminStatsResponse,
  BuyRequest,
  BuyResponse,
  CatalogSeedsResponse,
  ErrorResponse,
  HarvestRequest,
  HarvestResponse,
  HealthResponse,
  LessonParams,
  LessonSubmitRequest,
  LessonSubmitResponse,
  MeResponse,
  PlantRequest,
  PlantResponse,
  SellRequest,
  SellResponse,
  WaterRequest,
  WaterResponse,
} from "@lw/shared/api";

/** Ai được gọi route: không cần đăng nhập, người đã đăng nhập, hay nhân viên (admin/editor/moderator + TOTP). */
type Access = "public" | "user" | "staff";

interface RouteDoc {
  method: "get" | "post";
  /** Đường dẫn kiểu OpenAPI: tham số viết {id}, không phải :id. */
  path: string;
  tag: string;
  summary: string;
  description?: string;
  access: Access;
  params?: z.ZodObject;
  query?: z.ZodObject;
  body?: z.ZodType;
  response: z.ZodType;
  /** Route mới có khung, hiện luôn trả 501. */
  notImplemented?: boolean;
}

const TAGS = {
  system: "Hệ thống",
  catalog: "Danh mục",
  account: "Tài khoản",
  farm: "Nông trại",
  shop: "Cửa hàng",
  lessons: "Bài học",
  admin: "Quản trị",
} as const;

export const ROUTES: RouteDoc[] = [
  {
    method: "get",
    path: "/health",
    tag: TAGS.system,
    summary: "Kiểm tra máy chủ còn sống",
    access: "public",
    response: HealthResponse,
  },
  {
    method: "get",
    path: "/catalog/seeds",
    tag: TAGS.catalog,
    summary: "Danh sách hạt giống và bảng giá",
    access: "public",
    response: CatalogSeedsResponse,
  },
  {
    method: "get",
    path: "/me",
    tag: TAGS.account,
    summary: "Người đang đăng nhập",
    access: "user",
    response: MeResponse,
  },
  {
    method: "post",
    path: "/farm/plant",
    tag: TAGS.farm,
    summary: "Gieo hạt vào ô đất",
    access: "user",
    body: PlantRequest,
    response: PlantResponse,
    notImplemented: true,
  },
  {
    method: "post",
    path: "/farm/water",
    tag: TAGS.farm,
    summary: "Tưới cây",
    access: "user",
    body: WaterRequest,
    response: WaterResponse,
    notImplemented: true,
  },
  {
    method: "post",
    path: "/farm/harvest",
    tag: TAGS.farm,
    summary: "Thu hoạch",
    access: "user",
    body: HarvestRequest,
    response: HarvestResponse,
    notImplemented: true,
  },
  {
    method: "post",
    path: "/shop/buy",
    tag: TAGS.shop,
    summary: "Mua vật phẩm",
    description: "Giá đọc từ database, không nhận giá từ trình duyệt.",
    access: "user",
    body: BuyRequest,
    response: BuyResponse,
    notImplemented: true,
  },
  {
    method: "post",
    path: "/shop/sell",
    tag: TAGS.shop,
    summary: "Bán vật phẩm",
    access: "user",
    body: SellRequest,
    response: SellResponse,
    notImplemented: true,
  },
  {
    method: "post",
    path: "/lessons/{id}/submit",
    tag: TAGS.lessons,
    summary: "Nộp bài học",
    access: "user",
    params: LessonParams,
    body: LessonSubmitRequest,
    response: LessonSubmitResponse,
    notImplemented: true,
  },
  {
    method: "get",
    path: "/admin/me",
    tag: TAGS.admin,
    summary: "Nhân viên đang đăng nhập và vai trò",
    access: "staff",
    response: AdminMeResponse,
  },
  {
    method: "get",
    path: "/admin/stats",
    tag: TAGS.admin,
    summary: "Thống kê cho trang Tổng quan",
    access: "staff",
    query: AdminStatsQuery,
    response: AdminStatsResponse,
    notImplemented: true,
  },
];

// -----------------------------------------------------------------------------
// Chuyển đổi sang OpenAPI
// -----------------------------------------------------------------------------

type JsonSchema = Record<string, unknown>;

/** io "input": dạng dữ liệu GỬI LÊN (trước coerce/default); "output": dạng TRẢ VỀ. */
function toSchema(schema: z.ZodType, io: "input" | "output"): JsonSchema {
  // OpenAPI tự khai báo phiên bản JSON Schema, bỏ trường $schema của từng schema con.
  const json: JsonSchema = z.toJSONSchema(schema, { io, unrepresentable: "any" });
  delete json.$schema;
  return json;
}

function toParameters(schema: z.ZodObject, location: "path" | "query") {
  const json = toSchema(schema, "input") as { properties?: Record<string, JsonSchema>; required?: string[] };
  return Object.entries(json.properties ?? {}).map(([name, property]) => ({
    name,
    in: location,
    required: location === "path" || (json.required ?? []).includes(name),
    schema: property,
  }));
}

const errorContent = { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } };
const error = (description: string) => ({ description, content: errorContent });

function toOperation(route: RouteDoc) {
  const responses: Record<string, unknown> = {
    200: {
      description: "Thành công",
      content: { "application/json": { schema: toSchema(route.response, "output") } },
    },
  };
  if (route.params || route.query || route.body) responses[400] = error("Dữ liệu gửi lên không hợp lệ");
  if (route.access !== "public") {
    responses[401] = error("Chưa đăng nhập, hoặc token sai/hết hạn");
    responses[503] = error("Chưa cấu hình Supabase hoặc không kết nối được Supabase");
  }
  if (route.access === "staff") {
    responses[403] = error("Không phải nhân viên, hoặc token chưa qua xác thực hai lớp (TOTP)");
  }
  if (route.notImplemented) responses[501] = error("Route mới có khung, chưa làm");

  const accessNote = {
    public: "Không cần đăng nhập.",
    user: "Cần đăng nhập (Bearer token).",
    staff: "Chỉ nhân viên (admin, editor, moderator) với token đã qua xác thực hai lớp (aal2).",
  }[route.access];

  return {
    tags: [route.tag],
    summary: route.notImplemented ? `${route.summary} (chưa làm, trả 501)` : route.summary,
    description: [route.description, accessNote].filter(Boolean).join("\n\n"),
    ...(route.access === "public" ? { security: [] } : {}),
    parameters: [
      ...(route.params ? toParameters(route.params, "path") : []),
      ...(route.query ? toParameters(route.query, "query") : []),
    ],
    ...(route.body
      ? {
          requestBody: {
            required: true,
            content: { "application/json": { schema: toSchema(route.body, "input") } },
          },
        }
      : {}),
    responses,
  };
}

function buildDocument() {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const route of ROUTES) {
    paths[route.path] ??= {};
    paths[route.path][route.method] = toOperation(route);
  }

  return {
    openapi: "3.1.0",
    info: {
      title: "Language World API",
      version: "0.1.0",
      description: [
        'Backend của Language World (apps/api). Mọi lỗi đều có dạng `{ "error": "<thông báo tiếng Việt>" }`.',
        "",
        "**Lấy token để bấm Authorize:** token là `access_token` đăng nhập Supabase. Ví dụ trong console",
        "trình duyệt của trang game/admin: `(await supabase.auth.getSession()).data.session.access_token`,",
        "hoặc gọi `POST <SUPABASE_URL>/auth/v1/token?grant_type=password` với header `apikey: <publishable key>`",
        'và body `{ "email": "...", "password": "..." }`.',
        "",
        "Route `/admin/*` cần token đã qua xác thực hai lớp (TOTP, `aal2`): token chỉ có mật khẩu sẽ bị 403.",
      ].join("\n"),
    },
    tags: Object.values(TAGS).map((name) => ({ name })),
    // Mặc định mọi route cần token; route công khai tự ghi đè bằng security: [].
    security: [{ bearerAuth: [] }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT (access_token của Supabase)" },
      },
      schemas: { ErrorResponse: toSchema(ErrorResponse, "output") },
    },
    paths,
  };
}

export const openApiDocument = buildDocument();
