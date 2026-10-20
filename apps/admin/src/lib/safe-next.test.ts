import { describe, expect, it } from "vitest";
import { safeNextPath, withNext } from "./safe-next";

describe("safeNextPath (chống open redirect)", () => {
  it.each([
    ["/players", "/players"],
    ["/lands/abc?tab=areas#map", "/lands/abc?tab=areas#map"],
    ["/words/%2F..%2F", "/words/%2F..%2F"],
  ])("giữ đường dẫn nội bộ %s", (value, expected) => {
    expect(safeNextPath(value)).toBe(expected);
  });

  it.each([
    undefined,
    null,
    "",
    "players",
    "https://evil.example/x",
    "//evil.example",
    "///evil.example",
    "/\\evil.example",
    "/\tevil",
    "javascript:alert(1)",
    "/login",
    "/login/mfa",
    "/signup?x=1",
    "/auth/callback",
    `/${"a".repeat(600)}`,
  ])("không nhận %j", (value) => {
    expect(safeNextPath(value)).toBe("/");
  });

  it("chuẩn hóa '/../' về trong site", () => {
    expect(safeNextPath("/a/../players")).toBe("/players");
  });

  it("withNext chỉ thêm ?next khi khác Tổng quan", () => {
    expect(withNext("/login/mfa", "/")).toBe("/login/mfa");
    expect(withNext("/login/mfa", "/a?b=1")).toBe("/login/mfa?next=%2Fa%3Fb%3D1");
  });
});
