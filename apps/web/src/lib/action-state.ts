/** Kết quả trả về của server action dùng với useActionState. */
export interface ActionState {
  error?: string;
  message?: string;
  /** Lỗi cần xử lý riêng ở giao diện, ví dụ "email_not_confirmed" thì hiện nút gửi lại email. */
  code?: "email_not_confirmed";
  /**
   * Giá trị người dùng đã nhập, trả lại khi có lỗi để điền lại form
   * (React tự xóa trắng form sau mỗi lần gửi). KHÔNG bao giờ trả lại mật khẩu.
   */
  values?: Record<string, string>;
}
