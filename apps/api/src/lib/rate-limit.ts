/**
 * Giới hạn số lần gọi trong một khoảng thời gian, theo từng "khóa" (ví dụ địa chỉ IP).
 * Lưu trong bộ nhớ của tiến trình: đủ cho 1 máy chủ; chạy nhiều máy chủ thì cần chỗ lưu chung (Redis...).
 */
export function createRateLimiter(options: { limit: number; windowMs: number }) {
  const hits = new Map<string, number[]>();

  return {
    /** true nếu còn được phép (và tính thêm 1 lần), false nếu đã vượt giới hạn. */
    take(key: string, now = Date.now()): boolean {
      const recent = (hits.get(key) ?? []).filter((time) => now - time < options.windowMs);
      if (recent.length >= options.limit) {
        hits.set(key, recent);
        return false;
      }
      recent.push(now);
      hits.set(key, recent);
      // Dọn khóa cũ để bộ nhớ không phình mãi.
      if (hits.size > 10_000) {
        for (const [k, times] of hits)
          if (times.every((time) => now - time >= options.windowMs)) hits.delete(k);
      }
      return true;
    },
    reset() {
      hits.clear();
    },
  };
}
