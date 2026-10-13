/** Kết quả trả về của server action dùng với useActionState. */
export interface ActionState {
  error?: string;
  message?: string;
  /**
   * Giá trị người dùng đã nhập, trả lại khi có lỗi để điền lại form
   * (React tự xóa trắng form sau mỗi lần gửi). KHÔNG bao giờ trả lại mật khẩu.
   */
  values?: Record<string, string>;
}

/**
 * Kết quả của server action gọi trực tiếp từ client (không qua form), ví dụ createLand(input).
 * `code` cho biết lỗi cần xử lý riêng ở giao diện (ví dụ cần người dùng xác nhận rồi gửi lại).
 */
export type ActionResult<T = undefined> =
  | { ok: true; message: string; data?: T }
  | { ok: false; error: string; code?: "confirm_skill_change"; lessonCount?: number };
