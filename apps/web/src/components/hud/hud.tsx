"use client";

import { useGameStore } from "@/store/game-store";
import { useApiHealth } from "./use-api-health";

/** Thông tin hiển thị đè lên game: trạng thái realtime và API (góc phải). */
export function Hud() {
  useApiHealth();

  const connection = useGameStore((state) => state.connection);
  const onlineCount = useGameStore((state) => state.onlineCount);
  const apiStatus = useGameStore((state) => state.apiStatus);

  const connectionLabel =
    connection === "online"
      ? `Online: ${onlineCount}`
      : connection === "offline"
        ? "Offline"
        : "Đang kết nối...";

  const apiLabel = apiStatus === "ok" ? "API: OK" : apiStatus === "offline" ? "API: Offline" : "API: ...";

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-end p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div className="flex flex-col items-end gap-1.5">
        <div
          className={`rounded-full px-3 py-1 text-sm font-semibold text-white shadow ${
            connection === "online" ? "bg-emerald-600" : "bg-slate-700/80"
          }`}
        >
          {connectionLabel}
        </div>
        <div
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold text-white shadow ${
            apiStatus === "ok" ? "bg-sky-600" : "bg-slate-700/80"
          }`}
        >
          {apiLabel}
        </div>
      </div>
    </div>
  );
}
