"use client";

/**
 * GSAP dùng chung cho apps/web và apps/admin: `import { gsap, useGSAP, Reveal } from "@lw/ui/motion"`.
 * Đăng ký plugin một lần ở đây (useGSAP tự dọn animation khi component bị gỡ, an toàn với React 19).
 * Thêm plugin khác (ScrollTrigger...) thì đăng ký ở file này.
 */
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";

gsap.registerPlugin(useGSAP);

export { gsap, useGSAP };
export { Reveal, type RevealProps } from "./reveal";
