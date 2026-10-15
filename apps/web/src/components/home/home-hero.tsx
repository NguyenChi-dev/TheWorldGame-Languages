import {
  faEarthAsia,
  faGamepad,
  faPlay,
  faRightToBracket,
  faUserGroup,
  faUserPlus,
} from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import { FaIcon } from "@/components/fa-icon";

const TITLE = "Language World";

const FEATURES = [
  { icon: faEarthAsia, color: "bg-sky-500", label: "Mỗi vùng đất một ngôn ngữ" },
  { icon: faGamepad, color: "bg-pink-500", label: "Học qua mini-game" },
  { icon: faUserGroup, color: "bg-amber-500", label: "Chơi cùng bạn bè" },
];

/**
 * Nội dung trang chủ (nền thế giới nằm ở WorldBackdrop trong layout): tiêu đề nảy từng chữ,
 * bảng giới thiệu, nút "Chơi game" lấp lánh.
 * Chưa đăng nhập: "Chơi game" dẫn tới trang đăng nhập, bên dưới có 2 nút gỗ Đăng nhập / Tạo tài khoản
 * (và nút Đăng nhập ở góc trên). Đã đăng nhập: "Chơi game" vào thẳng game.
 */
export function HomeHero({ loggedIn }: { loggedIn: boolean }) {
  return (
    <main className="relative z-10 flex h-full flex-col items-center text-center">
      {loggedIn ? null : (
        <div className="home-fade-up absolute right-4 top-4 z-20 [animation-delay:0.2s] sm:right-6 sm:top-6">
          <Link href="/login" className="wood-chip font-poly text-sm sm:text-base">
            <FaIcon icon={faRightToBracket} />
            Đăng nhập
          </Link>
        </div>
      )}

      {/* Nội dung: nằm ở khoảng trời trống giữa ảnh. */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-5 px-6 pb-[12vh] sm:gap-6">
        <span className="home-fade-up rounded-full bg-white/85 px-4 py-1 font-poly text-xs uppercase tracking-[0.2em] text-violet-900 shadow-sm [animation-delay:0.1s] sm:text-sm">
          Thế giới học ngoại ngữ 3D
        </span>

        {/* Mỗi từ một khối không ngắt giữa chừng; màn hẹp thì 2 từ xuống 2 dòng. */}
        <h1
          aria-label={TITLE}
          className="home-title flex flex-wrap justify-center gap-x-[0.3em] gap-y-2 font-poly text-5xl leading-none tracking-wide sm:text-7xl lg:text-8xl"
        >
          {TITLE.split(" ").map((word, wordIndex, words) => {
            const offset = words.slice(0, wordIndex).join("").length;
            return (
              <span key={word} aria-hidden="true" className="whitespace-nowrap">
                {word.split("").map((char, charIndex) => {
                  const index = offset + charIndex;
                  return (
                    <span
                      key={charIndex}
                      data-char={char}
                      className="home-letter inline-block"
                      style={{ animationDelay: `${0.25 + index * 0.05}s` }}
                    >
                      {char}
                    </span>
                  );
                })}
              </span>
            );
          })}
        </h1>

        {/* Giới thiệu: bảng kiểu game (khối dày như nút và tiêu đề), 2 viên đá đa giác ở hai đầu,
            từ khóa tô màu. */}
        <div className="home-fade-up relative max-w-2xl [animation-delay:1s] md:max-w-none">
          <span aria-hidden="true" className="home-gem absolute -left-3 top-1/2 -translate-y-1/2" />
          <span aria-hidden="true" className="home-gem absolute -right-3 top-1/2 -translate-y-1/2" />
          {/* Màn rộng: mỗi câu đúng 1 dòng. Màn hẹp: tự xuống dòng cho cân. */}
          <p className="home-intro text-balance rounded-[1.75rem] px-7 py-4 font-game text-lg font-semibold leading-snug text-slate-700 sm:px-10 sm:text-xl">
            <span className="md:block md:whitespace-nowrap">
              Du hành qua <strong className="text-orange-500">từng vùng đất</strong>, mỗi nơi một ngôn ngữ.
            </span>{" "}
            <span className="md:block md:whitespace-nowrap">
              Học qua <strong className="text-pink-500">mini-game</strong>, trò chuyện cùng{" "}
              <strong className="text-violet-600">bạn bè</strong> trong thế giới thu nhỏ.
            </span>
          </p>
        </div>

        <div className="home-fade-up relative mt-1 [animation-delay:1.3s]">
          <span
            aria-hidden="true"
            className="home-halo pointer-events-none absolute inset-0 rounded-full bg-amber-300/70"
          />
          <Link
            href={loggedIn ? "/play" : "/login"}
            className="play-btn group relative inline-flex items-center gap-3 overflow-hidden rounded-full px-9 py-4 font-poly text-2xl sm:px-12 sm:text-3xl"
          >
            <span className="btn-icon relative size-10 text-orange-500 transition-transform group-hover:rotate-[360deg] group-hover:duration-700 sm:size-11">
              <FaIcon icon={faPlay} className="ml-0.5 text-lg" />
            </span>
            <span className="relative [text-shadow:0_2px_0_rgba(154,52,18,0.75)]">Chơi game</span>
            {/* Vệt sáng quét qua nút. */}
            <span
              aria-hidden="true"
              className="home-shine pointer-events-none absolute inset-y-0 left-0 w-1/3"
            />
          </Link>
        </div>

        {loggedIn ? null : (
          <div className="home-fade-up -mt-1 flex flex-wrap justify-center gap-3 [animation-delay:1.45s]">
            <Link href="/login" className="wood-chip font-poly text-base">
              <FaIcon icon={faRightToBracket} />
              Đăng nhập
            </Link>
            <Link href="/login?tab=signup" className="wood-chip font-poly text-base">
              <FaIcon icon={faUserPlus} />
              Tạo tài khoản
            </Link>
          </div>
        )}

        <ul className="home-fade-up flex flex-wrap justify-center gap-2 [animation-delay:1.6s]">
          {FEATURES.map((feature) => (
            <li key={feature.label} className="feature-chip font-game text-sm font-bold">
              <span className={`feature-icon ${feature.color}`}>
                <FaIcon icon={feature.icon} className="text-xs" />
              </span>
              {feature.label}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
