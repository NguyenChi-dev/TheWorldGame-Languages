"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type ToastTone = "success" | "error" | "info";

interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const DURATION_MS = 4000;

const toneClasses: Record<ToastTone, string> = {
  success: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  error: "bg-red-50 text-red-800 ring-red-200",
  info: "bg-white text-slate-800 ring-slate-200",
};

const toneIcons: Record<ToastTone, string> = { success: "✓", error: "!", info: "i" };

let nextId = 0;

/** Bọc ngoài cùng của app (hoặc của một khu vực) để dùng useToast() ở bên trong. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const show = useCallback((tone: ToastTone, message: string) => {
    const id = ++nextId;
    setItems((list) => [...list, { id, tone, message }]);
    setTimeout(() => setItems((list) => list.filter((item) => item.id !== id)), DURATION_MS);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => show("success", message),
      error: (message) => show("error", message),
      info: (message) => show("info", message),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            role={item.tone === "error" ? "alert" : "status"}
            className={`pointer-events-auto flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm shadow-lg ring-1 ${toneClasses[item.tone]}`}
          >
            <span aria-hidden="true" className="font-bold">
              {toneIcons[item.tone]}
            </span>
            <span className="leading-relaxed">{item.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** toast.success("Đã lưu"), toast.error("...") — phải nằm bên trong <ToastProvider>. */
export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error("useToast() phải được dùng bên trong <ToastProvider>");
  return api;
}
