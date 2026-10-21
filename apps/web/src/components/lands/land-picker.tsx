"use client";

import {
  faArrowLeft,
  faCheck,
  faChevronLeft,
  faChevronRight,
  faEarthAsia,
  faMapLocationDot,
  faPlaneDeparture,
  faRightFromBracket,
} from "@fortawesome/free-solid-svg-icons";
import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { gsap, useGSAP } from "@lw/ui/motion";
import { chooseLand } from "@/app/(world)/lands/actions";
import { signOut } from "@/app/(world)/login/actions";
import { Notice, SubmitButton } from "@/components/auth/auth-panel";
import { FaIcon } from "@/components/fa-icon";
import type { ActionState } from "@/lib/action-state";
import type { LandOption } from "@/lib/player";

/** 4 đinh tán ở 4 góc khung gỗ của thẻ. */
const NAILS = ["left-2 top-2", "right-2 top-2", "left-2 bottom-2", "right-2 bottom-2"];

/**
 * Thẻ một vùng đất: bức tranh lớn trong khung gỗ, con dấu mã ngôn ngữ như dấu hộ chiếu,
 * bảng tên gỗ bên dưới (tên, mô tả, số khu vực).
 */
function LandCard({ land, active, onSelect }: { land: LandOption; active: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onSelect}
      className={`land-card group ${active ? "land-card-active" : ""}`}
    >
      <span className="land-card-inner">
        <span className="land-card-frame">
          {NAILS.map((position) => (
            <span key={position} aria-hidden="true" className={`land-nail absolute ${position}`} />
          ))}
          <span className="land-card-photo">
            {land.coverUrl ? (
              <Image
                src={land.coverUrl}
                alt=""
                fill
                unoptimized
                sizes="(min-width: 1024px) 20rem, 72vw"
                className="land-card-img object-cover"
              />
            ) : (
              <span className="flex h-full items-center justify-center text-6xl text-white/80">
                <FaIcon icon={faEarthAsia} />
              </span>
            )}
            <span className="land-card-shine" aria-hidden="true" />
          </span>

          <span className="land-stamp font-poly" aria-hidden="true">
            <span className="text-[1.35rem] leading-none">{land.languageCode.toUpperCase()}</span>
          </span>
          {active ? (
            <span className="land-check" aria-hidden="true">
              <FaIcon icon={faCheck} />
            </span>
          ) : null}
        </span>

        <span className="land-plaque">
          <span className="block truncate font-poly text-2xl leading-tight text-[#fff4dc] [text-shadow:0_2px_0_#4a2a10]">
            {land.name}
          </span>
          <span className="mt-0.5 line-clamp-1 min-h-5 text-sm font-semibold text-amber-100/85">
            {land.description || " "}
          </span>
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-black/25 px-2.5 py-0.5 text-xs font-bold text-amber-100">
            <FaIcon icon={faMapLocationDot} />
            {land.areaCount > 0 ? `${land.areaCount} khu vực` : "Đang xây dựng"}
          </span>
        </span>
      </span>
    </button>
  );
}

/**
 * Màn chọn vùng đất: các vùng đất là những bức tranh lớn xếp thành một hàng (nhiều thì vuốt / bấm
 * mũi tên để xem thêm). Chọn một rồi bấm "Lên đường". Đổi lúc nào cũng được (nút vùng đất trong game).
 */
export function LandPicker({ lands, currentLandId }: { lands: LandOption[]; currentLandId: string | null }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(chooseLand, {});
  const [selectedId, setSelectedId] = useState<string | null>(
    () => state.values?.landId ?? currentLandId ?? lands[0]?.id ?? null,
  );
  const selected = lands.find((land) => land.id === selectedId) ?? null;

  const railRef = useRef<HTMLDivElement>(null);
  // Thẻ vùng đất bay lên lần lượt khi mở trang (GSAP). Bật "giảm chuyển động" thì hiện ngay.
  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(".land-card", {
          y: 36,
          autoAlpha: 0,
          rotate: -2,
          duration: 0.6,
          ease: "back.out(1.6)",
          stagger: 0.08,
          clearProps: "opacity,visibility,transform",
        });
      });
      return () => media.revert();
    },
    { scope: railRef },
  );
  const [overflow, setOverflow] = useState({ left: false, right: false });

  // Hiện nút mũi tên khi hàng thẻ dài hơn màn hình.
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const update = () =>
      setOverflow({
        left: rail.scrollLeft > 4,
        right: rail.scrollLeft + rail.clientWidth < rail.scrollWidth - 4,
      });
    update();
    rail.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(rail);
    return () => {
      rail.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, []);

  // Thẻ đang chọn luôn nằm trong tầm nhìn (lúc mở trang, lúc chọn thẻ ở mép).
  useEffect(() => {
    const card = railRef.current?.querySelector<HTMLElement>(".land-card-active");
    card?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }, [selectedId]);

  const scrollBy = (direction: number) => {
    const rail = railRef.current;
    if (rail) rail.scrollBy({ left: direction * rail.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <main className="relative z-10 flex h-full flex-col overflow-y-auto overflow-x-hidden">
      <div aria-hidden="true" className="home-fade-up pointer-events-none fixed inset-0 bg-sky-950/40" />

      {/* Hai nút ở hai góc, khác màu để không bấm nhầm: trái = quay lại game, phải = đăng xuất (đỏ). */}
      {currentLandId ? (
        <div className="home-fade-up absolute left-4 top-4 z-20 sm:left-6 sm:top-6">
          <Link
            href="/play"
            className="wood-chip font-poly text-sm"
            title="Quay lại game, giữ nguyên vùng đất đang ở"
          >
            <FaIcon icon={faArrowLeft} />
            <span className="hidden sm:inline">Quay lại game</span>
            <span className="sm:hidden">Quay lại</span>
          </Link>
        </div>
      ) : null}
      <form action={signOut} className="home-fade-up absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
        <button
          type="submit"
          className="wood-chip wood-chip-danger font-poly text-sm"
          title="Đăng xuất khỏi tài khoản"
        >
          <FaIcon icon={faRightFromBracket} />
          Đăng xuất
        </button>
      </form>

      <header className="home-fade-up relative px-4 pt-20 text-center sm:pt-10">
        <h1 className="home-title char-title font-poly text-4xl text-white sm:text-6xl">Chọn vùng đất</h1>
        <p className="land-subtitle mx-auto mt-3 inline-flex items-center gap-2 font-game text-sm font-bold sm:text-base">
          <FaIcon icon={faEarthAsia} className="text-amber-200" />
          Mỗi vùng đất là một ngôn ngữ. Bạn đổi vùng đất được bất cứ lúc nào.
        </p>
      </header>

      {lands.length === 0 ? (
        <div className="land-empty relative mx-auto mt-10 max-w-sm text-center">
          <FaIcon icon={faEarthAsia} className="text-4xl text-amber-800/70" />
          <p className="mt-2 font-poly text-lg text-amber-950">Chưa có vùng đất nào mở</p>
          <p className="mt-1 text-sm font-semibold text-amber-900/80">
            Các vùng đất đang được xây dựng, quay lại sau nhé!
          </p>
        </div>
      ) : (
        <form action={action} className="relative flex flex-1 flex-col">
          <input type="hidden" name="landId" value={selectedId ?? ""} />

          <div className="relative my-auto">
            <div ref={railRef} role="radiogroup" aria-label="Vùng đất" className="land-rail">
              {lands.map((land, i) => (
                <div
                  key={land.id}
                  className="land-card-wrap home-fade-up"
                  style={{ animationDelay: `${0.1 * i}s` }}
                >
                  <LandCard
                    land={land}
                    active={land.id === selectedId}
                    onSelect={() => setSelectedId(land.id)}
                  />
                </div>
              ))}
            </div>
            {overflow.left ? (
              // .wood-chip tự đặt position: relative, nên bọc trong khung absolute để nút nằm đè lên hàng thẻ.
              <span className="absolute left-2 top-1/2 z-10 -translate-y-1/2 sm:left-4">
                <button
                  type="button"
                  onClick={() => scrollBy(-1)}
                  aria-label="Xem vùng đất trước"
                  className="wood-chip px-3.5! text-lg"
                >
                  <FaIcon icon={faChevronLeft} />
                </button>
              </span>
            ) : null}
            {overflow.right ? (
              // .wood-chip tự đặt position: relative, nên bọc trong khung absolute để nút nằm đè lên hàng thẻ.
              <span className="absolute right-2 top-1/2 z-10 -translate-y-1/2 sm:right-4">
                <button
                  type="button"
                  onClick={() => scrollBy(1)}
                  aria-label="Xem vùng đất sau"
                  className="wood-chip px-3.5! text-lg"
                >
                  <FaIcon icon={faChevronRight} />
                </button>
              </span>
            ) : null}
          </div>

          <div className="land-confirm sticky bottom-0 mx-auto w-full max-w-xl px-4">
            {state.error ? (
              <div className="mb-3">
                <Notice tone="error">{state.error}</Notice>
              </div>
            ) : null}
            <SubmitButton pending={pending} icon={faPlaneDeparture}>
              {selected ? `Lên đường tới ${selected.name}` : "Chọn một vùng đất"}
            </SubmitButton>
          </div>
        </form>
      )}
    </main>
  );
}
