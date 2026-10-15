/**
 * Dựng URL ảnh thu nhỏ từ URL Cloudinary (chạy được cả ở máy chủ lẫn trình duyệt).
 * Cloudinary tự cắt, đổi định dạng (WebP/AVIF) và nén theo các tham số chèn sau "/upload/".
 */
export function cloudinaryThumb(secureUrl: string, width: number, height: number = width): string {
  if (!secureUrl.includes("/upload/")) return secureUrl;
  return secureUrl.replace("/upload/", `/upload/c_fill,g_auto,w_${width},h_${height},f_auto,q_auto/`);
}

/**
 * Ảnh GIỮ NGUYÊN khung hình (không cắt), chỉ thu nhỏ để vừa trong width × height (không phóng to ảnh nhỏ).
 * Chất lượng q_auto:good để ảnh hiện rõ, không bị nén quá tay.
 */
export function cloudinaryFit(secureUrl: string, width: number, height: number): string {
  if (!secureUrl.includes("/upload/")) return secureUrl;
  return secureUrl.replace("/upload/", `/upload/c_limit,w_${width},h_${height},f_auto,q_auto:good/`);
}
