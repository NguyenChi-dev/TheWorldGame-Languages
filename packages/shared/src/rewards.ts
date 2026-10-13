/**
 * Công thức thưởng vàng. Chỉ apps/api được dùng các hàm này để cộng vàng thật;
 * phía trình duyệt chỉ dùng để hiển thị trước con số.
 */
import { SEEDS, type SeedId } from "./seeds";

/** Số vàng người chơi mới có khi bắt đầu. */
export const STARTING_GOLD = 100;

/** Vàng thưởng thêm mỗi lần thu hoạch (ngoài tiền bán nông sản). */
export const HARVEST_BONUS_GOLD = 5;

/** Vàng thưởng khi làm đúng một câu hỏi trong bài học. */
export const CORRECT_ANSWER_GOLD = 10;

/** Tổng vàng nhận được khi thu hoạch và bán một cây. */
export function harvestGold(seedId: SeedId): number {
  return SEEDS[seedId].sellPrice + HARVEST_BONUS_GOLD;
}
