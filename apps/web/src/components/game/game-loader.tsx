"use client";

import dynamic from "next/dynamic";
import type { CharacterAppearance } from "@lw/shared";

// Babylon.js cần window và WebGL nên chỉ chạy trên trình duyệt: tắt render phía máy chủ (ssr: false).
const GameCanvas = dynamic(() => import("./game-canvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-lg text-slate-600">
      Đang tải thế giới...
    </div>
  ),
});

export function GameLoader({ appearance }: { appearance: CharacterAppearance }) {
  return <GameCanvas appearance={appearance} />;
}
