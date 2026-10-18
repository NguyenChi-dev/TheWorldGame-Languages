"use client";

import dynamic from "next/dynamic";
import type { MapKey } from "@lw/shared";
import type { GamePlayer } from "./game-canvas";

// Babylon.js cần window và WebGL nên chỉ chạy trên trình duyệt: tắt render phía máy chủ (ssr: false).
const GameCanvas = dynamic(() => import("./game-canvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-lg text-slate-600">
      Đang tải thế giới...
    </div>
  ),
});

export function GameLoader({ player, map }: { player: GamePlayer; map: MapKey | null }) {
  return <GameCanvas player={player} map={map} />;
}
