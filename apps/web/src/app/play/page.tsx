import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GameLoader } from "@/components/game/game-loader";
import { Hud } from "@/components/hud/hud";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Chơi | Language World",
};

/** Trang game: chỉ người đã đăng nhập mới vào được (proxy.ts chuyển hướng trước, ở đây kiểm tra lại). */
export default async function PlayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Tên nhân vật trong hồ sơ (RLS: người chơi chỉ đọc được hồ sơ của chính mình).
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();
  const playerName = profile?.username || user.email?.split("@")[0] || "Lữ khách";

  return (
    // h-dvh: chiều cao theo khung nhìn thật trên điện thoại (không bị thanh địa chỉ che).
    <main className="relative h-dvh w-full overflow-hidden bg-sky-200">
      <GameLoader />
      <Hud playerName={playerName} />
    </main>
  );
}
