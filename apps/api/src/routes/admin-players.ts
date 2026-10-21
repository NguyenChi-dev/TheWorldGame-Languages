import { Hono, type Context } from "hono";
import { requiresAal2, rolesFor } from "@lw/shared";
import {
  AdminBanRequest,
  AdminPlayerParams,
  AdminPlayersQuery,
  AdminReasonRequest,
  AdminRenamePlayerRequest,
  type AdminPlayer,
  type AdminPlayerActionResponse,
} from "@lw/shared/api";
import { writeAdminLog } from "../lib/admin-log.js";
import { ApiError, Messages } from "../lib/errors.js";
import { getSupabaseAdmin } from "../lib/supabase.js";
import { validate } from "../lib/validate.js";
import { env } from "../env.js";
import { auth } from "../middleware/auth.js";
import { requireRole, type StaffEnv } from "../middleware/require-role.js";
import { FOREVER_BAN, getPlayer, listPlayers, updateAuthUser } from "../services/players.service.js";

/**
 * Quản lý tài khoản người chơi (trang "Người chơi" của apps/admin).
 *   - Xem danh sách: admin và moderator.
 *   - Mọi thao tác thay đổi: CHỈ admin, ghi nhật ký admin_logs.
 * Quy tắc an toàn:
 *   - Không thao tác lên chính mình.
 *   - Khóa / xóa chỉ áp dụng cho tài khoản 'player'. Tài khoản nhân viên phải hạ vai trò trước
 *     (đổi vai trò làm ở trang admin, có ghi nhật ký riêng).
 */
const ADMIN_ONLY = requireRole(rolesFor("players.manage"), { aal2: requiresAal2("players.manage") });
/** Thao tác trên tài khoản nhân viên (đặt lại 2 lớp): quyền staff.manage, luôn cần AAL2. */
const STAFF_MANAGER = requireRole(rolesFor("staff.manage"), { aal2: requiresAal2("staff.manage") });

function supabaseOrFail() {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new ApiError(503, Messages.supabaseNotConfigured);
  return supabase;
}

/** Đọc tài khoản đích và kiểm tra quy tắc an toàn. */
async function loadTarget(c: Context<StaffEnv>, id: string, options: { playerOnly?: boolean } = {}) {
  if (id === c.get("user").id) throw new ApiError(403, "Không thao tác được trên tài khoản của chính bạn");
  const player = await getPlayer(supabaseOrFail(), id);
  if (options.playerOnly && player.role !== "player") {
    throw new ApiError(403, "Đây là tài khoản nhân viên. Hãy hạ vai trò xuống Người chơi trước.");
  }
  return player;
}

/** Ghi nhật ký rồi trả kết quả; ghi nhật ký lỗi thì báo kèm trong thông báo. */
async function done(
  c: Context<StaffEnv>,
  log: { action: string; target: AdminPlayer; before: unknown; after: unknown; reason?: string },
  message: string,
  player: AdminPlayer | null,
) {
  const logError = await writeAdminLog(supabaseOrFail(), {
    actorId: c.get("user").id,
    actorRole: c.get("role"),
    action: log.action,
    targetTable: "auth.users",
    targetId: log.target.id,
    before: log.before,
    after: log.after,
    reason: log.reason,
  });
  return c.json({
    message: logError ? `${message}. ${logError}` : message,
    player,
  } satisfies AdminPlayerActionResponse);
}

const who = (player: AdminPlayer) => player.username ?? player.email ?? player.id;

export const adminPlayerRoutes = new Hono<StaffEnv>()
  .use(auth, requireRole(rolesFor("players.read")))

  .get("/", validate("query", AdminPlayersQuery), async (c) => {
    const query = c.req.valid("query");
    return c.json(await listPlayers(supabaseOrFail(), query));
  })

  .get("/:id", validate("param", AdminPlayerParams), async (c) => {
    return c.json(await getPlayer(supabaseOrFail(), c.req.valid("param").id));
  })

  /** Xác nhận email thay người chơi (khi họ không nhận được email). */
  .post("/:id/confirm-email", ADMIN_ONLY, validate("param", AdminPlayerParams), async (c) => {
    const target = await loadTarget(c, c.req.valid("param").id);
    if (target.emailConfirmedAt) throw new ApiError(409, "Email của tài khoản này đã được xác nhận");
    const after = await updateAuthUser(supabaseOrFail(), target.id, { email_confirm: true });
    return done(
      c,
      {
        action: "players.confirm_email",
        target,
        before: { emailConfirmedAt: null },
        after: { emailConfirmedAt: after.emailConfirmedAt },
      },
      `Đã xác nhận email cho ${who(target)}`,
      after,
    );
  })

  /** Gửi email đặt lại mật khẩu (admin KHÔNG bao giờ thấy hay tự đặt mật khẩu của người chơi). */
  .post("/:id/password-reset", ADMIN_ONLY, validate("param", AdminPlayerParams), async (c) => {
    const target = await loadTarget(c, c.req.valid("param").id);
    if (!target.email) throw new ApiError(409, "Tài khoản này không có email");
    const { error } = await supabaseOrFail().auth.resetPasswordForEmail(target.email, {
      redirectTo: `${env.WEB_URL}/auth/callback?next=/reset-password`,
    });
    if (error) {
      if (error.code === "over_email_send_rate_limit" || error.status === 429) {
        throw new ApiError(429, "Gửi email quá nhiều lần, thử lại sau ít phút");
      }
      console.error("[players] Không gửi được email đặt lại mật khẩu:", error.message);
      throw new ApiError(500, Messages.internal);
    }
    return done(
      c,
      { action: "players.send_password_reset", target, before: null, after: { email: target.email } },
      `Đã gửi email đặt lại mật khẩu tới ${target.email}`,
      target,
    );
  })

  /** Khóa tài khoản (không đăng nhập được, phiên hiện tại hết hạn trong tối đa 1 giờ). */
  .post(
    "/:id/ban",
    ADMIN_ONLY,
    validate("param", AdminPlayerParams),
    validate("json", AdminBanRequest),
    async (c) => {
      const { reason, days } = c.req.valid("json");
      const target = await loadTarget(c, c.req.valid("param").id, { playerOnly: true });
      const after = await updateAuthUser(supabaseOrFail(), target.id, {
        ban_duration: days ? `${days * 24}h` : FOREVER_BAN,
      });
      return done(
        c,
        {
          action: "players.ban",
          target,
          before: { bannedUntil: target.bannedUntil },
          after: { bannedUntil: after.bannedUntil, days },
          reason,
        },
        days ? `Đã khóa ${who(target)} trong ${days} ngày` : `Đã khóa ${who(target)} vô thời hạn`,
        after,
      );
    },
  )

  .post(
    "/:id/unban",
    ADMIN_ONLY,
    validate("param", AdminPlayerParams),
    validate("json", AdminReasonRequest),
    async (c) => {
      const { reason } = c.req.valid("json");
      const target = await loadTarget(c, c.req.valid("param").id);
      if (target.status !== "banned") throw new ApiError(409, "Tài khoản này không bị khóa");
      const after = await updateAuthUser(supabaseOrFail(), target.id, { ban_duration: "none" });
      return done(
        c,
        {
          action: "players.unban",
          target,
          before: { bannedUntil: target.bannedUntil },
          after: { bannedUntil: null },
          reason,
        },
        `Đã mở khóa ${who(target)}`,
        after,
      );
    },
  )

  /** Đổi tên nhân vật (ví dụ tên phản cảm). */
  .patch(
    "/:id",
    ADMIN_ONLY,
    validate("param", AdminPlayerParams),
    validate("json", AdminRenamePlayerRequest),
    async (c) => {
      const { username } = c.req.valid("json");
      const target = await loadTarget(c, c.req.valid("param").id);
      const { error } = await supabaseOrFail().from("profiles").update({ username }).eq("id", target.id);
      if (error) {
        if (error.code === "23505") throw new ApiError(409, "Tên nhân vật này đã có người dùng");
        console.error("[players] Không đổi được tên:", error.message);
        throw new ApiError(500, Messages.internal);
      }
      const after = await getPlayer(supabaseOrFail(), target.id);
      return done(
        c,
        { action: "players.rename", target, before: { username: target.username }, after: { username } },
        `Đã đổi tên thành ${username}`,
        after,
      );
    },
  )

  /**
   * Đặt lại xác thực hai lớp của NHÂN VIÊN KHÁC (mất điện thoại / đổi máy): xóa mọi khóa TOTP.
   * Lần đăng nhập tới họ sẽ được yêu cầu quét mã QR mới. Chỉ admin đã qua 2 lớp, không tự đặt lại cho mình.
   */
  .post(
    "/:id/mfa-reset",
    STAFF_MANAGER,
    validate("param", AdminPlayerParams),
    validate("json", AdminReasonRequest),
    async (c) => {
      const { reason } = c.req.valid("json");
      const target = await loadTarget(c, c.req.valid("param").id);
      const supabase = supabaseOrFail();
      const { data, error } = await supabase.auth.admin.mfa.listFactors({ userId: target.id });
      if (error) {
        console.error("[players] Không đọc được thiết bị xác thực:", error.message);
        throw new ApiError(500, Messages.internal);
      }
      const factors = data?.factors ?? [];
      if (!factors.length) throw new ApiError(409, "Tài khoản này chưa thiết lập xác thực hai lớp");
      for (const factor of factors) {
        const { error: deleteError } = await supabase.auth.admin.mfa.deleteFactor({
          id: factor.id,
          userId: target.id,
        });
        if (deleteError) {
          console.error("[players] Không xóa được thiết bị xác thực:", deleteError.message);
          throw new ApiError(500, Messages.internal);
        }
      }
      const after = await getPlayer(supabase, target.id);
      return done(
        c,
        {
          action: "auth.mfa_reset",
          target,
          before: { factors: factors.map((f) => ({ id: f.id, type: f.factor_type, status: f.status })) },
          after: { factors: [] },
          reason,
        },
        `Đã đặt lại xác thực hai lớp cho ${who(target)}. Lần đăng nhập tới họ sẽ quét mã QR mới.`,
        after,
      );
    },
  )

  /** Xóa vĩnh viễn tài khoản (hồ sơ profiles tự xóa theo). */
  .delete(
    "/:id",
    ADMIN_ONLY,
    validate("param", AdminPlayerParams),
    validate("json", AdminReasonRequest),
    async (c) => {
      const { reason } = c.req.valid("json");
      const target = await loadTarget(c, c.req.valid("param").id, { playerOnly: true });
      const { error } = await supabaseOrFail().auth.admin.deleteUser(target.id);
      if (error) {
        console.error("[players] Không xóa được tài khoản:", error.message);
        throw new ApiError(500, Messages.internal);
      }
      return done(
        c,
        { action: "players.delete", target, before: target, after: null, reason },
        `Đã xóa tài khoản ${who(target)}`,
        null,
      );
    },
  );
