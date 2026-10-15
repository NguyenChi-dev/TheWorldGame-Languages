"use server";

/**
 * Màn chọn nhân vật: lưu ngoại hình (nam / nữ + trang phục tự phối) và tên nhân vật qua apps/api
 * (PATCH /me), rồi sang màn chọn vùng đất.
 *
 * Dữ liệu lưu ở public.profiles: appearance (JSON, migration 0007) và username.
 */
import { redirect } from "next/navigation";
import { USERNAME_PATTERN, USERNAME_RULE, parseAppearance } from "@lw/shared";
import type { ActionState } from "@/lib/action-state";
import { updateMe } from "@/lib/update-me";

export async function chooseCharacter(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const field = (name: string) => String(formData.get(name) ?? "");
  // NFC: chữ có dấu luôn ở dạng dựng sẵn (1 ký tự), khớp kiểm tra của database.
  const username = field("username").trim().normalize("NFC");
  const look = { gender: field("gender"), hat: field("hat"), top: field("top"), bottom: field("bottom") };
  const values = { ...look, username };

  const appearance = parseAppearance(look);
  if (!appearance) return { values, error: "Hãy chọn nhân vật và trang phục" };
  if (!USERNAME_PATTERN.test(username)) return { values, error: USERNAME_RULE };

  const result = await updateMe({ username, appearance }, "Không lưu được nhân vật, thử lại sau");
  if (!result.ok) return "signedOut" in result ? redirect("/login") : { values, error: result.error };
  return redirect("/lands");
}
