"use client";

// Lightswind UI "border-beam" (https://lightswind.com/components/border-beam), mã nguồn chép vào dự án.
// Đã chỉnh: màu mặc định theo tông hồng của dự án, tắt khi "giảm chuyển động", bỏ kiểu any.
// Dùng: đặt trong khung có `relative` và bo góc, ví dụ <div className="relative rounded-2xl">…<BorderBeam /></div>.
import { motion, useReducedMotion, type Transition } from "framer-motion";
import type { CSSProperties } from "react";
import { cn } from "./utils";

export interface BorderBeamProps {
  /** Độ dài vệt sáng (px). */
  size?: number;
  /** Thời gian chạy một vòng (giây). */
  duration?: number;
  delay?: number;
  colorFrom?: string;
  colorTo?: string;
  transition?: Transition;
  className?: string;
  style?: CSSProperties;
  reverse?: boolean;
  /** Vị trí bắt đầu (0-100). */
  initialOffset?: number;
  opacity?: number;
  glowIntensity?: number;
  beamBorderRadius?: number;
  pauseOnHover?: boolean;
  speedMultiplier?: number;
}

/** Vệt sáng chạy quanh viền khung (làm nổi bật thẻ / nút quan trọng). */
export function BorderBeam({
  className,
  size = 50,
  delay = 0,
  duration = 6,
  colorFrom = "#e88fa5",
  colorTo = "#a83d5a",
  transition,
  style,
  reverse = false,
  initialOffset = 0,
  opacity = 1,
  glowIntensity = 0,
  beamBorderRadius,
  pauseOnHover = false,
  speedMultiplier = 1,
}: BorderBeamProps) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return null;
  const actualDuration = speedMultiplier ? duration / speedMultiplier : duration;
  const glowEffect =
    glowIntensity > 0 ? `0 0 ${glowIntensity * 5}px ${glowIntensity * 2}px var(--color-from)` : undefined;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 rounded-[inherit] border border-transparent [mask-clip:padding-box,border-box] [mask-composite:intersect] [mask-image:linear-gradient(transparent,transparent),linear-gradient(#000,#000)]"
    >
      <motion.div
        className={cn(
          "absolute aspect-square",
          "bg-linear-to-l from-(--color-from) via-(--color-to) to-transparent",
          pauseOnHover && "group-hover:[animation-play-state:paused]",
          className,
        )}
        style={
          {
            width: size,
            offsetPath: `rect(0 auto auto 0 round ${beamBorderRadius ?? size}px)`,
            "--color-from": colorFrom,
            "--color-to": colorTo,
            opacity,
            boxShadow: glowEffect,
            borderRadius: beamBorderRadius ? `${beamBorderRadius}px` : undefined,
            ...style,
          } as CSSProperties
        }
        initial={{ offsetDistance: `${initialOffset}%` }}
        animate={{
          offsetDistance: reverse
            ? [`${100 - initialOffset}%`, `${-initialOffset}%`]
            : [`${initialOffset}%`, `${100 + initialOffset}%`],
        }}
        transition={{
          repeat: Infinity,
          ease: "linear",
          duration: actualDuration,
          delay: -delay,
          ...transition,
        }}
      />
    </div>
  );
}

export default BorderBeam;
