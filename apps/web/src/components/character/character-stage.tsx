"use client";

import { useEffect, useRef } from "react";
import { startCharacterPreview, type CharacterPreviewHandle } from "@lw/game";
import type { CharacterAppearance } from "@lw/shared";

/**
 * Khung 3D của màn chọn nhân vật (Babylon.js, chỉ chạy trên trình duyệt).
 * `appearance` đổi thì nhân vật thay đồ ngay; kéo trong khung để xoay xem.
 */
export default function CharacterStage({ appearance }: { appearance: CharacterAppearance }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<CharacterPreviewHandle | null>(null);
  // Giữ ngoại hình mới nhất để dựng cảnh lần đầu, không phải dựng lại cảnh mỗi lần thay đồ.
  const latest = useRef(appearance);
  useEffect(() => {
    latest.current = appearance;
    handleRef.current?.setAppearance(appearance);
  }, [appearance]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handle = startCharacterPreview(canvas, { initial: latest.current });
    handleRef.current = handle;
    return () => {
      handleRef.current = null;
      handle.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-label="Nhân vật của bạn, kéo để xoay"
      className="block h-full w-full cursor-grab touch-none outline-none active:cursor-grabbing"
    />
  );
}
