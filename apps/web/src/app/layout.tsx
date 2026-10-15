import type { Metadata, Viewport } from "next";
import { Baloo_2, Bungee } from "next/font/google";
// CSS của Font Awesome nạp một lần ở đây (xem components/fa-icon.tsx).
import "@fortawesome/fontawesome-svg-core/styles.css";
import "./globals.css";

// Font tròn, dày kiểu game (có đủ dấu tiếng Việt), dùng bằng class font-game (xem globals.css).
const baloo = Baloo_2({ subsets: ["latin", "vietnamese"], variable: "--font-baloo", display: "swap" });
// Font khối, góc cạnh hợp phong cách 3D low-poly (có dấu tiếng Việt), dùng bằng class font-poly.
const bungee = Bungee({
  weight: "400",
  subsets: ["latin", "vietnamese"],
  variable: "--font-bungee",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Language World",
  description:
    "Học ngoại ngữ trong một thế giới 3D thu nhỏ: du hành qua từng vùng đất, chơi mini-game và trò chuyện cùng bạn bè.",
  applicationName: "Language World",
  appleWebApp: {
    capable: true,
    title: "Language World",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#16a34a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning: tiện ích trình duyệt (ColorZilla, VPN, chặn quảng cáo...) hay chèn thuộc tính
    // vào <html>/<body> trước khi React chạy, gây cảnh báo hydration giả. Chỉ bỏ qua thuộc tính của
    // CHÍNH 2 thẻ này, không che lỗi hydration thật ở các thành phần bên trong.
    <html lang="vi" className={`${baloo.variable} ${bungee.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
