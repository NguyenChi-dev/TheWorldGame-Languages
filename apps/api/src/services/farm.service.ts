/**
 * Logic nghiệp vụ của nông trại. Không biết gì về HTTP hay Hono, nên dễ viết test.
 *
 * QUY TẮC: mọi phép tính thời gian dùng GIỜ MÁY CHỦ (tham số `now`, mặc định là bây giờ trên máy chủ).
 * Không bao giờ tin giờ do trình duyệt gửi lên, nếu không người chơi chỉnh đồng hồ máy là thu hoạch sớm được.
 */
import { SEEDS, type SeedId } from "@lw/shared";

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

/** Thời điểm cây chín, hoặc null nếu plantedAt không phải ngày hợp lệ. */
export function readyAt(plantedAt: Date | string, growSeconds: number): Date | null {
  const planted = toDate(plantedAt);
  if (Number.isNaN(planted.getTime())) return null;
  return new Date(planted.getTime() + growSeconds * 1000);
}

/**
 * Cây đã chín chưa?
 * @param plantedAt   lúc gieo hạt (lấy từ database, cột farm_plots.planted_at)
 * @param growSeconds số giây cây cần để lớn (lấy từ SEEDS trong @lw/shared)
 * @param now         giờ máy chủ hiện tại
 */
export function isReady(plantedAt: Date | string, growSeconds: number, now: Date = new Date()): boolean {
  if (!Number.isFinite(growSeconds) || growSeconds < 0) return false;
  const ready = readyAt(plantedAt, growSeconds);
  return ready !== null && now.getTime() >= ready.getTime();
}

/** Như isReady nhưng tự lấy thời gian lớn của hạt giống từ bảng giá dùng chung. */
export function isSeedReady(seedId: SeedId, plantedAt: Date | string, now: Date = new Date()): boolean {
  return isReady(plantedAt, SEEDS[seedId].growSeconds, now);
}
