import type { Metadata } from "next";
import { GameLoader } from "@/components/game/game-loader";
import { Hud } from "@/components/hud/hud";

export const metadata: Metadata = {
  title: "Chơi | Language World",
};

export default function PlayPage() {
  return (
    // h-dvh: chiều cao theo khung nhìn thật trên điện thoại (không bị thanh địa chỉ che).
    <main className="relative h-dvh w-full overflow-hidden bg-sky-200">
      <GameLoader />
      <Hud />
    </main>
  );
}
