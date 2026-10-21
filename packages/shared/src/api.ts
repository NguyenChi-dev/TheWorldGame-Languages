/**
 * Giao kèo giữa apps/api (máy chủ) và các app gọi vào nó (web, admin, app điện thoại).
 *
 * - Mỗi route có schema Zod cho dữ liệu GỬI LÊN (Request) và dữ liệu TRẢ VỀ (Response).
 * - apps/api dùng schema để kiểm tra dữ liệu thật lúc chạy.
 * - apps/web chỉ dùng KIỂU (import type), nên Zod không bị đóng gói vào trình duyệt.
 *
 * Nhập từ "@lw/shared/api" (không phải "@lw/shared") để các gói khác không phải kéo theo Zod.
 * Thêm route mới cho game thì khai báo schema ở đây khi bắt đầu làm phần đó.
 */
import { z } from "zod";
import { BOTTOM_KEYS, GENDERS, HAT_KEYS, TOP_KEYS } from "./characters";
import { ROLES, STAFF_ROLES } from "./roles";
import { USERNAME_PATTERN, USERNAME_RULE } from "./slug";

// -----------------------------------------------------------------------------
// Dùng chung
// -----------------------------------------------------------------------------

/** Mọi lỗi từ apps/api đều có dạng này. */
export const ErrorResponse = z.object({ error: z.string() });
export type ErrorResponse = z.infer<typeof ErrorResponse>;

// -----------------------------------------------------------------------------
// GET /health
// -----------------------------------------------------------------------------

export const HealthResponse = z.object({
  ok: z.literal(true),
  service: z.literal("api"),
  /** Giờ máy chủ dạng ISO, ví dụ "2026-10-13T02:00:00.000Z". */
  time: z.string(),
});
export type HealthResponse = z.infer<typeof HealthResponse>;

// -----------------------------------------------------------------------------
// GET /me, PATCH /me: hồ sơ của người đang đăng nhập
// -----------------------------------------------------------------------------

/** Quy tắc tên nhân vật: xem USERNAME_PATTERN trong slug.ts. */
export { USERNAME_PATTERN, USERNAME_RULE };

/** Ngoại hình nhân vật: nam / nữ + 3 món đồ (xem HATS, TOPS, BOTTOMS trong characters.ts). */
export const CharacterAppearance = z.strictObject({
  gender: z.enum(GENDERS),
  hat: z.enum(HAT_KEYS),
  top: z.enum(TOP_KEYS),
  bottom: z.enum(BOTTOM_KEYS),
});

export const MeResponse = z.object({
  id: z.string(),
  email: z.string().nullable(),
  /** Tên nhân vật (null nếu chưa đặt). */
  username: z.string().nullable(),
  role: z.enum(ROLES),
  /** Ngoại hình nhân vật đã phối; null = chưa chọn, game mở màn chọn nhân vật. */
  appearance: CharacterAppearance.nullable(),
  /** Vùng đất (ngôn ngữ) đang chọn; null = chưa chọn, game mở màn chọn vùng đất. */
  landId: z.string().nullable(),
});
export type MeResponse = z.infer<typeof MeResponse>;

const Username = z.string().trim().regex(USERNAME_PATTERN, { error: USERNAME_RULE });

/** Đổi tên nhân vật, ngoại hình và / hoặc vùng đất đang chọn. Gửi ít nhất 1 trường. */
export const UpdateMeRequest = z
  .object({
    username: Username.optional(),
    appearance: CharacterAppearance.optional(),
    /** Id vùng đất muốn vào (phải đang bật). */
    landId: z.uuid().optional(),
  })
  .refine(
    (body) => body.username !== undefined || body.appearance !== undefined || body.landId !== undefined,
    { error: "Gửi username, appearance hoặc landId" },
  );
export type UpdateMeRequest = z.infer<typeof UpdateMeRequest>;

// -----------------------------------------------------------------------------
// POST /auth/signup: tạo tài khoản người chơi (đã xác nhận sẵn, không cần email xác nhận)
// -----------------------------------------------------------------------------

export const MIN_PASSWORD_LENGTH = 8;

export const SignUpRequest = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: "Email không hợp lệ" })),
  password: z
    .string()
    .min(MIN_PASSWORD_LENGTH, `Mật khẩu tối thiểu ${MIN_PASSWORD_LENGTH} ký tự`)
    .max(72, "Mật khẩu tối đa 72 ký tự"),
  username: z.string().trim().regex(USERNAME_PATTERN, { error: USERNAME_RULE }),
});
export type SignUpRequest = z.input<typeof SignUpRequest>;

export const SignUpResponse = z.object({
  id: z.string(),
  email: z.string(),
  username: z.string(),
});
export type SignUpResponse = z.infer<typeof SignUpResponse>;

// -----------------------------------------------------------------------------
// Quản trị: GET /admin/me
// -----------------------------------------------------------------------------

export const AdminMeResponse = z.object({
  id: z.string(),
  email: z.string().nullable(),
  role: z.enum(STAFF_ROLES),
});
export type AdminMeResponse = z.infer<typeof AdminMeResponse>;

// -----------------------------------------------------------------------------
// Quản trị: quản lý tài khoản người chơi (/admin/players)
// -----------------------------------------------------------------------------

/** Trạng thái tài khoản: đang hoạt động, chưa xác nhận email, đang bị khóa. */
export const PLAYER_STATUSES = ["active", "unconfirmed", "banned"] as const;
export type PlayerStatus = (typeof PLAYER_STATUSES)[number];

export const PLAYER_STATUS_LABELS: Record<PlayerStatus, string> = {
  active: "Đang hoạt động",
  unconfirmed: "Chưa xác nhận email",
  banned: "Đang bị khóa",
};

export const AdminPlayer = z.object({
  id: z.string(),
  email: z.string().nullable(),
  username: z.string().nullable(),
  role: z.enum(ROLES),
  status: z.enum(PLAYER_STATUSES),
  /** Thời gian dạng chuỗi ISO. */
  createdAt: z.string(),
  lastSignInAt: z.string().nullable(),
  emailConfirmedAt: z.string().nullable(),
  /** Khóa tới lúc nào (null = không bị khóa). */
  bannedUntil: z.string().nullable(),
  /** Đã thiết lập xác thực hai lớp (có khóa TOTP đã xác minh). */
  mfaEnabled: z.boolean(),
});
export type AdminPlayer = z.infer<typeof AdminPlayer>;

/** Nhóm tài khoản: người chơi (role player) hay quản trị viên (admin, editor, moderator). */
export const ACCOUNT_GROUPS = ["players", "staff"] as const;
export type AccountGroup = (typeof ACCOUNT_GROUPS)[number];

/** Query string, ví dụ /admin/players?group=staff&search=meo&status=banned&page=2 */
export const AdminPlayersQuery = z.object({
  group: z.enum(["all", ...ACCOUNT_GROUPS]).default("all"),
  search: z.string().trim().max(100).default(""),
  status: z.enum(["all", ...PLAYER_STATUSES]).default("all"),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(5).max(100).default(20),
});
export type AdminPlayersQuery = z.input<typeof AdminPlayersQuery>;
export type AdminPlayersQueryParsed = z.output<typeof AdminPlayersQuery>;

export const AdminPlayersResponse = z.object({
  players: z.array(AdminPlayer),
  /** Số tài khoản khớp bộ lọc (để phân trang). */
  total: z.int().min(0),
  page: z.int().min(1),
  perPage: z.int().min(1),
  /** Số tài khoản của mỗi nhóm (cho tab Người chơi / Quản trị viên). */
  groups: z.object({ players: z.int().min(0), staff: z.int().min(0) }),
  /** Số liệu trong nhóm đang xem (không theo tìm kiếm / trạng thái). */
  stats: z.object({
    total: z.int().min(0),
    active: z.int().min(0),
    unconfirmed: z.int().min(0),
    banned: z.int().min(0),
    signedInLast7Days: z.int().min(0),
  }),
});
export type AdminPlayersResponse = z.infer<typeof AdminPlayersResponse>;

export const AdminPlayerParams = z.object({ id: z.uuid({ error: "Mã người chơi không hợp lệ" }) });

/** Thao tác nặng (khóa, xóa) bắt buộc ghi lý do vào nhật ký. */
export const AdminReasonRequest = z.object({
  reason: z.string().trim().min(1, "Nhập lý do").max(300, "Lý do tối đa 300 ký tự"),
});
export type AdminReasonRequest = z.infer<typeof AdminReasonRequest>;

export const AdminBanRequest = AdminReasonRequest.extend({
  /** Số ngày khóa; null = khóa vô thời hạn. */
  days: z.int().min(1).max(3650).nullable().default(null),
});
export type AdminBanRequest = z.input<typeof AdminBanRequest>;

export const AdminRenamePlayerRequest = z.object({ username: Username });
export type AdminRenamePlayerRequest = z.infer<typeof AdminRenamePlayerRequest>;

/** Kết quả mỗi thao tác: thông báo + tài khoản sau khi đổi (xóa thì player = null). */
export const AdminPlayerActionResponse = z.object({
  message: z.string(),
  player: AdminPlayer.nullable(),
});
export type AdminPlayerActionResponse = z.infer<typeof AdminPlayerActionResponse>;
