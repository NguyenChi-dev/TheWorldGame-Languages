"use client";

// Lightswind UI "count-up" (https://lightswind.com/components/count-up), mã nguồn chép vào dự án.
// Đã chỉnh: dùng màu của dự án thay cho bảng màu Lightswind, tôn trọng "giảm chuyển động", bỏ kiểu any.
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type Transition,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { cn } from "./utils";

const formatValue = (val: number, precision: number, sep: string): string =>
  val.toFixed(precision).replace(/\B(?=(\d{3})+(?!\d))/g, sep);

export interface CountUpProps {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  easing?: "linear" | "easeIn" | "easeOut" | "easeInOut";
  /** Dấu phân cách hàng nghìn (tiếng Việt: "."). */
  separator?: string;
  interactive?: boolean;
  /** Chỉ chạy khi số xuất hiện trên màn hình. */
  triggerOnView?: boolean;
  className?: string;
  numberClassName?: string;
  animationStyle?: "default" | "bounce" | "spring" | "gentle" | "energetic";
  colorScheme?: "default" | "gradient" | "primary" | "custom";
  customColor?: string;
  onAnimationComplete?: () => void;
}

const easingFunctions: Record<NonNullable<CountUpProps["easing"]>, [number, number, number, number]> = {
  linear: [0, 0, 1, 1],
  easeIn: [0.42, 0, 1, 1],
  easeOut: [0, 0, 0.58, 1],
  easeInOut: [0.42, 0, 0.58, 1],
};

const animationStyles: Record<NonNullable<CountUpProps["animationStyle"]>, Transition> = {
  default: { type: "tween" },
  bounce: { type: "spring", bounce: 0.25 },
  spring: { type: "spring", stiffness: 100, damping: 10 },
  gentle: { type: "spring", stiffness: 60, damping: 15 },
  energetic: { type: "spring", stiffness: 300, damping: 20 },
};

/** Màu theo token của từng app (admin: primary / accent hồng). "default" = kế thừa màu chữ xung quanh. */
const colorSchemes: Record<NonNullable<CountUpProps["colorScheme"]>, string> = {
  default: "",
  gradient: "bg-clip-text text-transparent bg-linear-to-r from-primary to-accent",
  primary: "text-accent",
  custom: "",
};

/** Số đếm dần từ 0 tới `value`. */
export function CountUp({
  value,
  duration = 1.2,
  decimals = 0,
  prefix = "",
  suffix = "",
  easing = "easeOut",
  separator = ".",
  interactive = false,
  triggerOnView = true,
  className,
  numberClassName,
  animationStyle = "default",
  colorScheme = "default",
  customColor,
  onAnimationComplete,
}: CountUpProps) {
  const reduceMotion = useReducedMotion();
  const [hasAnimated, setHasAnimated] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);
  const count = useMotionValue(reduceMotion ? value : 0);
  const rounded = useTransform(count, (latest) => formatValue(latest, decimals, separator));

  useEffect(() => {
    // Giảm chuyển động: hiện ngay số cuối.
    if (reduceMotion) {
      count.set(value);
      return;
    }
    let controls: { stop: () => void } | null = null;
    const startAnimation = () => {
      controls = animate(count.get(), value, {
        ...animationStyles[animationStyle],
        ease: easingFunctions[easing],
        duration: animationStyle === "default" ? duration : undefined,
        onUpdate: (latest) => count.set(latest),
        onComplete: () => {
          setHasAnimated(true);
          onAnimationComplete?.();
        },
      });
    };

    if (!triggerOnView || hasAnimated) {
      startAnimation();
      return () => controls?.stop();
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) startAnimation();
      },
      { threshold: 0.1 },
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => {
      controls?.stop();
      observer.disconnect();
    };
  }, [
    value,
    duration,
    easing,
    animationStyle,
    triggerOnView,
    hasAnimated,
    onAnimationComplete,
    count,
    reduceMotion,
  ]);

  const colorClass = colorScheme === "custom" ? "" : colorSchemes[colorScheme];
  const hover = interactive
    ? {
        whileHover: { scale: 1.05, filter: "brightness(1.1)", transition: { duration: 0.2 } },
        whileTap: { scale: 0.95, filter: "brightness(0.95)", transition: { duration: 0.1 } },
      }
    : {};

  return (
    <span ref={containerRef} className={cn("inline-flex items-center", className)}>
      {/* Trình đọc màn hình đọc số cuối, không đọc từng bước đếm. */}
      <span className="sr-only">
        {prefix}
        {formatValue(value, decimals, separator)}
        {suffix}
      </span>
      <motion.span
        {...hover}
        aria-hidden="true"
        className={cn("flex items-center transition-all", colorClass, numberClassName)}
        style={colorScheme === "custom" && customColor ? { color: customColor } : undefined}
      >
        {prefix && <span className="mr-1">{prefix}</span>}
        <motion.span>{rounded}</motion.span>
        {suffix && <span className="ml-1">{suffix}</span>}
      </motion.span>
    </span>
  );
}

export default CountUp;
