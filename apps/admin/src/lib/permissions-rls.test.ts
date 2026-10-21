/**
 * Đối chiếu ma trận thao tác PERMISSIONS (@lw/shared) với RLS trong supabase/migrations.
 * Mục đích: sửa quyền ở một lớp mà quên lớp kia thì test này đỏ (menu cho phép nhưng database từ chối,
 * hoặc tệ hơn: database cho phép mà ứng dụng không định cho).
 * Test đọc file SQL, không cần database. Kiểm tra hành vi thật của RLS nằm ở supabase/tests (pgTAP).
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PERMISSIONS, ROLES, can, requiresAal2, rolesFor, type Permission } from "@lw/shared";

const MIGRATIONS = path.resolve(__dirname, "../../../../supabase/migrations");

/** Policy hiện hành (migration sau ghi đè / xóa policy cùng tên của migration trước). */
function currentPolicies() {
  const policies = new Map<
    string,
    { table: string; command: string; roles: string[] | null; aal2: boolean }
  >();
  for (const file of fs
    .readdirSync(MIGRATIONS)
    .filter((name) => name.endsWith(".sql"))
    .sort()) {
    const sql = fs.readFileSync(path.join(MIGRATIONS, file), "utf8").replace(/--[^\n]*/g, "");
    for (const statement of sql.split(";")) {
      const drop = statement.match(/drop\s+policy\s+(?:if\s+exists\s+)?("[^"]+"|\w+)\s+on\s+public\.(\w+)/i);
      if (drop) policies.delete(`${drop[2]}:${drop[1]}`);
      const create = statement.match(
        /create\s+policy\s+("[^"]+"|\w+)\s+on\s+public\.(\w+)\s+for\s+(select|insert|update|delete|all)/i,
      );
      if (!create) continue;
      const roles = [...statement.matchAll(/has_staff_role\('\{([a-z,]+)\}'\)/g)].map((m) => m[1]);
      // Mọi has_staff_role trong một policy phải cùng danh sách vai trò.
      expect(new Set(roles).size, `${create[1]} dùng nhiều danh sách vai trò khác nhau`).toBeLessThanOrEqual(
        1,
      );
      policies.set(`${create[2]}:${create[1]}`, {
        table: create[2],
        command: create[3].toLowerCase(),
        roles: roles[0]?.split(",").sort() ?? null,
        aal2: /has_aal2()/.test(statement),
      });
    }
  }
  return policies;
}

/** Bảng + lệnh → thao tác tương ứng trong ma trận. */
const RLS_TO_PERMISSION: Record<string, Permission> = {
  "lands:select": "content.read",
  "lands:insert": "content.create",
  "lands:update": "content.update",
  "lands:delete": "content.delete",
  "areas:select": "content.read",
  "areas:insert": "content.create",
  "areas:update": "content.update",
  "areas:delete": "content.delete",
  "skills:insert": "content.create",
  "skills:update": "content.update",
  "skills:delete": "content.delete",
  "media:insert": "media.create",
  "media:update": "media.update",
  "media:delete": "media.delete",
  "profiles:select": "players.read",
  "profiles:update": "staff.manage",
  "admin_logs:insert": "logs.write",
  "admin_logs:select": "logs.read",
};

describe("ma trận phân quyền khớp RLS", () => {
  const staffPolicies = [...currentPolicies().values()].filter((policy) => policy.roles);

  it("mọi policy dùng has_staff_role đều có thao tác tương ứng và cùng danh sách vai trò", () => {
    expect(staffPolicies.length).toBeGreaterThan(10);
    for (const policy of staffPolicies) {
      const key = `${policy.table}:${policy.command}`;
      const permission = RLS_TO_PERMISSION[key];
      expect(permission, `chưa ánh xạ policy ${key} vào PERMISSIONS`).toBeDefined();
      expect(policy.roles, `${key} ↔ ${permission}`).toEqual([...rolesFor(permission)].sort());
    }
  });

  it("thao tác nhạy cảm (AAL2_PERMISSIONS) luôn đòi has_aal2() trong RLS, thao tác khác thì không", () => {
    for (const policy of staffPolicies) {
      const permission = RLS_TO_PERMISSION[`${policy.table}:${policy.command}`];
      expect(policy.aal2, `${policy.table}:${policy.command} ↔ ${permission}`).toBe(requiresAal2(permission));
    }
  });

  it("mọi thao tác ghi trong ánh xạ đều có policy trong database", () => {
    const found = new Set(staffPolicies.map((policy) => `${policy.table}:${policy.command}`));
    for (const key of Object.keys(RLS_TO_PERMISSION)) expect(found.has(key), key).toBe(true);
  });
});

describe("can / rolesFor", () => {
  it("player và vai trò lạ / thiếu không có quyền quản trị nào (mặc định từ chối)", () => {
    for (const permission of Object.keys(PERMISSIONS) as Permission[]) {
      expect(can("player", permission)).toBe(false);
      expect(can(null, permission)).toBe(false);
      expect(can(undefined, permission)).toBe(false);
      expect(can("superadmin" as never, permission)).toBe(false);
    }
  });

  it("đọc ≠ sửa ≠ xóa; quản lý người chơi ≠ quản lý nhân viên", () => {
    expect(can("moderator", "content.read")).toBe(true);
    expect(can("moderator", "content.update")).toBe(false);
    expect(can("editor", "content.update")).toBe(true);
    expect(can("editor", "content.delete")).toBe(false);
    expect(can("moderator", "players.read")).toBe(true);
    expect(can("moderator", "players.manage")).toBe(false);
    expect(can("editor", "players.read")).toBe(false);
    for (const role of ["editor", "moderator"] as const) {
      expect(can(role, "staff.manage")).toBe(false);
      expect(can(role, "logs.read")).toBe(false);
      expect(can(role, "economy.manage")).toBe(false);
    }
  });

  it("mỗi vai trò trong ma trận là vai trò thật (khớp enum user_role)", () => {
    for (const roles of Object.values(PERMISSIONS)) for (const role of roles) expect(ROLES).toContain(role);
  });
});
