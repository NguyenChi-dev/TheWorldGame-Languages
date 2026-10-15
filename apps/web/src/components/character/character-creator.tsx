"use client";

import {
  faArrowRightFromBracket,
  faArrowsRotate,
  faBan,
  faCrown,
  faDice,
  faMars,
  faPlay,
  faShirt,
  faSocks,
  faUser,
  faVenus,
  type IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import dynamic from "next/dynamic";
import { useActionState, useState, type CSSProperties } from "react";
import {
  BOTTOMS,
  BOTTOM_KEYS,
  DEFAULT_APPEARANCE,
  GENDERS,
  GENDER_LABELS,
  HATS,
  HAT_KEYS,
  TOPS,
  TOP_KEYS,
  USERNAME_RULE,
  parseAppearance,
  randomAppearance,
  type CharacterAppearance,
  type Gender,
  type OutfitPart,
} from "@lw/shared";
import { chooseCharacter } from "@/app/(world)/character/actions";
import { signOut } from "@/app/(world)/login/actions";
import { Notice, SubmitButton, WoodField } from "@/components/auth/auth-panel";
import { WoodBoard } from "@/components/auth/wood-board";
import { FaIcon } from "@/components/fa-icon";
import type { ActionState } from "@/lib/action-state";

// Babylon.js cần window và WebGL: chỉ tải ở trình duyệt.
const CharacterStage = dynamic(() => import("./character-stage"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center font-poly text-lg text-white/90 [text-shadow:0_2px_0_rgba(0,0,0,0.35)]">
      Đang gọi nhân vật...
    </div>
  ),
});

type Slot = "hat" | "top" | "bottom";

const GENDER_ICONS: Record<Gender, IconDefinition> = { female: faVenus, male: faMars };

/** 3 ngăn tủ đồ: mỗi ngăn là một món trong ngoại hình. */
const SLOTS: {
  key: Slot;
  label: string;
  icon: IconDefinition;
  keys: readonly string[];
  parts: Record<string, OutfitPart>;
}[] = [
  { key: "hat", label: "Mũ nón", icon: faCrown, keys: HAT_KEYS, parts: HATS },
  { key: "top", label: "Áo", icon: faShirt, keys: TOP_KEYS, parts: TOPS },
  { key: "bottom", label: "Váy / quần", icon: faSocks, keys: BOTTOM_KEYS, parts: BOTTOMS },
];

/** Ô màu của món đồ (màu chính + vạch màu phụ). "Không đội" hiện biểu tượng cấm. */
function PartSwatch({ part, none }: { part: OutfitPart; none?: boolean }) {
  const style = { "--c": part.color, "--a": part.accent } as CSSProperties;
  return (
    <span aria-hidden="true" className={`part-swatch ${none ? "part-swatch-none" : ""}`} style={style}>
      {none ? <FaIcon icon={faBan} className="text-base text-amber-900/60" /> : null}
    </span>
  );
}

/**
 * Màn chọn nhân vật: bên trái (trên điện thoại: phía trên) là nhân vật 3D trên đảo nổi;
 * bên phải là bảng gỗ: chọn nam / nữ, phối mũ nón + áo + váy / quần, đặt tên rồi "Vào thế giới".
 */
export function CharacterCreator({ initialUsername }: { initialUsername: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(chooseCharacter, {});
  const [look, setLook] = useState<CharacterAppearance>(
    () => parseAppearance(state.values) ?? DEFAULT_APPEARANCE,
  );
  const [slot, setSlot] = useState<Slot>("hat");
  const slotIndex = SLOTS.findIndex((item) => item.key === slot);
  const current = SLOTS[slotIndex];

  // Bảng tên dưới nhân vật: "Nón lá · Áo dài · Quần lụa" (bỏ "Không đội").
  const wearing = [look.hat === "none" ? null : HATS[look.hat], TOPS[look.top], BOTTOMS[look.bottom]]
    .filter((part) => part !== null)
    .map((part) => part.name)
    .join(" · ");

  return (
    <main className="relative z-10 flex h-full flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
      <div aria-hidden="true" className="home-fade-up pointer-events-none fixed inset-0 bg-sky-950/25" />

      <form action={signOut} className="home-fade-up absolute left-4 top-4 z-20 sm:left-6 sm:top-6">
        <button type="submit" className="wood-chip font-poly text-sm">
          <FaIcon icon={faArrowRightFromBracket} flip="horizontal" />
          Thoát
        </button>
      </form>

      {/* Nhân vật 3D */}
      <section className="relative h-[50vh] min-h-[340px] w-full shrink-0 lg:h-full lg:min-h-0 lg:flex-1">
        <div className="home-fade-up pointer-events-none absolute inset-x-0 top-18 z-10 text-center lg:top-6">
          <h1 className="home-title char-title font-poly text-3xl text-white sm:text-5xl">Tạo nhân vật</h1>
        </div>
        <CharacterStage appearance={look} />
        <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex flex-col items-center gap-2 sm:bottom-6">
          <span className="char-plate font-game text-sm font-extrabold sm:text-base">{wearing}</span>
          <span className="flex items-center gap-1.5 font-game text-xs font-bold text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]">
            <FaIcon icon={faArrowsRotate} />
            Kéo để xoay nhân vật
          </span>
        </div>
      </section>

      {/* Bảng gỗ */}
      <section className="relative flex w-full justify-center px-4 pb-10 pt-8 lg:h-full lg:w-[460px] lg:shrink-0 lg:items-center lg:overflow-y-auto lg:py-10 lg:pl-0 lg:pr-8">
        <div className="char-board w-full max-w-md">
          <WoodBoard>
            <div className="space-y-4">
              <div className="text-center">
                <h2 className="wood-carve font-poly text-2xl sm:text-3xl">Lữ khách mới</h2>
                <p className="wood-label mt-1 font-game text-sm font-semibold">
                  Chọn nam hoặc nữ, rồi tự phối trang phục các vùng đất
                </p>
              </div>

              {/* Nam / nữ */}
              <div role="radiogroup" aria-label="Giới tính" className="grid grid-cols-2 gap-2.5">
                {GENDERS.map((gender) => (
                  <button
                    key={gender}
                    type="button"
                    role="radio"
                    aria-checked={look.gender === gender}
                    onClick={() => setLook((value) => ({ ...value, gender }))}
                    className={`char-card char-gender ${look.gender === gender ? "char-card-active" : ""}`}
                  >
                    <FaIcon icon={GENDER_ICONS[gender]} className="text-xl text-amber-900" />
                    <span className="font-poly text-lg text-amber-950">{GENDER_LABELS[gender]}</span>
                  </button>
                ))}
              </div>

              {/* Ngăn tủ đồ */}
              <div role="tablist" aria-label="Trang phục" className="wood-tab-track grid grid-cols-3">
                <span
                  aria-hidden="true"
                  className="wood-tab-indicator"
                  style={{ width: "calc((100% - 8px) / 3)", transform: `translateX(${slotIndex * 100}%)` }}
                />
                {SLOTS.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    role="tab"
                    aria-selected={slot === item.key}
                    onClick={() => setSlot(item.key)}
                    className="wood-tab flex items-center justify-center gap-1.5 rounded-xl py-2 font-poly text-xs sm:text-sm"
                  >
                    <FaIcon icon={item.icon} className="text-xs" />
                    {item.label}
                  </button>
                ))}
              </div>

              <div
                key={slot}
                role="radiogroup"
                aria-label={current.label}
                className="tab-slide-next grid grid-cols-3 gap-2.5"
              >
                {current.keys.map((key) => {
                  const part = current.parts[key];
                  const active = look[slot] === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setLook((value) => ({ ...value, [slot]: key }))}
                      className={`char-card ${active ? "char-card-active" : ""}`}
                    >
                      <PartSwatch part={part} none={key === "none"} />
                      <span className="block font-game text-[13px] font-extrabold leading-tight text-amber-950">
                        {part.name}
                      </span>
                      <span className="block text-[11px] font-semibold leading-tight text-amber-900/70">
                        {part.origin ?? " "}
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setLook((value) => randomAppearance(value.gender))}
                className="wood-chip w-full justify-center font-poly text-sm"
              >
                <FaIcon icon={faDice} />
                Phối ngẫu nhiên
              </button>

              <form action={action} className="space-y-3">
                <input type="hidden" name="gender" value={look.gender} />
                <input type="hidden" name="hat" value={look.hat} />
                <input type="hidden" name="top" value={look.top} />
                <input type="hidden" name="bottom" value={look.bottom} />
                <WoodField
                  label="Tên nhân vật"
                  name="username"
                  icon={faUser}
                  autoComplete="nickname"
                  defaultValue={state.values?.username ?? initialUsername}
                  placeholder="Ví dụ: Mèo_Ú"
                  maxLength={32}
                />
                <p className="wood-label -mt-1 text-xs font-semibold opacity-90">{USERNAME_RULE}</p>
                {state.error ? <Notice tone="error">{state.error}</Notice> : null}
                <SubmitButton pending={pending} icon={faPlay}>
                  Vào thế giới
                </SubmitButton>
              </form>
            </div>
          </WoodBoard>
        </div>
      </section>
    </main>
  );
}
