import type { Metadata } from "next";
import { Baloo_2 } from "next/font/google";
import "./globals.css";

// Font tròn, dày kiểu game (có đủ dấu tiếng Việt), dùng bằng class font-game (xem globals.css).
const baloo = Baloo_2({ subsets: ["latin", "vietnamese"], variable: "--font-baloo", display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "Quản trị | Language World",
    template: "%s | Quản trị Language World",
  },
  description: "Trang quản lý nội dung học của Language World.",
  // Không cho công cụ tìm kiếm lập chỉ mục hay đi theo liên kết trong trang admin.
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning: tiện ích trình duyệt (ColorZilla, VPN, chặn quảng cáo...) hay chèn thuộc tính
    // vào <html>/<body> trước khi React chạy, gây cảnh báo hydration giả. Chỉ bỏ qua thuộc tính của
    // CHÍNH 2 thẻ này, không che lỗi hydration thật ở các thành phần bên trong.
    <html lang="vi" className={baloo.variable} suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
