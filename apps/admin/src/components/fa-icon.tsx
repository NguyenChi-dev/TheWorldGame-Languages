/**
 * Icon Font Awesome (bộ Free Solid) cho trang quản trị.
 *
 * CSS của Font Awesome được nạp sẵn ở app/layout.tsx; tắt autoAddCss để thư viện không tự chèn CSS
 * lúc chạy (tránh icon bị phóng to trong tích tắc khi tải trang).
 * Kích thước icon theo cỡ chữ: dùng class text-xs / text-sm / text-lg..., không dùng size-*.
 */
import { config } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon, type FontAwesomeIconProps } from "@fortawesome/react-fontawesome";

config.autoAddCss = false;

/** Icon trang trí (aria-hidden). Nút chỉ có icon phải tự đặt aria-label cho nút. */
export function FaIcon(props: FontAwesomeIconProps) {
  return <FontAwesomeIcon aria-hidden="true" {...props} />;
}
