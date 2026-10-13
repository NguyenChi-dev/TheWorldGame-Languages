/**
 * Cookie lưu trạng thái thu gọn thanh bên, để máy chủ vẽ đúng ngay từ đầu (không giật khi tải trang).
 * File thường (không "use client") để cả layout (server) lẫn Sidebar (client) cùng đọc được.
 */
export const SIDEBAR_COOKIE = "lw_sidebar";
