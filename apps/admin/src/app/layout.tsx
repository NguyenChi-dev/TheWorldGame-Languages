import type { Metadata } from "next";
import { Sidebar } from "@/components/sidebar";
import "./globals.css";

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
    <html lang="vi">
      <body>
        <div className="flex min-h-dvh flex-col md:flex-row">
          <Sidebar />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
