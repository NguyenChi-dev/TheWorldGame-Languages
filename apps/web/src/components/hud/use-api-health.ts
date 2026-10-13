"use client";

import { useEffect } from "react";
import { api } from "@/lib/api";
import { useGameStore } from "@/store/game-store";

const CHECK_EVERY_MS = 15_000;
const TIMEOUT_MS = 3_000;

/**
 * Gọi GET /health của apps/api lúc vào trang và lặp lại định kỳ.
 * API tắt chỉ làm trạng thái thành "offline", game vẫn chạy bình thường.
 */
export function useApiHealth() {
  useEffect(() => {
    const { setApiStatus } = useGameStore.getState();
    let active = true;

    const check = () => {
      api
        .health(AbortSignal.timeout(TIMEOUT_MS))
        .then(() => active && setApiStatus("ok"))
        .catch(() => active && setApiStatus("offline"));
    };

    check();
    const timer = window.setInterval(check, CHECK_EVERY_MS);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);
}
