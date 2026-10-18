"use client";

import {
  faArrowRightFromBracket,
  faDoorOpen,
  faEarthAsia,
  faServer,
  faTowerBroadcast,
  faUser,
  faUsersSlash,
} from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOut, signOutEverywhere } from "@/app/(world)/login/actions";
import { FaIcon } from "@/components/fa-icon";
import type { PlayerLand } from "@/lib/player";
import { useGameStore } from "@/store/game-store";
import { useApiHealth } from "./use-api-health";

type Led = "on" | "wait" | "off";

/** Bảng trạng thái nhỏ: đèn LED + icon + chữ. */
function StatusLight({ led, icon, label }: { led: Led; icon: typeof faServer; label: string }) {
  return (
    // Màn hẹp chỉ hiện đèn + icon (chữ vẫn có cho trình đọc màn hình và khi rê chuột).
    <div className="hud-status whitespace-nowrap font-game text-sm font-bold" role="status" title={label}>
      <span className={`led led-${led}`} aria-hidden="true" />
      <FaIcon icon={icon} className="text-xs text-slate-400" />
      <span className="sr-only sm:not-sr-only">{label}</span>
    </div>
  );
}

/** Nút Thoát: mở bảng nhỏ chọn "Đăng xuất" (thiết bị này) hoặc "Đăng xuất mọi thiết bị". */
function ExitMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Bấm ra ngoài hoặc nhấn Esc thì đóng.
  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const item =
    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left font-game text-sm font-bold text-[#fff4dc] [text-shadow:0_1px_0_#4a2a10] transition hover:bg-black/15";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="hud-icon-btn text-lg"
        aria-label="Thoát"
        title="Thoát"
      >
        <FaIcon icon={faDoorOpen} />
      </button>
      {open ? (
        <div role="menu" className="hud-plate hud-menu absolute left-0 top-full z-30 mt-3 w-60">
          <form action={signOut}>
            <button type="submit" role="menuitem" className={item}>
              <FaIcon icon={faArrowRightFromBracket} fixedWidth />
              Đăng xuất
            </button>
          </form>
          <form action={signOutEverywhere}>
            <button type="submit" role="menuitem" className={item}>
              <FaIcon icon={faUsersSlash} fixedWidth />
              Đăng xuất mọi thiết bị
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Giao diện đè lên game:
 *   - trái: tấm gỗ có huy hiệu + tên nhân vật, nút gỗ Thoát (đăng xuất / đăng xuất mọi thiết bị),
 *     bảng vùng đất đang ở (bấm để đổi vùng đất);
 *   - phải: đèn trạng thái máy chủ realtime (người online) và máy chủ API.
 */
export function Hud({ playerName, land }: { playerName: string; land: PlayerLand }) {
  useApiHealth();

  const connection = useGameStore((state) => state.connection);
  const onlineCount = useGameStore((state) => state.onlineCount);
  const apiStatus = useGameStore((state) => state.apiStatus);

  const realtime: { led: Led; label: string } =
    connection === "online"
      ? { led: "on", label: `${onlineCount} người online` }
      : connection === "offline"
        ? { led: "off", label: "Mất kết nối" }
        : { led: "wait", label: "Đang kết nối..." };
  const api: { led: Led; label: string } =
    apiStatus === "ok"
      ? { led: "on", label: "Máy chủ ổn định" }
      : apiStatus === "offline"
        ? { led: "off", label: "Máy chủ lỗi" }
        : { led: "wait", label: "Đang kiểm tra..." };

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:p-4">
      <div className="pointer-events-auto flex items-center gap-2.5">
        <div className="hud-plate">
          <span className="hud-avatar font-poly text-lg" aria-hidden="true">
            {playerName ? playerName.charAt(0).toUpperCase() : <FaIcon icon={faUser} />}
          </span>
          <span className="min-w-0">
            <span className="block text-[10px] font-bold uppercase tracking-widest text-amber-200/90">
              Lữ khách
            </span>
            <span className="block max-w-[34vw] truncate font-poly text-base leading-tight text-[#fff4dc] [text-shadow:0_2px_0_#4a2a10] sm:max-w-[16rem]">
              {playerName}
            </span>
          </span>
        </div>
        <ExitMenu />
        <Link href="/lands" className="hud-plate hud-land" title="Đổi vùng đất">
          <FaIcon icon={faEarthAsia} className="text-lg text-amber-100" />
          <span className="min-w-0">
            <span className="block text-[10px] font-bold uppercase tracking-widest text-amber-200/90">
              {land.languageCode.toUpperCase()}
            </span>
            <span className="hidden max-w-[12rem] truncate font-poly text-sm sm:block leading-tight text-[#fff4dc] [text-shadow:0_2px_0_#4a2a10]">
              {land.name}
            </span>
          </span>
        </Link>
      </div>

      <div className="flex flex-col items-end gap-2">
        <StatusLight led={realtime.led} icon={faTowerBroadcast} label={realtime.label} />
        <StatusLight led={api.led} icon={faServer} label={api.label} />
      </div>
    </div>
  );
}
