"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { useRef, type ElementType, type ReactNode } from "react";

export interface RevealProps {
  children: ReactNode;
  /** Thẻ bao ngoài (mặc định div). */
  as?: ElementType;
  className?: string;
  /** Phần tử con được làm hiện dần; mặc định là các con trực tiếp. */
  selector?: string;
  /** Khoảng trễ giữa các con (giây). */
  stagger?: number;
  /** Dịch lên từ bao nhiêu px. */
  y?: number;
  delay?: number;
  /** Đổi giá trị này (ví dụ đường dẫn / tab) để chạy lại hiệu ứng. */
  replayKey?: string | number;
}

/**
 * Hiện dần các phần tử con (mờ → rõ, trồi lên) bằng GSAP, lần lượt từng phần tử.
 * Người dùng bật "giảm chuyển động" trong hệ điều hành thì hiện ngay, không chạy hiệu ứng.
 * Nội dung vẫn có sẵn trong HTML từ máy chủ (không ẩn trước khi JS chạy), nên không ảnh hưởng SEO / đọc màn hình.
 */
export function Reveal({
  children,
  as: Tag = "div",
  className,
  selector = ":scope > *",
  stagger = 0.06,
  y = 14,
  delay = 0,
  replayKey,
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        const targets = ref.current?.querySelectorAll(selector);
        if (!targets?.length) return;
        gsap.from(targets, {
          autoAlpha: 0,
          y,
          duration: 0.5,
          ease: "power2.out",
          stagger,
          delay,
          // Chỉ xóa thuộc tính do hiệu ứng thêm vào, giữ style riêng của phần tử.
          clearProps: "opacity,visibility,transform",
        });
      });
      return () => media.revert();
    },
    { scope: ref, dependencies: [replayKey], revertOnUpdate: true },
  );

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}
