// Icon và mô tả ngắn của từng mục menu. Chỉ là phần hiển thị của apps/admin;
// bảng phân quyền (ai được vào mục nào) nằm ở ADMIN_SECTIONS trong @lw/shared.
import type { ComponentType, SVGProps } from "react";
import type { AdminSectionKey } from "@lw/shared";
import {
  BookIcon,
  ClipboardIcon,
  CoinIcon,
  HomeIcon,
  ImageIcon,
  MapIcon,
  UsersIcon,
} from "@/components/icons";

export interface SectionMeta {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  description: string;
}

export const SECTION_META: Record<AdminSectionKey, SectionMeta> = {
  overview: { icon: HomeIcon, description: "Bức tranh chung của trò chơi." },
  lands: { icon: MapIcon, description: "Mỗi vùng đất là một ngôn ngữ, gồm các khu vực và bài học." },
  words: { icon: BookIcon, description: "Kho từ vựng đầy đủ của mỗi vùng đất, nhập từ CSV." },
  media: { icon: ImageIcon, description: "Ảnh, âm thanh dùng trong game." },
  economy: { icon: CoinIcon, description: "Vật phẩm, giá mua bán và phần thưởng." },
  players: { icon: UsersIcon, description: "Tài khoản, vai trò và báo cáo vi phạm." },
  logs: { icon: ClipboardIcon, description: "Ai đã làm gì, lúc nào, vì sao." },
};
