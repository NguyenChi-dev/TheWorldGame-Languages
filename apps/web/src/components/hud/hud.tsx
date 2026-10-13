"use client";

import { useGameStore } from "@/store/game-store";

/** Thông tin hiển thị đè lên game: số vàng (trái) và trạng thái kết nối (phải). */
export function Hud() {
  const gold = useGameStore((state) => state.gold);
  const connection = useGameStore((state) => state.connection);
  const onlineCount = useGameStore((state) => state.onlineCount);

  const connectionLabel =
    connection === "online"
      ? `Online: ${onlineCount}`
      : connection === "offline"
        ? "Offline"
        : "Đang kết nối...";

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div className="rounded-full bg-white/90 px-4 py-1.5 font-bold text-amber-600 shadow">🪙 {gold}</div>
      <div
        className={`rounded-full px-3 py-1 text-sm font-semibold text-white shadow ${
          connection === "online" ? "bg-emerald-600" : "bg-slate-700/80"
        }`}
      >
        {connectionLabel}
      </div>
    </div>
  );
}
