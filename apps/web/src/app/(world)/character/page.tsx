import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CharacterCreator } from "@/components/character/character-creator";
import { getPlayerProfile } from "@/lib/player";

export const metadata: Metadata = { title: "Chọn nhân vật · Language World" };

/**
 * /character: màn tạo nhân vật. /play tự chuyển tới đây khi người chơi chưa có nhân vật
 * (profiles.appearance còn trống). Tạo xong thì sang màn chọn vùng đất (/lands).
 */
export default async function CharacterPage() {
  const profile = await getPlayerProfile();
  if (!profile) redirect("/login");
  if (profile.appearance) redirect(profile.land ? "/play" : "/lands");

  return <CharacterCreator initialUsername={profile.username ?? ""} />;
}
