"use client";

import { useActionState, useId, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { Alert, ShineButtonContent, SubmitButton } from "@/components/auth/form";
import { ArrowRightIcon, CheckIcon, CopyIcon, PhoneIcon, ShieldIcon } from "@/components/icons";
import { inputClass, primaryButtonClass } from "@/components/auth/styles";
import type { ActionState } from "@/lib/action-state";
import { cancelTotpEnroll, startTotpEnroll, verifyTotp, type EnrollResult } from "../../actions";

function CodeForm({ factorId }: { factorId?: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(verifyTotp, {});
  const id = useId();
  // Trang muốn vào sau khi xác thực xong (máy chủ kiểm tra lại, chống open redirect).
  const next = useSearchParams().get("next");

  return (
    <form action={formAction} className="stagger space-y-4 short:space-y-3">
      {factorId ? <input type="hidden" name="factorId" value={factorId} /> : null}
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <div>
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
          Mã 6 số trong ứng dụng xác thực
        </label>
        <input
          id={id}
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]{6,7}"
          maxLength={7}
          placeholder="000000"
          required
          autoFocus
          className={`${inputClass} text-center font-mono text-2xl tracking-[0.5em] placeholder:tracking-[0.5em]`}
        />
      </div>
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      <SubmitButton pending={pending} pendingText="Đang kiểm tra..." icon={ArrowRightIcon}>
        Xác nhận
      </SubmitButton>
    </form>
  );
}

/** Đã thiết lập TOTP: chỉ cần nhập mã. */
export function TotpChallengeForm() {
  return (
    <div className="stagger space-y-5 short:space-y-3">
      <div className="flex items-center gap-3 rounded-2xl border-2 border-secondary bg-background p-3">
        <span className="relative flex size-11 shrink-0 items-center justify-center">
          <span className="absolute inset-0 animate-pulse-ring rounded-xl bg-primary/30" />
          <span className="relative flex size-11 items-center justify-center rounded-xl bg-linear-to-br from-primary to-accent text-white shadow-[0_3px_0_0_var(--color-accent-deep)]">
            <ShieldIcon className="size-5" />
          </span>
        </span>
        <p className="text-sm leading-relaxed text-slate-600">
          Mở ứng dụng xác thực trên điện thoại và nhập mã 6 số đang hiện cho Language World.
        </p>
      </div>
      <CodeForm />
    </div>
  );
}

const STEPS = ["Cài ứng dụng", "Quét mã QR", "Nhập mã"];

/** Thanh tiến trình 3 bước nằm ngang, kiểu màn hình nhiệm vụ trong game. */
function Stepper({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-1.5">
      {STEPS.map((label, index) => {
        const step = index + 1;
        const done = step < current;
        const active = step === current;
        return (
          <li key={label} className="flex flex-1 items-center gap-1.5">
            <span
              className={`flex size-7 shrink-0 items-center justify-center rounded-full font-game text-sm font-bold transition-all duration-500 ${
                done || active
                  ? "bg-linear-to-b from-[#bd4a6b] to-accent text-white shadow-[0_3px_0_0_var(--color-accent-deep)]"
                  : "border-2 border-secondary bg-white text-slate-400"
              }`}
            >
              {done ? <CheckIcon key="done" className="size-4 animate-pop" /> : step}
            </span>
            <span className={`truncate text-xs font-semibold ${active ? "text-accent" : "text-slate-500"}`}>
              {label}
            </span>
            {step < STEPS.length ? (
              <span className={`h-1 min-w-3 flex-1 rounded-full ${done ? "bg-primary" : "bg-secondary"}`} />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function SecretKey({ secret }: { secret: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2 rounded-xl border-2 border-secondary bg-background px-3 py-1.5">
      <code className="min-w-0 flex-1 break-all font-mono text-xs text-slate-700">{secret}</code>
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(secret);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-accent transition hover:bg-secondary"
      >
        {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
        {copied ? "Đã chép" : "Chép"}
      </button>
    </div>
  );
}

/** Lần đầu: tạo mã QR, quét bằng ứng dụng xác thực, rồi nhập mã để xác minh. */
export function TotpEnrollForm() {
  const [enroll, setEnroll] = useState<EnrollResult | null>(null);
  const [pending, startTransition] = useTransition();
  const ready = enroll && !("error" in enroll) ? enroll : null;

  return (
    <div className="stagger space-y-5 short:space-y-3">
      <Stepper current={ready ? 3 : 1} />

      {ready ? (
        <div className="stagger space-y-4 short:space-y-3">
          {/* Mã QR bên trái, hướng dẫn và khóa dự phòng bên phải: gọn trong 1 hàng. */}
          <div className="flex items-center gap-4">
            <div className="shrink-0 animate-pop">
              <div className="animate-gradient rounded-2xl bg-linear-to-br from-primary via-rose-mid to-accent bg-size-[200%_200%] p-0.75 shadow-lg shadow-accent/20">
                <div className="rounded-[13px] bg-white p-2">
                  {/* Ảnh QR là data URL do Supabase trả về, không cần tối ưu bằng next/image. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ready.qrCode} alt="Mã QR xác thực hai lớp" className="size-32 short:size-28" />
                </div>
              </div>
            </div>
            <div className="min-w-0 space-y-2">
              <p className="text-sm leading-relaxed text-slate-600">
                Quét mã bằng ứng dụng xác thực. Không quét được thì nhập khóa:
              </p>
              <SecretKey secret={ready.secret} />
            </div>
          </div>
          <CodeForm factorId={ready.factorId} />
          <button
            type="button"
            disabled={pending}
            className="mx-auto block text-xs font-semibold text-slate-500 underline-offset-4 hover:text-accent hover:underline"
            onClick={() =>
              startTransition(async () => {
                await cancelTotpEnroll(ready.factorId);
                setEnroll(await startTotpEnroll());
              })
            }
          >
            Không quét được? Tạo mã QR mới
          </button>
        </div>
      ) : (
        <div className="space-y-4 short:space-y-3">
          <div className="flex items-center gap-3 rounded-2xl border-2 border-secondary bg-background p-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-primary to-accent text-white shadow-[0_3px_0_0_var(--color-accent-deep)]">
              <PhoneIcon className="size-5" />
            </span>
            <p className="text-sm leading-relaxed text-slate-600">
              Cài Google Authenticator, Microsoft Authenticator hoặc 1Password trên điện thoại, rồi bấm nút
              dưới đây.
            </p>
          </div>
          {enroll && "error" in enroll ? <Alert tone="error">{enroll.error}</Alert> : null}
          <button
            type="button"
            disabled={pending}
            className={primaryButtonClass}
            onClick={() => startTransition(async () => setEnroll(await startTotpEnroll()))}
          >
            <ShineButtonContent pending={pending} pendingText="Đang tạo mã QR..." icon={ArrowRightIcon}>
              Tạo mã QR
            </ShineButtonContent>
          </button>
        </div>
      )}
    </div>
  );
}
