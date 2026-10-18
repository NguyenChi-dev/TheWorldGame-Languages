"use client";

import { faKeyboard } from "@fortawesome/free-solid-svg-icons";
import { useRef, useState, type PointerEvent } from "react";
import { FaIcon } from "@/components/fa-icon";
import { useGameStore } from "@/store/game-store";

/** Bán kính vùng kéo của cần điều khiển (px). */
const RADIUS = 52;

/**
 * Điều khiển nhân vật đi tự do:
 *   - màn hình cảm ứng: cần điều khiển gỗ ở góc dưới trái (kéo núm theo hướng muốn đi, kéo càng xa
 *     đi càng nhanh, thả tay thì dừng);
 *   - máy tính: dòng nhắc phím WASD / mũi tên và chuột (game tự nghe bàn phím, chuột).
 * Vẫn bấm / chạm vào mặt đất hay ngôi nhà để tự đi tới đó như cũ.
 */
export function MoveJoystick() {
  const steer = useGameStore((state) => state.steer);
  const baseRef = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);

  const update = (event: PointerEvent<HTMLDivElement>) => {
    const base = baseRef.current;
    if (!base) return;
    const box = base.getBoundingClientRect();
    let dx = event.clientX - (box.left + box.width / 2);
    let dy = event.clientY - (box.top + box.height / 2);
    const length = Math.hypot(dx, dy);
    if (length > RADIUS) {
      dx = (dx / length) * RADIUS;
      dy = (dy / length) * RADIUS;
    }
    setKnob({ x: dx, y: dy });
    // Màn hình: y hướng xuống; game: y hướng lên.
    steer?.(dx / RADIUS, -dy / RADIUS);
  };

  const release = () => {
    setActive(false);
    setKnob({ x: 0, y: 0 });
    steer?.(0, 0);
  };

  return (
    <div className="pointer-events-none absolute bottom-0 left-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div
        ref={baseRef}
        role="application"
        aria-label="Cần điều khiển: kéo để di chuyển nhân vật"
        className={`move-joystick pointer-events-auto ${active ? "move-joystick-active" : ""}`}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          setActive(true);
          update(event);
        }}
        onPointerMove={(event) => active && update(event)}
        onPointerUp={release}
        onPointerCancel={release}
      >
        <span className="move-joystick-knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
      </div>
      <p className="key-hint">
        <FaIcon icon={faKeyboard} />
        <span>
          <kbd>W</kbd>
          <kbd>A</kbd>
          <kbd>S</kbd>
          <kbd>D</kbd> / mũi tên để đi · bấm chuột trái hoặc phải xuống đất để đi tới, giữ chuột để đi theo
          con trỏ
        </span>
      </p>
    </div>
  );
}
