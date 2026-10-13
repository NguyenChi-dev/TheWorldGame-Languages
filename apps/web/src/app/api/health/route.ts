// Kiểm tra máy chủ web còn sống: GET /api/health -> { "ok": true }
// Các API tính vàng (thu hoạch, trả lời đúng...) sẽ đặt cạnh file này ở giai đoạn sau,
// vì vàng chỉ được tính ở máy chủ, không tin số liệu từ trình duyệt.

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ ok: true });
}
