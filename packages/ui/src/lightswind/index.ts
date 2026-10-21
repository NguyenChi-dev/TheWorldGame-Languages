/**
 * Component Lightswind UI (https://lightswind.com) dùng chung cho apps/web và apps/admin:
 * `import { CountUp, BorderBeam, ShinyText } from "@lw/ui/lightswind"`.
 *
 * Lightswind là thư viện kiểu "chép mã nguồn vào dự án" (giống shadcn/ui): không cài gói `lightswind` lúc chạy.
 * Thêm component mới: lấy mã từ trang component trên lightswind.com (hoặc `npx lightswind add <tên>` trong một
 * thư mục tạm), chép vào thư mục này, đổi `@/components/lib/utils` thành `./utils`, đổi màu mặc định sang màu
 * của dự án (KHÔNG nạp lightswind.css: nó ghi đè biến --primary / --accent đang dùng), rồi export ở đây.
 * Cài thêm thư viện component đó cần vào packages/ui (`pnpm --filter @lw/ui add ...`).
 */
export { BorderBeam, type BorderBeamProps } from "./border-beam";
export { CountUp, type CountUpProps } from "./count-up";
export { ShinyText, type ShinyTextProps } from "./shiny-text";
export { cn } from "./utils";
