import { create } from "zustand";
import { STARTING_GOLD } from "@lw/shared";

export type ConnectionStatus = "connecting" | "online" | "offline";

interface GameState {
  /** Số vàng đang hiển thị. Giá trị thật sẽ do API máy chủ trả về ở giai đoạn sau. */
  gold: number;
  connection: ConnectionStatus;
  /** Số người đang ở trong phòng, tính cả mình. */
  onlineCount: number;
  setGold: (gold: number) => void;
  setConnection: (status: ConnectionStatus, onlineCount?: number) => void;
}

export const useGameStore = create<GameState>()((set) => ({
  gold: STARTING_GOLD,
  connection: "connecting",
  onlineCount: 0,
  setGold: (gold) => set({ gold }),
  setConnection: (connection, onlineCount = 0) => set({ connection, onlineCount }),
}));
