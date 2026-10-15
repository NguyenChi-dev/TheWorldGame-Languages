"use client";

import {
  faCircleCheck,
  faEnvelope,
  faEye,
  faEyeSlash,
  faLock,
  faRightToBracket,
  faTriangleExclamation,
  faUser,
  faUserPlus,
  faWandMagicSparkles,
  type IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import { useActionState, useId, useLayoutEffect, useRef, useState } from "react";
import { signIn, signUp } from "@/app/(world)/login/actions";
import { FaIcon } from "@/components/fa-icon";
import type { ActionState } from "@/lib/action-state";

type Tab = "signin" | "signup";

const TABS: { key: Tab; label: string; icon: IconDefinition }[] = [
  { key: "signin", label: "Đăng nhập", icon: faRightToBracket },
  { key: "signup", label: "Tạo tài khoản", icon: faUserPlus },
];

/**
 * Ô nhập trên bảng gỗ: nhãn chữ khắc sáng, ô nền giấy da có icon bên trái.
 * Ô mật khẩu có nút con mắt để hiện / ẩn mật khẩu.
 */
function WoodField({
  label,
  name,
  icon,
  type = "text",
  autoComplete,
  defaultValue,
  placeholder,
  minLength,
  maxLength,
}: {
  label: string;
  name: string;
  icon: IconDefinition;
  type?: string;
  autoComplete: string;
  defaultValue?: string;
  placeholder?: string;
  minLength?: number;
  maxLength?: number;
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  return (
    <div>
      <label htmlFor={id} className="wood-label mb-1 block font-game text-sm font-bold">
        {label}
      </label>
      <div className="relative">
        <FaIcon
          icon={icon}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-amber-800/70"
        />
        <input
          id={id}
          name={name}
          type={isPassword && visible ? "text" : type}
          required
          autoComplete={autoComplete}
          defaultValue={defaultValue}
          placeholder={placeholder}
          minLength={minLength}
          maxLength={maxLength}
          className={`wood-input block w-full rounded-xl py-2.5 pl-10 font-game text-base font-semibold text-amber-950 placeholder:text-amber-900/40 focus:outline-none ${
            isPassword ? "pr-11" : "pr-3.5"
          }`}
        />
        {isPassword ? (
          <button
            type="button"
            onClick={() => setVisible((value) => !value)}
            aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            title={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-amber-800/70 transition hover:bg-amber-900/10 hover:text-amber-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <FaIcon icon={visible ? faEyeSlash : faEye} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** Dải thông báo trên bảng gỗ (lỗi đỏ / thành công xanh), có icon. */
function Notice({ tone, children }: { tone: "error" | "success"; children: string }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`flex items-start gap-2 rounded-xl px-3 py-2 text-sm font-semibold ring-2 ${
        tone === "error"
          ? "bg-red-50 text-red-700 ring-red-300"
          : "bg-emerald-50 text-emerald-800 ring-emerald-300"
      }`}
    >
      <FaIcon icon={tone === "error" ? faTriangleExclamation : faCircleCheck} className="mt-0.5 shrink-0" />
      {children}
    </p>
  );
}

function SubmitButton({
  pending,
  icon,
  children,
}: {
  pending: boolean;
  icon: IconDefinition;
  children: string;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="wood-submit mt-1 w-full rounded-2xl py-3 font-poly text-xl"
    >
      <span className="btn-icon relative text-emerald-600">
        <FaIcon icon={icon} />
      </span>
      <span className="relative">{pending ? "Đang xử lý..." : children}</span>
    </button>
  );
}

function SignInForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(signIn, {});
  return (
    <form action={action} className="space-y-3.5">
      <WoodField
        label="Email"
        name="email"
        icon={faEnvelope}
        type="email"
        autoComplete="email"
        placeholder="ban@vidu.com"
        defaultValue={state.values?.email}
      />
      <WoodField
        label="Mật khẩu"
        name="password"
        icon={faLock}
        type="password"
        autoComplete="current-password"
        placeholder="Nhập mật khẩu"
      />
      {state.error ? <Notice tone="error">{state.error}</Notice> : null}
      <SubmitButton pending={pending} icon={faRightToBracket}>
        Vào game
      </SubmitButton>
    </form>
  );
}

function SignUpForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(signUp, {});
  if (state.message) return <Notice tone="success">{state.message}</Notice>;
  return (
    <form action={action} className="space-y-3">
      <WoodField
        label="Tên nhân vật"
        name="username"
        icon={faUser}
        autoComplete="nickname"
        placeholder="Ví dụ: Mèo_Ú"
        minLength={3}
        maxLength={32}
        defaultValue={state.values?.username}
      />
      <WoodField
        label="Email"
        name="email"
        icon={faEnvelope}
        type="email"
        autoComplete="email"
        placeholder="ban@vidu.com"
        defaultValue={state.values?.email}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <WoodField
          label="Mật khẩu"
          name="password"
          icon={faLock}
          type="password"
          autoComplete="new-password"
          placeholder="Từ 8 ký tự"
          minLength={8}
        />
        <WoodField
          label="Nhập lại"
          name="confirmPassword"
          icon={faLock}
          type="password"
          autoComplete="new-password"
          placeholder="Gõ lại lần nữa"
          minLength={8}
        />
      </div>
      {state.error ? <Notice tone="error">{state.error}</Notice> : null}
      <SubmitButton pending={pending} icon={faWandMagicSparkles}>
        Tạo tài khoản
      </SubmitButton>
    </form>
  );
}

/**
 * Nội dung bảng gỗ ở trang /login: tiêu đề khắc gỗ, 2 tab Đăng nhập / Tạo tài khoản, form tương ứng.
 * Hiệu ứng đổi tab:
 *   - tấm ván sáng trượt sang tab mới (nảy nhẹ ở cuối);
 *   - tiêu đề lật như tấm biển xoay;
 *   - form mới trượt vào theo hướng của tab, khung co giãn chiều cao mượt (form tạo tài khoản dài hơn).
 * Lần đầu mở trang không chạy hiệu ứng đổi tab (bảng gỗ đã có hiệu ứng rơi xuống).
 */
export function AuthPanel({ initialTab, notice }: { initialTab: Tab; notice: string | null }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  /** Hướng chuyển tab gần nhất (null = chưa đổi lần nào). */
  const [direction, setDirection] = useState<"next" | "prev" | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [panelHeight, setPanelHeight] = useState<number | null>(null);

  // Đo chiều cao nội dung form (đổi tab, hiện thông báo lỗi...) để khung co giãn bằng transition.
  useLayoutEffect(() => {
    const node = contentRef.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setPanelHeight(entry.contentRect.height));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  function choose(next: Tab) {
    if (next === tab) return;
    setDirection(next === "signup" ? "next" : "prev");
    setTab(next);
    window.history.replaceState(null, "", next === "signup" ? "/login?tab=signup" : "/login");
  }

  const slide = direction === "next" ? "tab-slide-next" : direction === "prev" ? "tab-slide-prev" : "";

  return (
    <div className="relative space-y-5">
      <div className="text-center">
        <h1
          key={`title-${tab}`}
          className={`wood-carve font-poly text-[1.65rem] leading-tight sm:text-4xl ${direction ? "sign-flip" : ""}`}
        >
          {tab === "signin" ? "Chào lữ khách!" : "Gia nhập thế giới"}
        </h1>
        <p key={`sub-${tab}`} className={`wood-label mt-1 font-game text-sm font-semibold ${slide}`}>
          {tab === "signin"
            ? "Đăng nhập để tiếp tục hành trình học ngôn ngữ."
            : "Tạo nhân vật và bắt đầu du hành qua các vùng đất."}
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Đăng nhập hoặc tạo tài khoản"
        className="wood-tab-track grid grid-cols-2"
      >
        <span aria-hidden="true" data-tab={tab} className="wood-tab-indicator" />
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={tab === item.key}
            onClick={() => choose(item.key)}
            className="wood-tab flex items-center justify-center gap-2 rounded-xl py-2 font-poly text-sm sm:text-base"
          >
            <FaIcon icon={item.icon} className="text-xs sm:text-sm" />
            {item.label}
          </button>
        ))}
      </div>

      {notice && tab === "signin" ? <Notice tone="error">{notice}</Notice> : null}
      {/* Khung ngoài cắt phần form đang trượt vào; px/-mx chừa chỗ cho viền sáng khi ô nhập được chọn. */}
      <div
        role="tabpanel"
        className="tab-panel -mx-2 overflow-hidden px-2"
        style={panelHeight === null ? undefined : { height: panelHeight + 12 }}
      >
        <div ref={contentRef} className="pb-3 pt-1">
          <div key={tab} className={slide}>
            {tab === "signin" ? <SignInForm /> : <SignUpForm />}
          </div>
        </div>
      </div>

      <p className="wood-label -mt-2 text-center font-game text-sm font-semibold">
        {tab === "signin" ? "Chưa có tài khoản? " : "Đã có tài khoản? "}
        <button
          type="button"
          onClick={() => choose(tab === "signin" ? "signup" : "signin")}
          className="font-bold text-amber-200 underline decoration-2 underline-offset-4 hover:text-white"
        >
          {tab === "signin" ? "Tạo tài khoản" : "Đăng nhập"}
        </button>
      </p>
    </div>
  );
}
