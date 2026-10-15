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
  AdminBanRequest,
  AdminMeResponse,
  AdminPlayer,
  AdminPlayerActionResponse,
  AdminPlayerParams,
  AdminPlayersQuery,
  AdminPlayersResponse,
  AdminReasonRequest,
  AdminRenamePlayerRequest,
  ErrorResponse,
  HealthResponse,
  MeResponse,
  SignUpRequest,
  SignUpResponse,
  UpdateMeRequest,
} from "@lw/shared/api";

/** Ai được gọi route: không cần đăng nhập, người đã đăng nhập, hay nhân viên (admin/editor/moderator + TOTP). */
type Access = "public" | "user" | "staff";

interface RouteDoc {
  method: "get" | "post" | "patch" | "delete";
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
  /** Lỗi riêng của route, ví dụ { 409: "Trùng tên" }. */
  extraErrors?: Record<number, string>;
  /** Ghi chú quyền riêng (mặc định theo access). */
  accessNote?: string;
}

const TAGS = {
  system: "Hệ thống",
  account: "Tài khoản",
  admin: "Quản trị",
  players: "Quản trị · Người chơi",
} as const;

const ADMIN_ONLY = "Chỉ admin. Ghi nhật ký admin_logs. Không thao tác được trên chính mình.";
const NOT_FOUND = { 404: "Không tìm thấy tài khoản" };

/** Các route quản lý tài khoản người chơi (src/routes/admin-players.ts). */
const PLAYER_ROUTES: RouteDoc[] = [
  {
    method: "get",
    path: "/admin/players",
    tag: TAGS.players,
    summary: "Danh sách tài khoản (tìm kiếm, lọc, phân trang) + số liệu",
    accessNote: "Admin và moderator.",
    access: "staff",
    query: AdminPlayersQuery,
    response: AdminPlayersResponse,
  },
  {
    method: "get",
    path: "/admin/players/{id}",
    tag: TAGS.players,
    summary: "Chi tiết một tài khoản",
    accessNote: "Admin và moderator.",
    access: "staff",
    params: AdminPlayerParams,
    response: AdminPlayer,
    extraErrors: NOT_FOUND,
  },
  {
    method: "post",
    path: "/admin/players/{id}/confirm-email",
    tag: TAGS.players,
    summary: "Xác nhận email thay người chơi",
    accessNote: ADMIN_ONLY,
    access: "staff",
    params: AdminPlayerParams,
    response: AdminPlayerActionResponse,
    extraErrors: { ...NOT_FOUND, 409: "Email đã được xác nhận" },
  },
  {
    method: "post",
    path: "/admin/players/{id}/password-reset",
    tag: TAGS.players,
    summary: "Gửi email đặt lại mật khẩu",
    accessNote: ADMIN_ONLY,
    access: "staff",
    params: AdminPlayerParams,
    response: AdminPlayerActionResponse,
    extraErrors: { ...NOT_FOUND, 429: "Gửi email quá nhiều lần" },
  },
  {
    method: "post",
    path: "/admin/players/{id}/ban",
    tag: TAGS.players,
    summary: "Khóa tài khoản (days = null: vô thời hạn)",
    accessNote: `${ADMIN_ONLY} Chỉ khóa được tài khoản người chơi.`,
    access: "staff",
    params: AdminPlayerParams,
    body: AdminBanRequest,
    response: AdminPlayerActionResponse,
    extraErrors: NOT_FOUND,
  },
  {
    method: "post",
    path: "/admin/players/{id}/unban",
    tag: TAGS.players,
    summary: "Mở khóa tài khoản",
    accessNote: ADMIN_ONLY,
    access: "staff",
    params: AdminPlayerParams,
    body: AdminReasonRequest,
    response: AdminPlayerActionResponse,
    extraErrors: { ...NOT_FOUND, 409: "Tài khoản không bị khóa" },
  },
  {
    method: "patch",
    path: "/admin/players/{id}",
    tag: TAGS.players,
    summary: "Đổi tên nhân vật",
    accessNote: ADMIN_ONLY,
    access: "staff",
    params: AdminPlayerParams,
    body: AdminRenamePlayerRequest,
    response: AdminPlayerActionResponse,
    extraErrors: { ...NOT_FOUND, 409: "Tên nhân vật đã có người dùng" },
  },
  {
    method: "delete",
    path: "/admin/players/{id}",
    tag: TAGS.players,
    summary: "Xóa vĩnh viễn tài khoản",
    accessNote: `${ADMIN_ONLY} Chỉ xóa được tài khoản người chơi.`,
    access: "staff",
    params: AdminPlayerParams,
    body: AdminReasonRequest,
    response: AdminPlayerActionResponse,
    extraErrors: NOT_FOUND,
  },
];

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
    method: "post",
    path: "/auth/signup",
    tag: TAGS.account,
    summary: "Tạo tài khoản người chơi (đã xác nhận sẵn, không gửi email)",
    description:
      "Tên nhân vật kiểm tra trùng trước. Vai trò luôn là player. Giới hạn 10 lần / 10 phút mỗi IP. " +
      "Tạo xong thì đăng nhập bằng email + mật khẩu như bình thường.",
    access: "public",
    body: SignUpRequest,
    response: SignUpResponse,
    extraErrors: {
      409: "Email đã có tài khoản / tên nhân vật đã có người dùng",
      429: "Tạo tài khoản quá nhiều lần",
    },
  },
  {
    method: "get",
    path: "/me",
    tag: TAGS.account,
    summary: "Hồ sơ người đang đăng nhập",
    description: "id, email lấy từ token; tên nhân vật và vai trò đọc từ bảng profiles.",
    access: "user",
    response: MeResponse,
  },
  {
    method: "patch",
    path: "/me",
    tag: TAGS.account,
    summary: "Đổi tên nhân vật",
    description: "Chỉ đổi tên của chính mình. Trùng tên (không phân biệt hoa thường) trả 409.",
    access: "user",
    body: UpdateMeRequest,
    response: MeResponse,
    extraErrors: { 409: "Tên nhân vật đã có người dùng" },
  },
  {
    method: "get",
    path: "/admin/me",
    tag: TAGS.admin,
    summary: "Nhân viên đang đăng nhập và vai trò",
    access: "staff",
    response: AdminMeResponse,
  },
  ...PLAYER_ROUTES,
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
  for (const [status, description] of Object.entries(route.extraErrors ?? {}))
    responses[status] = error(description);

  const accessNote =
    route.accessNote ??
    {
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
