/**
 * Dựng URL ảnh thu nhỏ từ URL Cloudinary (chạy được cả ở máy chủ lẫn trình duyệt).
 * Cloudinary tự cắt, đổi định dạng (WebP/AVIF) và nén theo các tham số chèn sau "/upload/".
 */
export function cloudinaryThumb(secureUrl: string, width: number, height: number = width): string {
  if (!secureUrl.includes("/upload/")) return secureUrl;
  return secureUrl.replace("/upload/", `/upload/c_fill,g_auto,w_${width},h_${height},f_auto,q_auto/`);
}
