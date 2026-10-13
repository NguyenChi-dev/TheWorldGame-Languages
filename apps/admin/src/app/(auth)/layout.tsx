import { Baloo_2 } from "next/font/google";
import Image from "next/image";
import logo from "@lw/assets/Logo.png";
import { ClipboardIcon, ShieldIcon, UsersIcon } from "@/components/auth/icons";
import { LowPolyScene } from "@/components/auth/low-poly-scene";

// Font tròn, dày kiểu game, có đủ dấu tiếng Việt.
const baloo = Baloo_2({ subsets: ["latin", "vietnamese"], variable: "--font-baloo", display: "swap" });

const FEATURES = [
  { icon: ShieldIcon, label: "Bảo mật 2 lớp" },
  { icon: UsersIcon, label: "Phân quyền" },
  { icon: ClipboardIcon, label: "Nhật ký" },
];

/** Đảo low-poly nhỏ làm bệ cho logo: mặt cỏ trên, khối đá nhiều mặt bên dưới. */
function Island({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 240 90" className={className}>
      <polygon points="20,22 120,6 220,22 120,36" fill="#74d0b1" />
      <polygon points="20,22 120,36 120,44 24,30" fill="#4aad90" />
      <polygon points="120,36 220,22 216,30 120,44" fill="#3f9e83" />
      <polygon points="24,30 120,44 92,88" fill="#d98ba0" />
      <polygon points="120,44 216,30 150,86" fill="#b04a68" />
      <polygon points="92,88 120,44 150,86" fill="#c9627f" />
    </svg>
  );
}

/**
 * Khung chung cho đăng nhập / đăng ký / xác thực hai lớp, kiểu cửa sổ game 3D low-poly:
 * - Nằm gọn trong 1 màn hình (h-dvh), không cuộn trang.
 * - Màn hình rộng: khung chia đôi, trái là logo trôi trên đảo, phải là form.
 * - Điện thoại: logo nhỏ phía trên form.
 * Riêng màn hình cực thấp (điện thoại xoay ngang) thì chỉ phần form cuộn bên trong khung.
 */
export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className={`${baloo.variable} relative h-dvh overflow-hidden bg-background`}>
      <LowPolyScene />

      <div className="relative flex h-full items-center justify-center p-3 sm:p-6">
        <div className="flex max-h-full w-full max-w-5xl animate-fade-up flex-col overflow-hidden rounded-[32px] border-4 border-white bg-white/90 shadow-[0_10px_0_0_#e9a6b8,0_30px_60px_-15px_rgba(168,61,90,0.55)] backdrop-blur-md lg:flex-row">
          {/* Cột logo. */}
          <section className="relative flex shrink-0 items-center gap-4 overflow-hidden bg-linear-to-br from-secondary via-[#fbd3dd] to-primary/70 px-5 py-3 lg:w-[45%] lg:flex-col lg:justify-center lg:gap-2 lg:px-8 lg:py-8">
            {/* Họa tiết tam giác mờ trong nền cột. */}
            <svg
              aria-hidden="true"
              className="absolute inset-0 h-full w-full opacity-40"
              preserveAspectRatio="none"
              viewBox="0 0 100 100"
            >
              <polygon points="0,0 40,0 0,35" fill="#ffffff" opacity={0.5} />
              <polygon points="100,0 100,45 60,0" fill="#ffffff" opacity={0.35} />
              <polygon points="0,100 0,60 45,100" fill="#a83d5a" opacity={0.15} />
              <polygon points="100,100 55,100 100,55" fill="#a83d5a" opacity={0.2} />
            </svg>

            <div className="relative flex shrink-0 flex-col items-center">
              <Image
                src={logo}
                alt="The World Language"
                preload
                sizes="(min-width: 1024px) 380px, 96px"
                className="relative z-10 h-20 w-auto animate-bob drop-shadow-[0_14px_14px_rgba(122,39,65,0.35)] sm:h-24 lg:h-[min(23rem,46dvh)] short:lg:h-[min(18rem,42dvh)]"
              />
              <Island className="-mt-6 hidden w-[70%] drop-shadow-[0_10px_8px_rgba(122,39,65,0.25)] lg:block" />
            </div>

            <div className="relative min-w-0 lg:mt-3 lg:text-center">
              <p className="font-game text-xl font-extrabold leading-tight text-accent lg:text-3xl">
                Trang quản trị
              </p>
              <p className="text-sm text-slate-600 lg:mt-1">Dành riêng cho đội ngũ Language World</p>
              <ul className="mt-4 hidden justify-center gap-2 lg:flex short:lg:mt-2">
                {FEATURES.map(({ icon: Icon, label }) => (
                  <li
                    key={label}
                    className="flex items-center gap-1.5 rounded-full border-2 border-white bg-white/70 px-3 py-1 text-xs font-bold text-accent shadow-[0_3px_0_0_rgba(232,143,165,0.6)]"
                  >
                    <Icon className="size-3.5" />
                    {label}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Cột form: chỉ phần này cuộn bên trong khi màn hình quá thấp. */}
          <section className="flex min-h-0 flex-1 flex-col justify-center overflow-y-auto px-5 py-5 sm:px-10 lg:py-8 short:lg:py-5">
            {children}
          </section>
        </div>
      </div>
    </div>
  );
}
