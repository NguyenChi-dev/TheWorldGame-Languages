import { HomeHero } from "@/components/home/home-hero";
import { createClient } from "@/lib/supabase/server";

/** Trang chủ. Đọc phiên đăng nhập để biết nút "Chơi game" dẫn vào game hay tới trang đăng nhập. */
export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return <HomeHero loggedIn={Boolean(user)} />;
}
