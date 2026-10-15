import { create } from "zustand";

export type ConnectionStatus = "connecting" | "online" | "offline";
export type ApiStatus = "checking" | "ok" | "offline";

interface GameState {
  connection: ConnectionStatus;
  /** Số người đang ở trong phòng, tính cả mình. */
  onlineCount: number;
  /** Trạng thái máy chủ apps/api (kiểm tra bằng GET /health). */
  apiStatus: ApiStatus;
  setConnection: (status: ConnectionStatus, onlineCount?: number) => void;
  setApiStatus: (status: ApiStatus) => void;
}

export const useGameStore = create<GameState>()((set) => ({
  connection: "connecting",
  onlineCount: 0,
  apiStatus: "checking",
  setConnection: (connection, onlineCount = 0) => set({ connection, onlineCount }),
  setApiStatus: (apiStatus) => set({ apiStatus }),
}));
