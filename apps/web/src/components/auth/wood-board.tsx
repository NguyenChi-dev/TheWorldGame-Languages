import type { ReactNode } from "react";

/** 4 đinh tán ở 4 góc bảng. */
const NAILS = ["left-4 top-4", "right-4 top-4", "left-4 bottom-5", "right-4 bottom-5"];

/**
 * Bảng gỗ kiểu 3D low-poly, treo bằng 2 sợi dây từ trên trời xuống:
 *   - lớp "độ dày" gỗ sẫm phía sau, lệch xuống dưới (cùng đường viền gãy khúc);
 *   - mặt gỗ: các tấm ván ngang, vân gỗ, các mảng tam giác sáng / tối như mô hình đa giác;
 *   - đinh tán ở 4 góc.
 * Bảng rơi xuống lúc vào trang rồi đung đưa nhẹ (chỉ xoay bằng transform nên không giật).
 * Hình dạng và màu nằm trong globals.css (các class wood-*).
 */
export function WoodBoard({ children }: { children: ReactNode }) {
  return (
    <div className="wood-swing relative">
      {/* Hai sợi dây treo, kéo dài lên tận mép trên màn hình. */}
      <span aria-hidden="true" className="wood-rope left-[18%]" />
      <span aria-hidden="true" className="wood-rope right-[18%]" />

      <div className="relative">
        <div aria-hidden="true" className="wood-board-depth absolute inset-0" />
        <div className="wood-board-face relative px-6 pb-8 pt-7 sm:px-8">
          {NAILS.map((position) => (
            <span key={position} aria-hidden="true" className={`wood-nail absolute ${position}`} />
          ))}
          {children}
        </div>
      </div>
    </div>
  );
}
