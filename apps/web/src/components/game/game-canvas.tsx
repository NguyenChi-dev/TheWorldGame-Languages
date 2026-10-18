"use client";

import { useEffect, useRef } from "react";
import { startGame } from "@lw/game";
import type { CharacterAppearance, MapKey } from "@lw/shared";
import { connectRealtime, type RealtimeConnection } from "@/lib/realtime";
import { useGameStore } from "@/store/game-store";

/** Font của trang (next/font đặt tên riêng), để biển tên trong game dùng cùng font Bungee / Baloo. */
function pageFont(variable: string, fallback: string) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return value ? `${value}, ${fallback}` : fallback;
}

export interface GamePlayer {
  appearance: CharacterAppearance;
  name: string;
  /** Vùng đất đang ở: vào phòng realtime của vùng đất này. */
  landId: string;
}

export default function GameCanvas({ player, map }: { player: GamePlayer; map: MapKey | null }) {
  const { appearance, name, landId } = player;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let realtime: RealtimeConnection | null = null;

    const store = useGameStore.getState();
    const game = startGame(canvas, {
      appearance,
      map,
      playerName: name,
      fonts: {
        title: pageFont("--font-bungee", "Arial Black, sans-serif"),
        subtitle: pageFont("--font-baloo", "Arial, sans-serif"),
      },
      // Vị trí thay đổi (tối đa ~10 lần / giây): gửi cho những người chơi khác.
      onMove: (position) => realtime?.sendMove(position),
      onPlaceArrive: (place) => useGameStore.getState().setPlace(place),
      onPlaceLeave: () => useGameStore.getState().setPlace(null),
      onPlaceHover: (place) => useGameStore.getState().setHovered(place),
    });
    store.setSteer(game.setMoveInput);
    store.setTravel((place) => {
      useGameStore.getState().setHeading(place);
      game.goToPlace(place);
    });
    // Font web tải xong sau khi game đã vẽ biển tên: vẽ lại cho đúng font.
    let disposed = false;
    void document.fonts?.ready.then(() => {
      if (!disposed) game.redrawLabels();
    });

    realtime = connectRealtime({
      join: { landId, x: game.spawn.x, z: game.spawn.z },
      onPlayersChange: game.setRemotePlayers,
      onStatusChange: (status, count) => useGameStore.getState().setConnection(status, count),
    });

    // Rời trang: ngắt kết nối và giải phóng bộ nhớ đồ họa.
    return () => {
      disposed = true;
      realtime?.disconnect();
      useGameStore.getState().setTravel(null);
      useGameStore.getState().setSteer(null);
      useGameStore.getState().setPlace(null);
      useGameStore.getState().setHovered(null);
      game.dispose();
    };
    // Ngoại hình chỉ đổi khi tải lại trang: so theo nội dung để không dựng lại thế giới vô ích.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appearance.gender, appearance.hat, appearance.top, appearance.bottom, map, name, landId]);

  // touch-none: không để trình duyệt cuộn/phóng trang khi vuốt trên canvas.
  return <canvas ref={canvasRef} className="block h-full w-full touch-none outline-none" />;
}
