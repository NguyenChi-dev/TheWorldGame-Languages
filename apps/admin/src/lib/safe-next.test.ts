import { describe, expect, it } from "vitest";
import { safeNextPath, withNext } from "./safe-next";

describe("safeNextPath (chống open redirect, AUTH-12/13)", () => {
  it.each([
    ["/", "/"],
    ["/players", "/players"],
    ["/players?tab=staff", "/players?tab=staff"],
    ["/lands/abc/areas/xyz?tab=areas#map", "/lands/abc/areas/xyz?tab=areas#map"],
    ["/lands/skills", "/lands/skills"],
    ["/map-editor", "/map-editor"],
    ["/a/../players", "/players"],
  ])("giữ đường dẫn nội bộ %s", (value, expected) => {
    expect(safeNextPath(value)).toBe(expected);
  });

  it.each([
    undefined,
    null,
    42,
    "",
    "players",
    "https://evil.example/x",
    "http:/evil.example",
    "//evil.example",
    "///evil.example",
    "/\\evil.example",
    "\\evil.example",
    "/%2F%2Fevil.example",
    "/%5Cevil.example",
    "/\tevil",
    "/\nevil",
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "/players@evil.example",
    "/login",
    "/login?next=/login",
    "/login/mfa",
    "/signup?x=1",
    "/auth/callback",
    "/players/../login",
    "/khong-ton-tai",
    "/playersx",
    `/players/${"a".repeat(600)}`,
  ])("không nhận %j", (value) => {
    expect(safeNextPath(value)).toBe("/");
  });

  it("withNext chỉ thêm ?next khi khác Tổng quan", () => {
    expect(withNext("/login/mfa", "/")).toBe("/login/mfa");
    expect(withNext("/login/mfa", "/a?b=1")).toBe("/login/mfa?next=%2Fa%3Fb%3D1");
  });
});
