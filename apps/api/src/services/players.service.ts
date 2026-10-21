/**
 * Quản lý tài khoản người chơi cho trang quản trị (dùng khóa bí mật, CHỈ chạy ở apps/api).
 *
 * Dữ liệu đăng nhập (email, xác nhận email, lần đăng nhập cuối, khóa) nằm ở auth.users của Supabase,
 * chỉ đọc / sửa được bằng Admin API (khóa bí mật). Tên nhân vật, vai trò nằm ở public.profiles.
 * Hàm ở đây ghép 2 nguồn thành AdminPlayer và thực hiện các thao tác quản lý.
 */
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { isRole } from "@lw/shared";
import type {
  AdminPlayer,
  AdminPlayersQueryParsed,
  AdminPlayersResponse,
  PlayerStatus,
} from "@lw/shared/api";
import { ApiError, Messages } from "../lib/errors.js";

/** "Khóa vô thời hạn" theo cách Supabase hiểu: 100 năm. */
export const FOREVER_BAN = "876000h";
const LIST_PAGE_SIZE = 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

interface ProfileRow {
  id: string;
  username: string | null;
  role: unknown;
}

export function playerStatus(
  user: Pick<User, "banned_until" | "email_confirmed_at">,
  now = new Date(),
): PlayerStatus {
  if (user.banned_until && new Date(user.banned_until) > now) return "banned";
  if (!user.email_confirmed_at) return "unconfirmed";
  return "active";
}

export function toAdminPlayer(user: User, profile: ProfileRow | undefined, now = new Date()): AdminPlayer {
  const status = playerStatus(user, now);
  return {
    id: user.id,
    email: user.email ?? null,
    username: profile?.username ?? null,
    role: isRole(profile?.role) ? profile.role : "player",
    status,
    createdAt: user.created_at,
    lastSignInAt: user.last_sign_in_at ?? null,
    emailConfirmedAt: user.email_confirmed_at ?? null,
    bannedUntil: status === "banned" ? (user.banned_until ?? null) : null,
    mfaEnabled: (user.factors ?? []).some((f) => f.factor_type === "totp" && f.status === "verified"),
  };
}

/** Đọc mọi tài khoản (Admin API phân trang tối đa 1000 / lần). Đủ dùng tới vài chục nghìn tài khoản. */
async function listAllUsers(supabase: SupabaseClient): Promise<User[]> {
  const users: User[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: LIST_PAGE_SIZE });
    if (error) {
      console.error("[players] Không đọc được auth.users:", error.message);
      throw new ApiError(500, Messages.internal);
    }
    users.push(...data.users);
    if (data.users.length < LIST_PAGE_SIZE) return users;
  }
}

async function readProfiles(supabase: SupabaseClient, ids?: string[]): Promise<Map<string, ProfileRow>> {
  let query = supabase.from("profiles").select("id, username, role");
  if (ids) query = query.in("id", ids);
  const { data, error } = await query;
  if (error) {
    console.error("[players] Không đọc được profiles:", error.message);
    throw new ApiError(500, Messages.internal);
  }
  return new Map((data as ProfileRow[]).map((row) => [row.id, row]));
}

/**
 * Danh sách có lọc theo nhóm (người chơi / quản trị viên), tìm kiếm (email / tên nhân vật), lọc trạng thái,
 * phân trang; kèm số tài khoản mỗi nhóm và số liệu của nhóm đang xem.
 */
export async function listPlayers(
  supabase: SupabaseClient,
  query: AdminPlayersQueryParsed,
  now = new Date(),
): Promise<AdminPlayersResponse> {
  const [users, profiles] = await Promise.all([listAllUsers(supabase), readProfiles(supabase)]);
  const everyone = users
    .map((user) => toAdminPlayer(user, profiles.get(user.id), now))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const isStaff = (p: AdminPlayer) => p.role !== "player";
  const groups = {
    players: everyone.filter((p) => !isStaff(p)).length,
    staff: everyone.filter(isStaff).length,
  };
  const all =
    query.group === "all" ? everyone : everyone.filter((p) => (query.group === "staff") === isStaff(p));

  const weekAgo = now.getTime() - 7 * DAY_MS;
  const stats = {
    total: all.length,
    active: all.filter((p) => p.status === "active").length,
    unconfirmed: all.filter((p) => p.status === "unconfirmed").length,
    banned: all.filter((p) => p.status === "banned").length,
    signedInLast7Days: all.filter((p) => p.lastSignInAt && new Date(p.lastSignInAt).getTime() >= weekAgo)
      .length,
  };

  const search = query.search.toLowerCase();
  const filtered = all.filter(
    (p) =>
      (query.status === "all" || p.status === query.status) &&
      (!search || p.email?.toLowerCase().includes(search) || p.username?.toLowerCase().includes(search)),
  );
  const start = (query.page - 1) * query.perPage;
  return {
    players: await withStaffMfa(supabase, filtered.slice(start, start + query.perPage)),
    total: filtered.length,
    page: query.page,
    perPage: query.perPage,
    groups,
    stats,
  };
}

/**
 * Danh sách người dùng của Admin API KHÔNG kèm thiết bị xác thực (factors), nên hỏi riêng cho các tài khoản
 * nhân viên trong trang đang xem (ít, vài chục). Người chơi không dùng 2 lớp nên giữ mfaEnabled=false.
 * Lỗi đọc thì giữ giá trị cũ (không làm hỏng cả danh sách).
 */
async function withStaffMfa(supabase: SupabaseClient, players: AdminPlayer[]): Promise<AdminPlayer[]> {
  return Promise.all(
    players.map(async (player) => {
      if (player.role === "player") return player;
      const { data, error } = await supabase.auth.admin.mfa.listFactors({ userId: player.id });
      if (error) return player;
      return {
        ...player,
        mfaEnabled: (data?.factors ?? []).some((f) => f.factor_type === "totp" && f.status === "verified"),
      };
    }),
  );
}

/** Một tài khoản theo id (404 nếu không có). */
export async function getPlayer(
  supabase: SupabaseClient,
  id: string,
  now = new Date(),
): Promise<AdminPlayer> {
  const { data, error } = await supabase.auth.admin.getUserById(id);
  if (error || !data.user) {
    if (error && error.status !== 404) console.error("[players] Không đọc được tài khoản:", error.message);
    throw new ApiError(404, "Không tìm thấy tài khoản");
  }
  const profiles = await readProfiles(supabase, [id]);
  return toAdminPlayer(data.user, profiles.get(id), now);
}

/** Đổi thông tin đăng nhập bằng Admin API (xác nhận email, khóa / mở khóa). */
export async function updateAuthUser(
  supabase: SupabaseClient,
  id: string,
  attributes: { email_confirm?: boolean; ban_duration?: string },
): Promise<AdminPlayer> {
  const { error } = await supabase.auth.admin.updateUserById(id, attributes);
  if (error) {
    console.error("[players] Không cập nhật được tài khoản:", error.message);
    throw new ApiError(500, Messages.internal);
  }
  return getPlayer(supabase, id);
}
