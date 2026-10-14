"use client";

import { useState, type ReactNode } from "react";

/**
 * Ảnh từ Cloudinary, có phương án dự phòng: nếu file không tải được (ví dụ đã bị xóa trên
 * Cloudinary Console) thì hiện `fallback` thay vì biểu tượng ảnh vỡ.
 *
 * Bắt cả trường hợp ảnh lỗi TRƯỚC khi React chạy (ảnh từ HTML máy chủ): kiểm tra ngay khi gắn ref.
 */
export function CoverImage({
  src,
  alt,
  className,
  fallback,
}: {
  src: string;
  alt: string;
  className?: string;
  fallback: ReactNode;
}) {
  const [broken, setBroken] = useState(false);
  if (broken) return <>{fallback}</>;
  return (
    // Ảnh đã được Cloudinary cắt / nén theo kích thước, không cần next/image tối ưu lại.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setBroken(true)}
      ref={(img) => {
        if (img && img.complete && img.naturalWidth === 0) setBroken(true);
      }}
    />
  );
}

/** Dấu "!" đỏ nhỏ ở góc, báo ảnh không còn trên Cloudinary. */
export function MissingImageMark() {
  return (
    <span
      title="Ảnh không còn trên Cloudinary (có thể đã bị xóa). Bấm Sửa để tải ảnh khác."
      className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white ring-2 ring-white"
    >
      !
    </span>
  );
}
