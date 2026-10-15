/**
 * Đường dẫn chuyển tới sau khi bấm link trong email (?next=...).
 * Chỉ nhận đường dẫn TRONG trang web: chặn //trang-la.com, https://..., dấu \ (một số trình duyệt
 * coi như /). Bỏ phần ?query. Không hợp lệ thì trả null.
 */
export function safeNext(next: string | null): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return null;
  return next.split("?")[0];
}
