import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Language World",
  description: "Học ngoại ngữ trong một thế giới 3D thu nhỏ: trồng trọt, mua bán và trò chuyện cùng bạn bè.",
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
    <html lang="vi" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
