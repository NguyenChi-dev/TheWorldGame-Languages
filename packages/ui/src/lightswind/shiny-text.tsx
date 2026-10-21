"use client";

// Lightswind UI "shiny-text" (https://lightswind.com/components/shiny-text), mã nguồn chép vào dự án.
// Đã chỉnh: màu mặc định lấy từ token màu của app (--color-accent / --color-primary) thay cho biến của Lightswind
// (không dùng currentColor: chữ trong suốt nên currentColor cũng trong suốt),
// tắt hiệu ứng khi "giảm chuyển động", gọn lại phần không dùng.
import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "./utils";

export interface ShinyTextProps {
  children: ReactNode;
  disabled?: boolean;
  /** Thời gian một lượt sáng (giây). */
  speed?: number;
  className?: string;
  /** Màu chữ nền (mặc định: --color-accent của app). */
  baseColor?: string;
  /** Màu vệt sáng (mặc định: --color-primary của app). */
  shineColor?: string;
  direction?: "left-to-right" | "right-to-left";
  /** Độ rộng vệt sáng (%). */
  shineWidth?: number;
  delay?: number;
  repeat?: number | "infinite";
}

/** Chữ có vệt sáng lướt qua (tiêu đề, nhãn nổi bật). */
export function ShinyText({
  children,
  disabled = false,
  speed = 3,
  className,
  baseColor = "var(--color-accent, #334155)",
  shineColor = "var(--color-primary, #cbd5e1)",
  direction = "left-to-right",
  shineWidth = 10,
  delay = 0,
  repeat = "infinite",
}: ShinyTextProps) {
  const reduceMotion = useReducedMotion();
  if (disabled || reduceMotion) return <span className={cn("inline-block", className)}>{children}</span>;

  const positions = direction === "left-to-right" ? ["100% 0%", "-100% 0%"] : ["-100% 0%", "100% 0%"];
  const start = Math.max(0, 50 - shineWidth / 2);
  const end = Math.min(100, 50 + shineWidth / 2);
  const gradient = `linear-gradient(90deg, ${baseColor} ${start - 5}%, ${shineColor} ${start}%, ${shineColor} ${end}%, ${baseColor} ${end + 5}%)`;
  const variants: Variants = {
    initial: { backgroundPosition: positions[0] },
    animate: {
      backgroundPosition: positions[1],
      transition: {
        duration: speed,
        delay,
        repeat: typeof repeat === "number" ? repeat : Infinity,
        ease: "linear",
      },
    },
  };

  return (
    <motion.span
      className={cn("inline-block bg-clip-text text-transparent", className)}
      style={{ backgroundImage: gradient, backgroundSize: "200% 100%", WebkitBackgroundClip: "text" }}
      variants={variants}
      initial="initial"
      animate="animate"
    >
      {children}
    </motion.span>
  );
}

export default ShinyText;
