"use server";

/**
 * Màn chọn vùng đất: lưu vùng đất (ngôn ngữ) người chơi chọn qua apps/api (PATCH /me), rồi vào game.
 * Dữ liệu lưu ở public.profiles.land_id (migration 0008). apps/api chỉ nhận vùng đất đang bật.
 */
import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import { updateMe } from "@/lib/update-me";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function chooseLand(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const landId = String(formData.get("landId") ?? "");
  const values = { landId };
  if (!UUID.test(landId)) return { values, error: "Hãy chọn một vùng đất" };

  const result = await updateMe({ landId }, "Không vào được vùng đất này, thử lại sau");
  if (!result.ok) return "signedOut" in result ? redirect("/login") : { values, error: result.error };
  return redirect("/play");
}
