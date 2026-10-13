import Link from "next/link";
import { buttonClasses } from "@lw/ui";

export default function HomePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-4xl font-extrabold text-emerald-800 sm:text-6xl">Language World</h1>
      <p className="max-w-md text-lg text-slate-700">
        Học ngoại ngữ bằng cách trồng rau, mua bán và trò chuyện trong một thế giới 3D thu nhỏ.
      </p>
      <Link href="/play" className={buttonClasses("primary", "px-8 py-3 text-lg")}>
        Chơi game
      </Link>
    </main>
  );
}
