"use client";

import { useEffect, useRef } from "react";
import { startGame } from "@lw/game";
import { connectRealtime, type RealtimeConnection } from "@/lib/realtime";
import { useGameStore } from "@/store/game-store";

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let realtime: RealtimeConnection | null = null;

    const game = startGame(canvas, {
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
  }, []);

  // touch-none: không để trình duyệt cuộn/phóng trang khi vuốt trên canvas.
  return <canvas ref={canvasRef} className="block h-full w-full touch-none outline-none" />;
}
