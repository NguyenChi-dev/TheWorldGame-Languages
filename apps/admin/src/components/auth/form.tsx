"use client";

// Ô nhập, nút và thông báo dùng chung cho các form đăng nhập / đăng ký / xác thực hai lớp.
import { useId, useState, type ComponentType, type InputHTMLAttributes, type SVGProps } from "react";
import { AlertIcon, CheckIcon, EyeIcon, EyeOffIcon } from "@/components/icons";
import { inputClass, primaryButtonClass } from "./styles";

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: React.ReactNode;
  /** Biểu tượng bên trái ô nhập, đổi sang màu accent khi ô đang được chọn. */
  icon?: IconType;
  /** Lỗi của riêng ô này: viền đỏ + dòng báo lỗi ngay dưới ô (trình đọc màn hình đọc kèm ô nhập). */
  error?: string;
}

const errorInputClass = "border-red-300! focus:border-red-400! focus:ring-red-200!";

function FieldShell({
  id,
  label,
  hint,
  error,
  icon: Icon,
  children,
}: {
  id: string;
  label: string;
  hint?: React.ReactNode;
  error?: string;
  icon?: IconType;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="group relative">
        {Icon ? (
          <Icon className="pointer-events-none absolute left-4 top-1/2 z-10 size-5 -translate-y-1/2 text-slate-400 transition-colors duration-200 group-focus-within:text-accent" />
        ) : null}
        {children}
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-red-600">
          <AlertIcon className="size-3.5 shrink-0" />
          {error}
        </p>
      ) : null}
      {hint ? <div className="mt-1.5 text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}

/** Thuộc tính a11y cho ô có lỗi. */
const errorProps = (id: string, error?: string) =>
  error ? { "aria-invalid": true, "aria-describedby": `${id}-error` } : {};

export function TextField({ label, hint, icon, error, className = "", ...props }: FieldProps) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} icon={icon} error={error}>
      <input
        id={id}
        className={`${inputClass} ${icon ? "pl-12" : ""} ${error ? errorInputClass : ""} ${className}`}
        {...errorProps(id, error)}
        {...props}
      />
    </FieldShell>
  );
}

/** Ô mật khẩu có nút hiện/ẩn. */
export function PasswordField({ label, hint, icon, error, ...props }: FieldProps) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return (
    <FieldShell id={id} label={label} hint={hint} icon={icon} error={error}>
      <input
        id={id}
        type={visible ? "text" : "password"}
        className={`${inputClass} pr-12 ${icon ? "pl-12" : ""} ${error ? errorInputClass : ""}`}
        {...errorProps(id, error)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 z-10 flex w-12 items-center justify-center rounded-r-xl text-slate-400 transition hover:text-accent focus-visible:text-accent focus-visible:outline-none"
        aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
      >
        {visible ? (
          <EyeOffIcon key="off" className="size-5 animate-pop" />
        ) : (
          <EyeIcon key="on" className="size-5 animate-pop" />
        )}
      </button>
    </FieldShell>
  );
}

/** Thanh đo độ mạnh mật khẩu (chỉ để gợi ý, máy chủ vẫn tự kiểm tra). */
export function PasswordStrength({ password }: { password: string }) {
  const checks = [
    password.length >= 8,
    password.length >= 12,
    /[a-z]/.test(password) && /[A-Z]/.test(password),
    /\d/.test(password) && /[^A-Za-z0-9]/.test(password),
  ];
  const score = password ? Math.max(1, checks.filter(Boolean).length) : 0;
  const labels = ["", "Yếu", "Tạm được", "Khá", "Mạnh"];
  return (
    <div className="flex items-center gap-3" aria-live="polite">
      <div className="flex flex-1 gap-1.5">
        {[1, 2, 3, 4].map((step) => (
          <span key={step} className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
            <span
              className={`block h-full rounded-full bg-linear-to-r from-primary to-accent transition-all duration-500 ease-out ${
                step <= score ? "w-full" : "w-0"
              }`}
            />
          </span>
        ))}
      </div>
      <span className="w-16 text-right text-xs font-medium text-slate-500">{labels[score]}</span>
    </div>
  );
}

/** Nội dung bên trong nút chính: vệt sáng lướt qua khi rê chuột + vòng xoay khi đang chờ. */
export function ShineButtonContent({
  pending,
  pendingText,
  icon: Icon,
  children,
}: {
  pending: boolean;
  pendingText: string;
  icon?: IconType;
  children: React.ReactNode;
}) {
  return (
    <>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-linear-to-r from-transparent via-white/35 to-transparent group-hover:animate-shine"
      />
      {pending ? (
        <>
          <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          {pendingText}
        </>
      ) : (
        <>
          {children}
          {Icon ? (
            <Icon className="size-5 transition-transform duration-300 group-hover:translate-x-1" />
          ) : null}
        </>
      )}
    </>
  );
}

export function SubmitButton({
  pending,
  pendingText,
  icon,
  children,
}: {
  pending: boolean;
  pendingText: string;
  icon?: IconType;
  children: React.ReactNode;
}) {
  return (
    <button type="submit" disabled={pending} className={primaryButtonClass}>
      <ShineButtonContent pending={pending} pendingText={pendingText} icon={icon}>
        {children}
      </ShineButtonContent>
    </button>
  );
}

/** Hộp thông báo. Lỗi thì rung nhẹ khi xuất hiện. */
export function Alert({ tone, children }: { tone: "error" | "success" | "info"; children: React.ReactNode }) {
  const styles = {
    error: "border-red-200 bg-red-50/90 text-red-700 animate-shake",
    success: "border-primary/40 bg-secondary/90 text-accent animate-fade-up",
    info: "border-secondary bg-background text-slate-600 animate-fade-up",
  }[tone];
  const Icon = tone === "success" ? CheckIcon : AlertIcon;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`flex gap-2.5 rounded-xl border px-4 py-3 text-sm backdrop-blur-sm ${styles}`}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="leading-relaxed">{children}</div>
    </div>
  );
}
