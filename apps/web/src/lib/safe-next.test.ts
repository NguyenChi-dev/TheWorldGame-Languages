import { describe, expect, it } from "vitest";
import { safeNext } from "./safe-next";

const BACKSLASH = String.fromCharCode(92);

describe("safeNext", () => {
  it.each([
    ["/reset-password", "/reset-password"],
    ["/play?x=1", "/play"],
    [null, null],
    ["", null],
    ["https://trang-la.example", null],
    [`/${BACKSLASH}trang-la.example`, null],
    ["//trang-la.example", null],
    ["play", null],
  ])("%s → %s", (input, expected) => {
    expect(safeNext(input)).toBe(expected);
  });
});
