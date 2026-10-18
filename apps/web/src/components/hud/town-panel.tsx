"use client";

import {
  faBasketShopping,
  faBookOpen,
  faBus,
  faDoorOpen,
  faEnvelope,
  faFilm,
  faLandmark,
  faLocationDot,
  faMapLocationDot,
  faMugHot,
  faPersonWalking,
  faSchool,
  faTractor,
  faXmark,
  type IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import { useEffect, useRef, useState } from "react";
import { TOWN_PLACES, TOWN_PLACE_KEYS, type TownPlaceKey } from "@lw/shared";
import { FaIcon } from "@/components/fa-icon";
import { useGameStore } from "@/store/game-store";

const PLACE_ICONS: Record<TownPlaceKey, IconDefinition> = {
  square: faLandmark,
  school: faSchool,
  library: faBookOpen,
  market: faBasketShopping,
  cafe: faMugHot,
  cinema: faFilm,
  post_office: faEnvelope,
  farm: faTractor,
  bus_station: faBus,
};

/**
 * Chú thích nhỏ đi theo con trỏ khi rê lên một địa điểm: icon, tên Anh / Việt, gợi ý bấm để đi.
 * Vị trí cập nhật thẳng vào style (không vẽ lại React mỗi lần chuột nhích).
 */
function PlaceTooltip() {
  const hovered = useGameStore((state) => state.hovered);
  const here = useGameStore((state) => state.place);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const el = ref.current;
      if (!el) return;
      // Lật sang trái / lên trên khi gần mép màn hình.
      const flipX = event.clientX > window.innerWidth - 260;
      const flipY = event.clientY > window.innerHeight - 140;
      el.style.transform = `translate(${event.clientX + (flipX ? -18 : 18)}px, ${event.clientY + (flipY ? -18 : 22)}px) translate(${flipX ? "-100%" : "0"}, ${flipY ? "-100%" : "0"})`;
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <div ref={ref} aria-hidden={!hovered} className="pointer-events-none fixed left-0 top-0 z-30">
      {hovered ? (
        <div key={hovered} className="place-tooltip">
          <span className="town-menu-icon">
            <FaIcon icon={PLACE_ICONS[hovered]} />
          </span>
          <span className="min-w-0">
            <span className="block font-poly text-sm leading-tight">{TOWN_PLACES[hovered].en}</span>
            <span className="block text-xs font-bold opacity-85">{TOWN_PLACES[hovered].vi}</span>
            <span className="mt-0.5 flex items-center gap-1 text-[11px] font-bold text-amber-200">
              <FaIcon icon={here === hovered ? faLocationDot : faPersonWalking} />
              {here === hovered ? "Bạn đang ở đây" : "Bấm để đi tới"}
            </span>
          </span>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Giao diện bản đồ thị trấn (đè lên game):
 *   - góc dưới phải: nút "Địa điểm" mở danh sách, bấm một nơi thì nhân vật tự đi tới đó;
 *   - giữa dưới: tấm biển khi nhân vật vừa tới một địa điểm (tên Anh / Việt, học gì ở đây).
 */
export function TownPanel() {
  const place = useGameStore((state) => state.place);
  const heading = useGameStore((state) => state.heading);
  const travel = useGameStore((state) => state.travel);
  const [open, setOpen] = useState(false);

  return (
    <>
      <PlaceTooltip />
      <div className="pointer-events-none absolute bottom-0 right-0 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4">
        <div className="pointer-events-auto flex flex-col items-end gap-2">
          {open ? (
            <div
              role="menu"
              aria-label="Địa điểm trong thị trấn"
              className="hud-plate hud-menu town-menu w-64"
            >
              <p className="px-2 pb-1 pt-0.5 font-poly text-sm text-amber-100">Đi tới…</p>
              {TOWN_PLACE_KEYS.map((key) => {
                const info = TOWN_PLACES[key];
                const here = place === key;
                const going = heading === key;
                return (
                  <button
                    key={key}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      travel?.(key);
                      setOpen(false);
                    }}
                    className={`town-menu-item ${here ? "town-menu-item-here" : ""}`}
                  >
                    <span className="town-menu-icon">
                      <FaIcon icon={PLACE_ICONS[key]} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-poly text-[13px] leading-tight">{info.en}</span>
                      <span className="block truncate text-[11px] font-semibold opacity-80">{info.vi}</span>
                    </span>
                    {here ? (
                      <FaIcon icon={faLocationDot} className="text-emerald-300" title="Bạn đang ở đây" />
                    ) : going ? (
                      <FaIcon icon={faPersonWalking} className="text-amber-200" title="Đang đi tới" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            className="wood-chip font-poly text-sm"
          >
            <FaIcon icon={open ? faXmark : faMapLocationDot} />
            {open ? "Đóng" : "Địa điểm"}
          </button>
        </div>
      </div>

      {place ? (
        // Điện thoại: tấm biển nằm trên (dưới thanh trạng thái) để không che cần điều khiển ở góc dưới.
        <div className="pointer-events-none absolute inset-x-0 top-16 flex justify-center p-3 md:top-auto md:bottom-0 md:p-4">
          <div
            key={place}
            className="town-arrive pointer-events-auto hud-plate w-full max-w-sm flex-col items-stretch! gap-2! p-4!"
          >
            <div className="flex items-center gap-3">
              <span className="town-menu-icon size-12! text-xl!">
                <FaIcon icon={PLACE_ICONS[place]} />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-200/90">
                  Bạn đã tới
                </p>
                <p className="truncate font-poly text-xl leading-tight text-[#fff4dc] [text-shadow:0_2px_0_#4a2a10]">
                  {TOWN_PLACES[place].en}
                </p>
                <p className="truncate text-sm font-bold text-amber-100">{TOWN_PLACES[place].vi}</p>
              </div>
            </div>
            <p className="rounded-lg bg-black/20 px-3 py-2 text-xs font-semibold text-amber-50">
              {TOWN_PLACES[place].hint}
            </p>
            <button
              type="button"
              disabled
              className="town-enter font-poly text-sm"
              title="Khu vực đang được xây dựng"
            >
              <FaIcon icon={faDoorOpen} />
              Vào trong · Sắp mở
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
