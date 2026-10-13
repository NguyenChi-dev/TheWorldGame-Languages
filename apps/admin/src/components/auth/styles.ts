// Class Tailwind dùng chung cho các trang đăng nhập (file thường, dùng được ở cả server lẫn client component).
// Phong cách game 3D: nút có "đáy" đặc phía dưới, bấm thì lún xuống; ô nhập viền dày bo tròn.

export const inputClass =
  "block w-full rounded-2xl border-2 border-secondary bg-white px-4 py-2.5 text-base text-slate-900 " +
  "shadow-[inset_0_-3px_0_0_rgba(232,143,165,0.18)] placeholder:text-slate-400 outline-none " +
  "transition-all duration-200 hover:border-primary/60 short:py-2 " +
  "focus:border-primary focus:ring-4 focus:ring-primary/20";

/**
 * Nút chính kiểu game: gradient từ #bd4a6b xuống accent (chữ trắng tương phản ≥ 5:1),
 * bóng đặc accent-deep phía dưới tạo độ dày; rê chuột nổi lên, bấm thì lún xuống.
 */
export const primaryButtonClass =
  "group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl " +
  "bg-linear-to-b from-[#bd4a6b] to-accent px-5 py-3 font-game text-lg font-bold tracking-wide text-white " +
  "shadow-[0_5px_0_0_var(--color-accent-deep),0_12px_20px_-6px_rgba(168,61,90,0.55)] " +
  "transition-all duration-150 short:py-2.5 " +
  "hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_7px_0_0_var(--color-accent-deep),0_16px_24px_-6px_rgba(168,61,90,0.6)] " +
  "active:translate-y-1 active:shadow-[0_1px_0_0_var(--color-accent-deep),0_4px_8px_-4px_rgba(168,61,90,0.5)] " +
  "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40 " +
  "disabled:pointer-events-none disabled:opacity-70";

export const secondaryButtonClass =
  "flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-primary/60 bg-white px-5 py-2.5 " +
  "font-game text-lg font-bold text-accent shadow-[0_4px_0_0_rgba(232,143,165,0.6)] transition-all duration-150 " +
  "hover:-translate-y-0.5 hover:bg-secondary active:translate-y-1 active:shadow-none " +
  "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30";

export const linkClass =
  "relative font-semibold text-accent transition-colors hover:text-rose-mid " +
  "after:absolute after:-bottom-0.5 after:left-0 after:h-0.5 after:w-full after:origin-left after:scale-x-0 " +
  "after:rounded-full after:bg-current after:transition-transform after:duration-300 " +
  "hover:after:scale-x-100 focus-visible:outline-none focus-visible:after:scale-x-100";
