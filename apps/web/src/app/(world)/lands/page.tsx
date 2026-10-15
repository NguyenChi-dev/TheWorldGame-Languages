import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LandPicker } from "@/components/lands/land-picker";
import { getActiveLands, getPlayerProfile } from "@/lib/player";

export const metadata: Metadata = { title: "Chọn vùng đất · Language World" };

/**
 * /lands: màn chọn vùng đất (ngôn ngữ muốn học). Mở sau màn tạo nhân vật, hoặc từ nút đổi vùng đất
 * trong game. Danh sách là các vùng đất admin đang bật, theo thứ tự admin sắp xếp.
 */
export default async function LandsPage() {
  const profile = await getPlayerProfile();
  if (!profile) redirect("/login");
  if (!profile.appearance) redirect("/character");

  const lands = await getActiveLands();
  return <LandPicker lands={lands} currentLandId={profile.land?.id ?? null} />;
}
