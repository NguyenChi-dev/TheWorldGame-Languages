"use client";

import { useEffect } from "react";
import type { StaffRole } from "@lw/shared";
import { checkSession } from "@/app/(admin)/session-actions";

/** Kênh báo giữa các tab cùng trang quản trị (cùng trình duyệt). */
const CHANNEL = "lw-admin-session";
/** Hỏi lại máy chủ tối đa mỗi 5 phút khi tab đang mở (ngoài các lần quay lại tab). */
const INTERVAL_MS = 5 * 60 * 1000;

/** Gọi trước khi đăng xuất: các tab khác kiểm tra phiên ngay và tự về trang đăng nhập. */
export function announceSignOut() {
  try {
    const channel = new BroadcastChannel(CHANNEL);
    channel.postMessage("signed-out");
    channel.close();
  } catch {
    // Trình duyệt không hỗ trợ BroadcastChannel: các tab khác vẫn tự kiểm tra khi được mở lại.
  }
}

const here = () => encodeURIComponent(`${window.location.pathname}${window.location.search}`);

/**
 * Theo dõi phiên đăng nhập trên trình duyệt (lớp phụ; máy chủ vẫn kiểm tra ở mọi request).
 * - Quay lại tab / cửa sổ, có mạng trở lại, tab khác đăng xuất, hoặc mỗi 5 phút: hỏi máy chủ.
 * - Hết phiên → trang đăng nhập (giữ ?next). Thiếu 2 lớp → trang nhập mã. Mất quyền → báo không có quyền.
 * - Tab khác đăng nhập tài khoản khác → tải lại để không hiện dữ liệu của tài khoản cũ.
 * - Admin vừa đổi vai trò của mình (ví dụ editor → moderator) → tải lại để menu / nút theo quyền mới.
 * - Mất mạng / máy chủ xác thực lỗi: KHÔNG đăng xuất, thử lại lần sau.
 * Chỉ một lần hỏi tại một thời điểm (không dồn request, không lặp vô hạn).
 */
export function SessionWatch({ userId, role }: { userId: string; role: StaffRole }) {
  useEffect(() => {
    let checking = false;
    let stopped = false;

    /** `force`: tab khác vừa đăng xuất, kiểm tra ngay cả khi tab này đang ẩn. */
    const check = async (force = false) => {
      if (checking || stopped || navigator.onLine === false) return;
      if (!force && document.visibilityState !== "visible") return;
      checking = true;
      try {
        const status = await checkSession();
        if (stopped) return;
        if (status.state === "ok") {
          if (status.userId !== userId || status.role !== role) window.location.reload();
        } else if (status.state === "signed_out") {
          window.location.replace(`/login?expired=1&next=${here()}`);
        } else if (status.state === "mfa_required") {
          window.location.replace(`/login/mfa?next=${here()}`);
        } else if (status.state === "forbidden") {
          window.location.replace("/login?denied=1");
        }
      } catch {
        // Mất kết nối giữa chừng: giữ nguyên phiên, lần sau thử lại.
      } finally {
        checking = false;
      }
    };

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(CHANNEL);
      channel.onmessage = () => void check(true);
    } catch {
      channel = null;
    }
    const onVisible = () => void check();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    window.addEventListener("online", onVisible);
    const timer = window.setInterval(onVisible, INTERVAL_MS);
    return () => {
      stopped = true;
      channel?.close();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("online", onVisible);
      window.clearInterval(timer);
    };
  }, [userId, role]);
  return null;
}

/** Đặt ở trang đăng nhập sau khi đăng xuất xong: báo các tab quản trị khác kiểm tra phiên ngay. */
export function SignedOutBroadcast() {
  useEffect(() => announceSignOut(), []);
  return null;
}
