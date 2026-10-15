"use client";

import {
  faArrowLeft,
  faArrowRightFromBracket,
  faCheck,
  faEarthAsia,
  faLanguage,
  faMapLocationDot,
  faPlaneDeparture,
} from "@fortawesome/free-solid-svg-icons";
import Image from "next/image";
import Link from "next/link";
import { useActionState, useState } from "react";
import { chooseLand } from "@/app/(world)/lands/actions";
import { signOut } from "@/app/(world)/login/actions";
import { Notice, SubmitButton } from "@/components/auth/auth-panel";
import { FaIcon } from "@/components/fa-icon";
import type { ActionState } from "@/lib/action-state";
import type { LandOption } from "@/lib/player";

/** Thẻ một vùng đất: ảnh bìa dọc như tấm bưu thiếp, mã ngôn ngữ, tên, mô tả, số khu vực. */
function LandCard({ land, active, onSelect }: { land: LandOption; active: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onSelect}
      className={`land-card group ${active ? "land-card-active" : ""}`}
    >
      <span className="land-card-photo">
        {land.coverUrl ? (
          <Image
            src={land.coverUrl}
            alt=""
            fill
            unoptimized
            sizes="(min-width: 768px) 15rem, 45vw"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <span className="flex h-full items-center justify-center text-5xl text-white/80">
            <FaIcon icon={faEarthAsia} />
          </span>
        )}
        <span className="land-card-shade" aria-hidden="true" />
      </span>

      <span className="land-code font-poly">
        <FaIcon icon={faLanguage} className="text-[0.7em]" />
        {land.languageCode.toUpperCase()}
      </span>
      {active ? (
        <span className="land-check" aria-hidden="true">
          <FaIcon icon={faCheck} />
        </span>
      ) : null}

      <span className="land-card-body">
        <span className="block truncate font-poly text-xl leading-tight text-white [text-shadow:0_2px_0_rgba(0,0,0,0.45)]">
          {land.name}
        </span>
        {land.description ? (
          <span className="mt-0.5 line-clamp-2 text-xs font-semibold text-white/85">{land.description}</span>
        ) : null}
        <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-black/30 px-2 py-0.5 text-[11px] font-bold text-amber-100">
          <FaIcon icon={faMapLocationDot} />
          {land.areaCount > 0 ? `${land.areaCount} khu vực` : "Đang xây dựng"}
        </span>
      </span>
    </button>
  );
}

/**
 * Màn chọn vùng đất: các vùng đất xếp như bưu thiếp, chọn một rồi bấm "Lên đường".
 * Đổi lúc nào cũng được (nút đổi vùng đất trong game mở lại màn này).
 */
export function LandPicker({ lands, currentLandId }: { lands: LandOption[]; currentLandId: string | null }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(chooseLand, {});
  const [selectedId, setSelectedId] = useState<string | null>(
    () => state.values?.landId ?? currentLandId ?? lands[0]?.id ?? null,
  );
  const selected = lands.find((land) => land.id === selectedId) ?? null;

  return (
    <main className="relative z-10 flex h-full flex-col items-center overflow-y-auto px-4 pb-10 pt-20 sm:pt-24">
      <div aria-hidden="true" className="home-fade-up pointer-events-none fixed inset-0 bg-sky-950/35" />

      <div className="home-fade-up absolute left-4 top-4 z-20 flex gap-2 sm:left-6 sm:top-6">
        {currentLandId ? (
          <Link href="/play" className="wood-chip font-poly text-sm">
            <FaIcon icon={faArrowLeft} />
            Vào game
          </Link>
        ) : null}
        <form action={signOut}>
          <button type="submit" className="wood-chip font-poly text-sm">
            <FaIcon icon={faArrowRightFromBracket} flip="horizontal" />
            Thoát
          </button>
        </form>
      </div>

      <div className="home-fade-up relative text-center">
        <h1 className="home-title char-title font-poly text-3xl text-white sm:text-5xl">Chọn vùng đất</h1>
        <p className="mt-3 font-game text-sm font-bold text-white/90 [text-shadow:0_1px_3px_rgba(0,0,0,0.6)] sm:text-base">
          Mỗi vùng đất là một ngôn ngữ. Bạn đổi vùng đất được bất cứ lúc nào.
        </p>
      </div>

      {lands.length === 0 ? (
        <div className="land-empty relative mt-10 max-w-sm text-center">
          <FaIcon icon={faEarthAsia} className="text-4xl text-amber-800/70" />
          <p className="mt-2 font-poly text-lg text-amber-950">Chưa có vùng đất nào mở</p>
          <p className="mt-1 text-sm font-semibold text-amber-900/80">
            Các vùng đất đang được xây dựng, quay lại sau nhé!
          </p>
        </div>
      ) : (
        <form action={action} className="relative mt-8 flex w-full max-w-5xl flex-col items-center">
          <input type="hidden" name="landId" value={selectedId ?? ""} />
          <div
            role="radiogroup"
            aria-label="Vùng đất"
            className="flex w-full flex-wrap justify-center gap-4 sm:gap-5"
          >
            {lands.map((land, i) => (
              <div
                key={land.id}
                className="land-card-wrap home-fade-up"
                style={{ animationDelay: `${0.08 * i}s` }}
              >
                <LandCard
                  land={land}
                  active={land.id === selectedId}
                  onSelect={() => setSelectedId(land.id)}
                />
              </div>
            ))}
          </div>

          <div className="land-confirm sticky bottom-0 mt-8 w-full max-w-md">
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
