"use client";

import { AuthCard } from "@/components/auth/auth-card";
import { Alert } from "@/components/auth/form";
import { primaryButtonClass } from "@/components/auth/styles";

/**
 * Lỗi không lường trước ở trang đăng nhập / đăng ký (ví dụ mất mạng giữa lúc gửi form, máy chủ
 * không phản hồi). Không hiện chi tiết lỗi: chỉ báo chung và cho thử lại.
 */
export default function AuthError({ reset }: { error: Error; reset: () => void }) {
  return (
    <AuthCard title="Không kết nối được" subtitle="Máy chủ không phản hồi hoặc mạng đang gián đoạn.">
      <div className="space-y-5">
        <Alert tone="error">
          Kiểm tra kết nối Internet rồi thử lại. Thông tin bạn nhập chưa được gửi đi.
        </Alert>
        <button type="button" onClick={reset} className={primaryButtonClass}>
          Thử lại
        </button>
      </div>
    </AuthCard>
  );
}
