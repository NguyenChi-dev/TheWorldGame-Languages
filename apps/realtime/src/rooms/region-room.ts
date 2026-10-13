import { Room, type Client, type CloseCode } from "colyseus";
import {
  MAX_PLAYERS_PER_ROOM,
  MessageType,
  WORLD_HALF_EXTENT,
  isChatPhraseId,
  type ChatBroadcast,
  type ChatMessage,
  type MoveMessage,
} from "@lw/shared";
import { PlayerState, RegionState } from "./schema/region-state.js";

/** Giữ số trong khoảng [min, max]. Trả về null nếu không phải số hợp lệ. */
function clampNumber(value: unknown, min: number, max: number): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.min(max, Math.max(min, value));
}

/**
 * Phòng của một vùng đất. Chỉ đồng bộ vị trí và chat.
 * QUY TẮC: máy chủ realtime KHÔNG xử lý vàng hay phần thưởng (việc đó thuộc API của apps/web).
 */
export class RegionRoom extends Room<{ state: RegionState }> {
  maxClients = MAX_PLAYERS_PER_ROOM;
  state = new RegionState();

  messages = {
    [MessageType.Move]: (client: Client, message: Partial<MoveMessage>) => {
      const player = this.state.players.get(client.sessionId);
      const x = clampNumber(message?.x, -WORLD_HALF_EXTENT, WORLD_HALF_EXTENT);
      const z = clampNumber(message?.z, -WORLD_HALF_EXTENT, WORLD_HALF_EXTENT);
      if (!player || x === null || z === null) return;
      player.x = x;
      player.z = z;
    },

    [MessageType.Chat]: (client: Client, message: Partial<ChatMessage>) => {
      // Chỉ chấp nhận câu nằm trong danh sách có sẵn ở @lw/shared.
      if (!isChatPhraseId(message?.phraseId)) return;
      const broadcast: ChatBroadcast = { playerId: client.sessionId, phraseId: message.phraseId };
      this.broadcast(MessageType.Chat, broadcast);
    },
  };

  // Chữ ký đầy đủ: onAuth(client, options, context). context.token chứa token trình duyệt gửi lên.
  onAuth() {
    // TODO: sau này sẽ kiểm tra token Supabase ở đây.
    //   - Trình duyệt gửi access token (JWT) của Supabase khi vào phòng.
    //   - Máy chủ xác minh token (supabase.auth.getClaims hoặc khóa JWKS) bằng SUPABASE_URL.
    //   - Trả về thông tin người dùng (userId...) để dùng trong onJoin qua client.auth.
    // Hiện tại cho mọi người vào.
    return true;
  }

  onJoin(client: Client) {
    const player = new PlayerState();
    player.id = client.sessionId;
    player.x = 0;
    player.z = 0;
    this.state.players.set(client.sessionId, player);
    console.log(
      `[region ${this.roomId}] ${client.sessionId} vào phòng (${this.clients.length}/${this.maxClients})`,
    );
  }

  onLeave(client: Client, code: CloseCode) {
    this.state.players.delete(client.sessionId);
    console.log(`[region ${this.roomId}] ${client.sessionId} rời phòng (mã ${code})`);
  }
}
