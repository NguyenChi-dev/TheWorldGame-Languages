"use client";

import Image from "next/image";
import { useEffect, useRef, type CSSProperties } from "react";
import homeArt from "@lw/assets/asset_game/Home.png";

/**
 * Cánh hoa anh đào rơi. Vị trí / tốc độ CỐ ĐỊNH (không dùng Math.random) để máy chủ và trình duyệt
 * vẽ ra giống hệt nhau, tránh lỗi hydration.
 */
const PETALS = [
  { left: 4, size: 14, delay: 0, duration: 11, drift: 60 },
  { left: 11, size: 10, delay: 3.5, duration: 13, drift: 90 },
  { left: 18, size: 16, delay: 7, duration: 10, drift: 40 },
  { left: 26, size: 9, delay: 1.5, duration: 14, drift: 110 },
  { left: 33, size: 12, delay: 9, duration: 12, drift: 70 },
  { left: 41, size: 8, delay: 5, duration: 15, drift: 50 },
  { left: 49, size: 13, delay: 11, duration: 11, drift: 100 },
  { left: 57, size: 10, delay: 2.5, duration: 13, drift: 30 },
  { left: 64, size: 15, delay: 8, duration: 12, drift: 80 },
  { left: 72, size: 9, delay: 4, duration: 14, drift: 120 },
  { left: 80, size: 12, delay: 10, duration: 11, drift: 60 },
  { left: 88, size: 11, delay: 6, duration: 13, drift: 90 },
  { left: 95, size: 14, delay: 12, duration: 12, drift: 45 },
];

/** Đốm sáng lấp lánh trên bầu trời (giữa ảnh là khoảng trời trống). */
const SPARKLES = [
  { left: 38, top: 14, delay: 0 },
  { left: 61, top: 10, delay: 1.2 },
  { left: 45, top: 30, delay: 2.4 },
  { left: 56, top: 24, delay: 0.6 },
  { left: 68, top: 34, delay: 1.8 },
  { left: 33, top: 38, delay: 3 },
  { left: 52, top: 6, delay: 2.1 },
  { left: 64, top: 52, delay: 0.9 },
];

/**
 * Nền thế giới game dùng chung cho trang chủ và trang đăng nhập (đặt trong layout nên chuyển trang
 * không tải lại ảnh): ảnh phủ kín màn hình, phóng chậm (Ken Burns), nghiêng nhẹ theo chuột, cánh hoa
 * rơi và đốm sáng. Người dùng bật "giảm chuyển động" thì hiệu ứng tự tắt (xem globals.css).
 */
export function WorldBackdrop() {
  const sceneRef = useRef<HTMLDivElement>(null);

  // Nghiêng theo chuột: chỉ đổi biến CSS, không render lại React.
  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || !sceneRef.current) return;
      sceneRef.current.style.setProperty("--px", (event.clientX / window.innerWidth - 0.5).toFixed(3));
      sceneRef.current.style.setProperty("--py", (event.clientY / window.innerHeight - 0.5).toFixed(3));
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div ref={sceneRef} className="home-parallax absolute -inset-6">
        <div className="home-kenburns absolute inset-0">
          <Image
            src={homeArt}
            alt=""
            fill
            priority
            placeholder="blur"
            sizes="100vw"
            className="object-cover object-[50%_45%]"
          />
        </div>
      </div>

      {/* Ánh sáng giữa trời để chữ nổi rõ, viền tối nhẹ ở 4 góc. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_45%_at_50%_32%,rgba(255,255,255,0.55),transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(15,23,42,0.35))]" />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-sky-950/45 to-transparent" />

      {SPARKLES.map((sparkle, index) => (
        <span
          key={index}
          className="home-sparkle absolute size-2 rounded-full bg-white"
          style={{ left: `${sparkle.left}%`, top: `${sparkle.top}%`, animationDelay: `${sparkle.delay}s` }}
        />
      ))}
      {PETALS.map((petal, index) => (
        <span
          key={index}
          className="home-petal absolute -top-8"
          style={
            {
              left: `${petal.left}%`,
              width: petal.size,
              height: petal.size * 0.8,
              animationDelay: `${petal.delay}s`,
              animationDuration: `${petal.duration}s`,
              "--drift": `${petal.drift}px`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
