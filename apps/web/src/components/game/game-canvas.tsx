"use client";

import { useEffect, useRef } from "react";
import { startGame } from "@lw/game";
import type { CharacterAppearance } from "@lw/shared";
import { connectRealtime, type RealtimeConnection } from "@/lib/realtime";
import { useGameStore } from "@/store/game-store";

export default function GameCanvas({ appearance }: { appearance: CharacterAppearance }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let realtime: RealtimeConnection | null = null;

    const game = startGame(canvas, {
      appearance,
      // Chạm vào ô đất: gửi vị trí mới cho những người chơi khác.
      onTileTap: (tile) => realtime?.sendMove(tile),
    });

    realtime = connectRealtime({
      onPlayersChange: game.setRemotePlayers,
      onStatusChange: (status, count) => useGameStore.getState().setConnection(status, count),
    });

    // Rời trang: ngắt kết nối và giải phóng bộ nhớ đồ họa.
    return () => {
      realtime?.disconnect();
      game.dispose();
    };
    // Ngoại hình chỉ đổi khi tải lại trang: so theo nội dung để không dựng lại thế giới vô ích.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appearance.gender, appearance.hat, appearance.top, appearance.bottom]);

  // touch-none: không để trình duyệt cuộn/phóng trang khi vuốt trên canvas.
  return <canvas ref={canvasRef} className="block h-full w-full touch-none outline-none" />;
}
