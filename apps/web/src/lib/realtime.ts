import { Client, type Room } from "@colyseus/sdk";
import {
  DEFAULT_APPEARANCE,
  MessageType,
  REGION_ROOM,
  parseAppearance,
  type ChatBroadcast,
  type ChatPhraseId,
  type JoinOptions,
  type MoveMessage,
  type RemotePlayer,
} from "@lw/shared";
import { createClient } from "@/lib/supabase/client";

const REALTIME_URL = process.env.NEXT_PUBLIC_REALTIME_URL || "ws://localhost:2567";

/** Một người chơi trong state phòng (xem apps/realtime/src/rooms/schema/region-state.ts). */
interface RegionPlayer {
  x: number;
  z: number;
  username: string;
  gender: string;
  hat: string;
  top: string;
  bottom: string;
}

/** Hình dạng state mà phòng "region" ở apps/realtime gửi xuống. */
interface RegionState {
  players: {
    size: number;
    forEach: (callback: (player: RegionPlayer, id: string) => void) => void;
  };
}

export interface RealtimeCallbacks {
  /** Phòng của vùng đất này + chỗ xuất hiện. Máy chủ tự đọc tên, trang phục từ hồ sơ. */
  join: JoinOptions;
  /** Danh sách người chơi khác (không gồm mình) mỗi khi có thay đổi. */
  onPlayersChange: (players: RemotePlayer[]) => void;
  onStatusChange: (status: "online" | "offline", onlineCount: number) => void;
  /** Có người trong phòng gửi một câu chat có sẵn. */
  onChat?: (message: ChatBroadcast) => void;
}

export interface RealtimeConnection {
  sendMove: (move: MoveMessage) => void;
  sendChat: (phraseId: ChatPhraseId) => void;
  disconnect: () => void;
}

/**
 * Kết nối tới máy chủ realtime và vào phòng "region".
 * Nếu máy chủ không chạy, chỉ báo "offline"; game vẫn chơi bình thường.
 */
export function connectRealtime(callbacks: RealtimeCallbacks): RealtimeConnection {
  let room: Room<unknown, RegionState> | null = null;
  let disconnected = false;

  const client = new Client(REALTIME_URL);

  // Gửi token đăng nhập để máy chủ biết mình là ai (đọc tên, trang phục, vùng đất từ hồ sơ).
  createClient()
    .auth.getSession()
    .then(({ data }) => {
      if (data.session) client.auth.token = data.session.access_token;
      return client.joinOrCreate<RegionState>(REGION_ROOM, callbacks.join);
    })
    .then((joined) => {
      // Người dùng đã rời trang trong lúc đang kết nối.
      if (disconnected) {
        void joined.leave();
        return;
      }
      room = joined;

      joined.onStateChange((state) => {
        const others: RemotePlayer[] = [];
        state.players.forEach((player, id) => {
          if (id === joined.sessionId) return;
          const appearance =
            parseAppearance({
              gender: player.gender,
              hat: player.hat,
              top: player.top,
              bottom: player.bottom,
            }) ?? DEFAULT_APPEARANCE;
          others.push({ id, x: player.x, z: player.z, username: player.username || "Lữ khách", appearance });
        });
        callbacks.onPlayersChange(others);
        callbacks.onStatusChange("online", state.players.size);
      });

      joined.onMessage(MessageType.Chat, (message: ChatBroadcast) => callbacks.onChat?.(message));

      joined.onLeave(() => {
        room = null;
        callbacks.onPlayersChange([]);
        if (!disconnected) callbacks.onStatusChange("offline", 0);
      });
    })
    .catch((error: unknown) => {
      if (disconnected) return;
      console.info("[realtime] Không kết nối được, chơi offline.", error);
      callbacks.onStatusChange("offline", 0);
    });

  return {
    sendMove: (move) => room?.send(MessageType.Move, move),
    sendChat: (phraseId) => room?.send(MessageType.Chat, { phraseId }),
    disconnect: () => {
      disconnected = true;
      void room?.leave();
      room = null;
    },
  };
}
