import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { mapForLanguage } from "@lw/shared";
import { GameLoader } from "@/components/game/game-loader";
import { Hud } from "@/components/hud/hud";
import { MoveJoystick } from "@/components/hud/move-joystick";
import { TownPanel } from "@/components/hud/town-panel";
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
  // Vùng đất đã có bản đồ (hiện có tiếng Anh) thì vẽ thị trấn, chưa có thì dùng bãi cỏ mặc định.
  const map = mapForLanguage(profile.land.languageCode);

  return (
    // h-dvh: chiều cao theo khung nhìn thật trên điện thoại (không bị thanh địa chỉ che).
    <main className="relative h-dvh w-full overflow-hidden bg-sky-200">
      <GameLoader
        player={{ appearance: profile.appearance, name: playerName, landId: profile.land.id }}
        map={map}
      />
      <Hud playerName={playerName} land={profile.land} />
      <MoveJoystick />
      {map ? <TownPanel /> : null}
    </main>
  );
}
