import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GameLoader } from "@/components/game/game-loader";
import { Hud } from "@/components/hud/hud";
import { getPlayerProfile } from "@/lib/player";

export const metadata: Metadata = {
  title: "Chơi | Language World",
};

/**
 * Trang game: chỉ người đã đăng nhập mới vào được (proxy.ts chuyển hướng trước, ở đây kiểm tra lại).
 * Thứ tự lần đầu vào: tạo nhân vật (/character) → chọn vùng đất (/lands) → vào game.
 */
export default async function PlayPage() {
  const profile = await getPlayerProfile();
  if (!profile) redirect("/login");
  if (!profile.appearance) redirect("/character");
  // Chưa chọn vùng đất, hoặc vùng đất đang ở đã bị tắt / xóa: chọn lại.
  if (!profile.land) redirect("/lands");
  const playerName = profile.username || profile.email?.split("@")[0] || "Lữ khách";

  return (
    // h-dvh: chiều cao theo khung nhìn thật trên điện thoại (không bị thanh địa chỉ che).
    <main className="relative h-dvh w-full overflow-hidden bg-sky-200">
      <GameLoader appearance={profile.appearance} />
      <Hud playerName={playerName} land={profile.land} />
    </main>
  );
}
