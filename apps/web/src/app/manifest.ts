import type { MetadataRoute } from "next";

// Thông tin để trình duyệt cho phép "Thêm vào màn hình chính" (cài như app).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Language World",
    short_name: "LangWorld",
    description: "Web game học ngoại ngữ trong thế giới 3D thu nhỏ.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ecfdf5",
    theme_color: "#16a34a",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
