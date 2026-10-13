import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-emerald-600 text-white hover:bg-emerald-700",
  secondary: "bg-white text-emerald-800 ring-1 ring-emerald-600 hover:bg-emerald-50",
};

/** Lớp CSS của nút. Dùng riêng khi cần biến thẻ <a> hoặc <Link> trông giống nút. */
export function buttonClasses(variant: ButtonVariant = "primary", className = ""): string {
  return [
    "inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-base font-semibold",
    "transition-colors disabled:cursor-not-allowed disabled:opacity-50",
    variantClasses[variant],
    className,
  ].join(" ");
}

export function Button({ variant = "primary", className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, className)} {...props} />;
}
