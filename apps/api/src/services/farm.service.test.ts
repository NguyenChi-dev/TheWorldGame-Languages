// Test cho logic nông trại. Chạy: pnpm --filter @lw/api test
import { describe, expect, it } from "vitest";
import { SEEDS } from "@lw/shared";
import { isReady, isSeedReady, readyAt } from "./farm.service";

// Dùng thời điểm cố định để test luôn cho cùng kết quả, không phụ thuộc giờ chạy test.
const PLANTED = new Date("2026-01-01T08:00:00.000Z");
const secondsLater = (seconds: number) => new Date(PLANTED.getTime() + seconds * 1000);

describe("isReady", () => {
  it("chưa chín khi chưa đủ thời gian", () => {
    expect(isReady(PLANTED, 60, secondsLater(59))).toBe(false);
  });

  it("chín đúng lúc đủ thời gian", () => {
    expect(isReady(PLANTED, 60, secondsLater(60))).toBe(true);
  });

  it("vẫn chín khi đã quá thời gian", () => {
    expect(isReady(PLANTED, 60, secondsLater(3600))).toBe(true);
  });

  it("nhận plantedAt dạng chuỗi ISO như khi đọc từ database", () => {
    expect(isReady("2026-01-01T08:00:00.000Z", 60, secondsLater(60))).toBe(true);
  });

  it("trả false khi plantedAt không phải ngày hợp lệ", () => {
    expect(isReady("không-phải-ngày", 60, secondsLater(9999))).toBe(false);
  });

  it("trả false khi thời gian lớn bị âm", () => {
    expect(isReady(PLANTED, -10, secondsLater(9999))).toBe(false);
  });
});

describe("isSeedReady (dùng thời gian lớn từ @lw/shared)", () => {
  it("cà rốt chín sau đúng số giây trong SEEDS", () => {
    const grow = SEEDS.carrot.growSeconds;
    expect(isSeedReady("carrot", PLANTED, secondsLater(grow - 1))).toBe(false);
    expect(isSeedReady("carrot", PLANTED, secondsLater(grow))).toBe(true);
  });

  it("ngô lâu chín hơn cà rốt", () => {
    const afterCarrotGrows = secondsLater(SEEDS.carrot.growSeconds);
    expect(isSeedReady("carrot", PLANTED, afterCarrotGrows)).toBe(true);
    expect(isSeedReady("corn", PLANTED, afterCarrotGrows)).toBe(false);
  });
});

describe("readyAt", () => {
  it("cộng đúng số giây vào lúc gieo hạt", () => {
    expect(readyAt(PLANTED, 120)?.toISOString()).toBe("2026-01-01T08:02:00.000Z");
  });
});
