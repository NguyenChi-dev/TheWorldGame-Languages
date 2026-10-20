"use client";

import { useEffect } from "react";

/**
 * Sau khi đăng xuất, nút Back của trình duyệt có thể hiện lại trang quản trị từ bộ nhớ đệm
 * (back/forward cache) mà không hỏi máy chủ. Trang được lấy từ bộ nhớ đệm thì tải lại: máy chủ kiểm tra
 * phiên, hết phiên thì chuyển về /login.
 */
export function BackCacheGuard() {
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);
  return null;
}
