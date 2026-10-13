"use client";

import { useActionState } from "react";
import { ROLE_LABELS, ROLES } from "@lw/shared";
import { Button } from "@lw/ui";
import type { ActionState } from "@/lib/action-state";
import { changeUserRole } from "./actions";

const inputClass = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";

export function RoleForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(changeUserRole, {});

  return (
    <form action={formAction} className="space-y-3">
      <label className="block text-sm font-medium text-slate-700">
        Mã người dùng (uuid)
        <input name="userId" required className={`${inputClass} font-mono`} />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Vai trò mới
        <select name="role" className={inputClass} defaultValue="player">
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Lý do
        <input name="reason" required className={inputClass} />
      </label>
      {state.error ? <p className="text-sm text-red-700">{state.error}</p> : null}
      {state.message ? <p className="text-sm text-emerald-700">{state.message}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Đang lưu..." : "Đổi vai trò"}
      </Button>
    </form>
  );
}
