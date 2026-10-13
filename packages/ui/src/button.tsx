import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "md" | "sm";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/**
 * Màu lấy từ biến CSS để mỗi app tự đặt chủ đề; không đặt thì dùng màu xanh lá mặc định (như web):
 *   --ui-accent (nền nút chính), --ui-accent-hover, --ui-accent-strong (chữ nút phụ), --ui-accent-soft (nền khi rê).
 */
const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-[var(--ui-accent,#059669)] text-white hover:bg-[var(--ui-accent-hover,#047857)]",
  secondary:
    "bg-white text-[var(--ui-accent-strong,#065f46)] ring-1 ring-[var(--ui-accent,#059669)] hover:bg-[var(--ui-accent-soft,#ecfdf5)]",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  /** Thao tác không hoàn tác được (xóa). */
  danger: "bg-red-600 text-white hover:bg-red-700",
};

const sizeClasses: Record<ButtonSize, string> = {
  md: "rounded-xl px-5 py-2.5 text-base",
  sm: "rounded-lg px-3 py-1.5 text-sm",
};

/** Lớp CSS của nút. Dùng riêng khi cần biến thẻ <a> hoặc <Link> trông giống nút. */
export function buttonClasses(
  variant: ButtonVariant = "primary",
  className = "",
  size: ButtonSize = "md",
): string {
  return [
    "inline-flex items-center justify-center gap-1.5 font-semibold",
    "transition-colors disabled:cursor-not-allowed disabled:opacity-50",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent,#059669)] focus-visible:ring-offset-2",
    sizeClasses[size],
    variantClasses[variant],
    className,
  ].join(" ");
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, className, size)} {...props} />;
}
