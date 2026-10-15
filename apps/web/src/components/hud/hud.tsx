"use client";

import { faDoorOpen, faServer, faTowerBroadcast, faUser } from "@fortawesome/free-solid-svg-icons";
import { signOut } from "@/app/(world)/login/actions";
import { FaIcon } from "@/components/fa-icon";
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

/**
 * Giao diện đè lên game:
 *   - trái: tấm gỗ có huy hiệu + tên nhân vật, nút gỗ Thoát (đăng xuất);
 *   - phải: đèn trạng thái máy chủ realtime (người online) và máy chủ API.
 */
export function Hud({ playerName }: { playerName: string }) {
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
        <form action={signOut}>
          <button type="submit" className="hud-icon-btn text-lg" aria-label="Thoát (đăng xuất)" title="Thoát">
            <FaIcon icon={faDoorOpen} />
          </button>
        </form>
      </div>

      <div className="flex flex-col items-end gap-2">
        <StatusLight led={realtime.led} icon={faTowerBroadcast} label={realtime.label} />
        <StatusLight led={api.led} icon={faServer} label={api.label} />
      </div>
    </div>
  );
}
