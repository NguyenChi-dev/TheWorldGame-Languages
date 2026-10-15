// Test quản lý tài khoản người chơi (/admin/players) với Supabase GIẢ: không chạm dữ liệu thật.
import { beforeEach, describe, expect, it, vi } from "vitest";

const ADMIN = { sub: "a0000000-0000-4000-8000-000000000001", email: "admin@lw.test", role: "admin" };
const MOD = { sub: "a0000000-0000-4000-8000-000000000002", email: "mod@lw.test", role: "moderator" };
const EDITOR = { sub: "a0000000-0000-4000-8000-000000000003", email: "editor@lw.test", role: "editor" };
const P1 = "b0000000-0000-4000-8000-000000000001"; // người chơi, đã xác nhận
const P2 = "b0000000-0000-4000-8000-000000000002"; // người chơi, chưa xác nhận
const P3 = "b0000000-0000-4000-8000-000000000003"; // người chơi, đang bị khóa
const TOKENS: Record<string, typeof ADMIN> = { "tk-admin": ADMIN, "tk-mod": MOD, "tk-editor": EDITOR };

/** "Database" giả, đặt lại trước mỗi test. */
const db = vi.hoisted(() => ({
  users: [] as Record<string, unknown>[],
  profiles: [] as { id: string; username: string | null; role: string }[],
  logs: [] as Record<string, unknown>[],
  calls: [] as { fn: string; args: unknown[] }[],
}));

vi.mock("../lib/supabase", () => {
  const userById = (id: string) => db.users.find((u) => u.id === id);
  return {
    getSupabaseAdmin: () => ({
      auth: {
        getClaims: async (token: string) => {
          const user = TOKENS[token];
          return user
            ? {
                data: { claims: { sub: user.sub, email: user.email, role: "authenticated", aal: "aal2" } },
                error: null,
              }
            : { data: null, error: new Error("invalid JWT") };
        },
        resetPasswordForEmail: async (...args: unknown[]) => {
          db.calls.push({ fn: "resetPasswordForEmail", args });
          return { data: {}, error: null };
        },
        admin: {
          listUsers: async ({ page }: { page: number }) => ({
            data: { users: page === 1 ? db.users : [] },
            error: null,
          }),
          getUserById: async (id: string) =>
            userById(id)
              ? { data: { user: userById(id) }, error: null }
              : { data: { user: null }, error: { status: 404, message: "User not found" } },
          updateUserById: async (id: string, attrs: { email_confirm?: boolean; ban_duration?: string }) => {
            db.calls.push({ fn: "updateUserById", args: [id, attrs] });
            const user = userById(id)!;
            if (attrs.email_confirm) user.email_confirmed_at = "2026-10-15T00:00:00Z";
            if (attrs.ban_duration === "none") user.banned_until = null;
            else if (attrs.ban_duration) user.banned_until = "2999-01-01T00:00:00Z";
            return { data: { user }, error: null };
          },
          deleteUser: async (id: string) => {
            db.calls.push({ fn: "deleteUser", args: [id] });
            db.users = db.users.filter((u) => u.id !== id);
            return { data: {}, error: null };
          },
        },
      },
      from: (table: string) => {
        const rows = () => (table === "profiles" ? db.profiles : []);
        const builder = {
          select: () => builder,
          in: (_col: string, ids: string[]) => ({
            then: (resolve: (v: unknown) => unknown) =>
              resolve({ data: rows().filter((r) => ids.includes(r.id)), error: null }),
          }),
          eq: (_col: string, id: string) => ({
            maybeSingle: async () => ({
              data: table === "profiles" ? (db.profiles.find((p) => p.id === id) ?? null) : null,
              error: null,
            }),
          }),
          maybeSingle: async () => ({ data: { require_mfa: true }, error: null }),
          update: (values: { username: string }) => ({
            eq: async (_col: string, id: string) => {
              if (values.username === "Trùng_Tên") return { error: { code: "23505", message: "duplicate" } };
              db.profiles.find((p) => p.id === id)!.username = values.username;
              return { error: null };
            },
          }),
          insert: async (row: Record<string, unknown>) => {
            db.logs.push(row);
            return { error: null };
          },
          then: (resolve: (v: unknown) => unknown) => resolve({ data: rows(), error: null }),
        };
        return builder;
      },
    }),
  };
});

const { app } = await import("../app");

const as = (token: string, init: RequestInit = {}) => ({
  ...init,
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
});
const post = (token: string, path: string, body?: unknown) =>
  app.request(
    path,
    as(token, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }),
  );

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  // Tạo lần lượt: tài khoản thêm sau có ngày tạo muộn hơn.
  let day = 0;
  const user = (id: string, email: string, extra: Record<string, unknown> = {}) => ({
    id,
    email,
    created_at: `2026-10-0${++day}T00:00:00Z`,
    last_sign_in_at: "2026-10-14T00:00:00Z",
    email_confirmed_at: "2026-10-01T00:00:00Z",
    banned_until: null,
    ...extra,
  });
  db.users = [
    user(ADMIN.sub, ADMIN.email),
    user(MOD.sub, MOD.email),
    user(EDITOR.sub, EDITOR.email),
    user(P1, "meo@lw.test"),
    user(P2, "cho@lw.test", { email_confirmed_at: null, last_sign_in_at: null }),
    user(P3, "ga@lw.test", { banned_until: "2999-01-01T00:00:00Z" }),
  ];
  db.profiles = [
    { id: ADMIN.sub, username: "Quản_trị", role: "admin" },
    { id: MOD.sub, username: "Điều_hành", role: "moderator" },
    { id: EDITOR.sub, username: "Biên_tập", role: "editor" },
    { id: P1, username: "Mèo_Ú", role: "player" },
    { id: P2, username: "Chó_Con", role: "player" },
    { id: P3, username: "Gà_Trống", role: "player" },
  ];
  db.logs = [];
  db.calls = [];
});

describe("GET /admin/players", () => {
  it("admin xem được danh sách, mới nhất trước, kèm số liệu", async () => {
    const res = await app.request("/admin/players", as("tk-admin"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      players: { id: string; status: string }[];
      total: number;
      stats: object;
    };
    expect(body.total).toBe(6);
    expect(body.players[0].id).toBe(P3);
    expect(body.stats).toEqual({
      total: 6,
      active: 4,
      unconfirmed: 1,
      banned: 1,
      signedInLast7Days: expect.any(Number),
    });
  });

  it("tìm theo tên nhân vật / email, lọc theo trạng thái, phân trang", async () => {
    const search = (await (await app.request("/admin/players?search=m%C3%A8o", as("tk-admin"))).json()) as {
      players: { id: string }[];
    };
    expect(search.players.map((p) => p.id)).toEqual([P1]);

    const banned = (await (await app.request("/admin/players?status=banned", as("tk-admin"))).json()) as {
      players: { id: string; status: string }[];
    };
    expect(banned.players).toEqual([expect.objectContaining({ id: P3, status: "banned" })]);

    const page2 = (await (await app.request("/admin/players?perPage=5&page=2", as("tk-admin"))).json()) as {
      players: unknown[];
      total: number;
    };
    expect(page2).toMatchObject({ total: 6 });
    expect(page2.players).toHaveLength(1);
  });

  it("moderator xem được, editor bị chặn 403", async () => {
    expect((await app.request("/admin/players", as("tk-mod"))).status).toBe(200);
    expect((await app.request("/admin/players", as("tk-editor"))).status).toBe(403);
  });

  it("chưa đăng nhập: 401", async () => {
    expect((await app.request("/admin/players")).status).toBe(401);
  });
});

describe("Nhóm tài khoản (group)", () => {
  it("group=players chỉ có người chơi; group=staff chỉ có quản trị viên; kèm số mỗi nhóm", async () => {
    const players = (await (await app.request("/admin/players?group=players", as("tk-admin"))).json()) as {
      players: { role: string }[];
      groups: object;
      stats: { total: number };
    };
    expect(players.players.every((p) => p.role === "player")).toBe(true);
    expect(players.groups).toEqual({ players: 3, staff: 3 });
    expect(players.stats.total).toBe(3);

    const staff = (await (await app.request("/admin/players?group=staff", as("tk-admin"))).json()) as {
      players: { role: string }[];
    };
    expect(staff.players.map((p) => p.role).sort()).toEqual(["admin", "editor", "moderator"]);
  });

  it("group lạ: 400", async () => {
    expect((await app.request("/admin/players?group=khach", as("tk-admin"))).status).toBe(400);
  });
});

describe("Thao tác (chỉ admin)", () => {
  it("moderator không làm được thao tác thay đổi", async () => {
    const res = await post("tk-mod", `/admin/players/${P2}/confirm-email`);
    expect(res.status).toBe(403);
    expect(db.calls).toEqual([]);
  });

  it("xác nhận email: đổi trạng thái, ghi nhật ký", async () => {
    const res = await post("tk-admin", `/admin/players/${P2}/confirm-email`);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      message: "Đã xác nhận email cho Chó_Con",
      player: { status: "active" },
    });
    expect(db.logs).toEqual([
      expect.objectContaining({
        actor_id: ADMIN.sub,
        actor_role: "admin",
        action: "players.confirm_email",
        target_id: P2,
      }),
    ]);
  });

  it("xác nhận email đã xác nhận rồi: 409", async () => {
    expect((await post("tk-admin", `/admin/players/${P1}/confirm-email`)).status).toBe(409);
  });

  it("gửi email đặt lại mật khẩu: link về web game", async () => {
    const res = await post("tk-admin", `/admin/players/${P1}/password-reset`);
    expect(res.status).toBe(200);
    expect(db.calls).toEqual([
      {
        fn: "resetPasswordForEmail",
        args: ["meo@lw.test", { redirectTo: "http://localhost:3000/auth/callback?next=/reset-password" }],
      },
    ]);
  });

  it("khóa 7 ngày: cần lý do, ghi nhật ký kèm lý do", async () => {
    expect((await post("tk-admin", `/admin/players/${P1}/ban`, { days: 7 })).status).toBe(400);
    const res = await post("tk-admin", `/admin/players/${P1}/ban`, { days: 7, reason: "Spam chat" });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      message: "Đã khóa Mèo_Ú trong 7 ngày",
      player: { status: "banned" },
    });
    expect(db.calls).toContainEqual({ fn: "updateUserById", args: [P1, { ban_duration: "168h" }] });
    expect(db.logs[0]).toMatchObject({ action: "players.ban", reason: "Spam chat" });
  });

  it("khóa vô thời hạn khi days = null", async () => {
    await post("tk-admin", `/admin/players/${P1}/ban`, { days: null, reason: "Gian lận" });
    expect(db.calls).toContainEqual({ fn: "updateUserById", args: [P1, { ban_duration: "876000h" }] });
  });

  it("mở khóa; mở khóa tài khoản không bị khóa thì 409", async () => {
    expect((await post("tk-admin", `/admin/players/${P3}/unban`, { reason: "Đã xử lý xong" })).status).toBe(
      200,
    );
    expect((await post("tk-admin", `/admin/players/${P1}/unban`, { reason: "x" })).status).toBe(409);
  });

  it("không khóa / xóa được tài khoản nhân viên, không thao tác được trên chính mình", async () => {
    const staff = await post("tk-admin", `/admin/players/${EDITOR.sub}/ban`, { reason: "x" });
    expect(staff.status).toBe(403);
    expect(await staff.json()).toEqual({
      error: "Đây là tài khoản nhân viên. Hãy hạ vai trò xuống Người chơi trước.",
    });
    const self = await post("tk-admin", `/admin/players/${ADMIN.sub}/confirm-email`);
    expect(self.status).toBe(403);
    expect(db.calls).toEqual([]);
  });

  it("đổi tên nhân vật; trùng tên thì 409", async () => {
    const ok = await app.request(
      `/admin/players/${P1}`,
      as("tk-admin", { method: "PATCH", body: JSON.stringify({ username: "Mèo_Mập" }) }),
    );
    expect(await ok.json()).toMatchObject({ player: { username: "Mèo_Mập" } });
    const dup = await app.request(
      `/admin/players/${P1}`,
      as("tk-admin", { method: "PATCH", body: JSON.stringify({ username: "Trùng_Tên" }) }),
    );
    expect(dup.status).toBe(409);
  });

  it("xóa tài khoản: cần lý do, xóa xong player = null, ghi nhật ký kèm dữ liệu trước khi xóa", async () => {
    const res = await app.request(
      `/admin/players/${P2}`,
      as("tk-admin", { method: "DELETE", body: JSON.stringify({ reason: "Tài khoản rác" }) }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ message: "Đã xóa tài khoản Chó_Con", player: null });
    expect(db.calls).toEqual([{ fn: "deleteUser", args: [P2] }]);
    expect(db.logs[0]).toMatchObject({
      action: "players.delete",
      before: expect.objectContaining({ email: "cho@lw.test" }),
    });
  });

  it("mã tài khoản sai định dạng: 400; không tồn tại: 404", async () => {
    expect((await post("tk-admin", "/admin/players/khong-phai-uuid/confirm-email")).status).toBe(400);
    expect(
      (await post("tk-admin", "/admin/players/c0000000-0000-4000-8000-000000000009/confirm-email")).status,
    ).toBe(404);
  });
});
