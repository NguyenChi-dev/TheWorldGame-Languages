import { create } from "zustand";
import type { TownPlaceKey } from "@lw/shared";

export type ConnectionStatus = "connecting" | "online" | "offline";
export type ApiStatus = "checking" | "ok" | "offline";

interface GameState {
  connection: ConnectionStatus;
  /** Số người đang ở trong phòng, tính cả mình. */
  onlineCount: number;
  /** Trạng thái máy chủ apps/api (kiểm tra bằng GET /health). */
  apiStatus: ApiStatus;
  /** Địa điểm nhân vật đang đứng trên bản đồ (null: đang đi / không ở đâu). */
  place: TownPlaceKey | null;
  /** Địa điểm đang được rê chuột lên (hiện chú thích cạnh con trỏ). */
  hovered: TownPlaceKey | null;
  /** Địa điểm nhân vật đang đi tới (để danh sách địa điểm đánh dấu). */
  heading: TownPlaceKey | null;
  /** Ra lệnh cho game đi tới địa điểm (game gắn vào khi bản đồ sẵn sàng). */
  travel: ((place: TownPlaceKey) => void) | null;
  /** Gửi hướng cần điều khiển cho game (x phải, y lên; mỗi trục -1..1). */
  steer: ((x: number, y: number) => void) | null;
  setConnection: (status: ConnectionStatus, onlineCount?: number) => void;
  setApiStatus: (status: ApiStatus) => void;
  setPlace: (place: TownPlaceKey | null) => void;
  setHeading: (place: TownPlaceKey | null) => void;
  setHovered: (place: TownPlaceKey | null) => void;
  setTravel: (travel: ((place: TownPlaceKey) => void) | null) => void;
  setSteer: (steer: ((x: number, y: number) => void) | null) => void;
}

export const useGameStore = create<GameState>()((set) => ({
  connection: "connecting",
  onlineCount: 0,
  apiStatus: "checking",
  setConnection: (connection, onlineCount = 0) => set({ connection, onlineCount }),
  setApiStatus: (apiStatus) => set({ apiStatus }),
  place: null,
  heading: null,
  hovered: null,
  setHovered: (hovered) => set({ hovered }),
  travel: null,
  setPlace: (place) => set({ place, heading: null }),
  setHeading: (heading) => set({ heading }),
  setTravel: (travel) => set({ travel }),
  steer: null,
  setSteer: (steer) => set({ steer }),
}));
