"use client";

import { useState, type FormEvent } from "react";
import type { z } from "zod";
import { fieldErrors, parseForm, type FieldErrors } from "@/lib/auth-schemas";

const OFFLINE = "Mất kết nối mạng. Kiểm tra Internet rồi thử lại.";

/**
 * Kiểm tra form ngay trên trình duyệt trước khi gọi server action: sai thì hiện lỗi dưới từng ô và
 * KHÔNG gửi request; đang mất mạng cũng không gửi. Máy chủ vẫn kiểm tra lại bằng cùng schema.
 *
 * `serverErrors`: lỗi theo trường do server action trả về, dùng khi trình duyệt chưa báo lỗi gì.
 */
export function useFormCheck<T extends z.ZodType>(
  schema: T,
  keys: readonly string[],
  serverErrors?: FieldErrors,
) {
  const [clientErrors, setClientErrors] = useState<FieldErrors | null>(null);
  const [offline, setOffline] = useState(false);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      event.preventDefault();
      setOffline(true);
      return;
    }
    setOffline(false);
    const result = parseForm(schema, new FormData(event.currentTarget), keys);
    if (result.success) {
      setClientErrors(null);
      return;
    }
    event.preventDefault();
    setClientErrors(fieldErrors(result.error));
  };

  const errors = clientErrors ?? serverErrors ?? {};
  return {
    onSubmit,
    /** Lỗi của ô `name` (nếu có). */
    error: (name: string): string | undefined => errors[name],
    /** Gõ lại vào ô thì bỏ lỗi trình duyệt của ô đó. */
    clear: (name: string) =>
      setClientErrors((current) => {
        if (!current?.[name]) return current;
        const next = { ...current };
        delete next[name];
        return next;
      }),
    offlineError: offline ? OFFLINE : null,
  };
}
