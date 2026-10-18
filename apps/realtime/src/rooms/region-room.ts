import { Room, ServerError, type AuthContext, type Client, type CloseCode } from "colyseus";
import {
  MAX_PLAYERS_PER_ROOM,
  MessageType,
  WORLD_HALF_EXTENT,
  isChatPhraseId,
  type ChatBroadcast,
  type ChatMessage,
  type JoinOptions,
  type MoveMessage,
} from "@lw/shared";
import { AuthFailure, verifyPlayer, type PlayerIdentity } from "../auth.js";
import { PlayerState, RegionState } from "./schema/region-state.js";

/** Giữ số trong khoảng [min, max]. Trả về null nếu không phải số hợp lệ. */
function clampNumber(value: unknown, min: number, max: number): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.min(max, Math.max(min, value));
}

/**
 * Phòng của một vùng đất (app.config.ts lọc phòng theo landId). Chỉ đồng bộ vị trí và chat.
 * QUY TẮC: máy chủ realtime KHÔNG xử lý vàng hay phần thưởng (việc đó thuộc apps/api).
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

  /**
   * Kiểm tra token Supabase, đọc tên / trang phục / vùng đất từ hồ sơ.
   * Chỉ cho vào phòng của đúng vùng đất người chơi đang chọn.
   */
  async onAuth(
    _client: Client,
    options: Partial<JoinOptions>,
    context: AuthContext,
  ): Promise<PlayerIdentity> {
    try {
      const identity = await verifyPlayer(context.token);
      if (!identity.landId || identity.landId !== options?.landId)
        throw new AuthFailure("Bạn đang ở vùng đất khác");
      return identity;
    } catch (error) {
      if (error instanceof AuthFailure) throw new ServerError(401, error.message);
      throw error;
    }
  }

  onJoin(client: Client, options: Partial<JoinOptions>, identity: PlayerIdentity) {
    const player = new PlayerState();
    player.id = client.sessionId;
    player.x = clampNumber(options?.x, -WORLD_HALF_EXTENT, WORLD_HALF_EXTENT) ?? 0;
    player.z = clampNumber(options?.z, -WORLD_HALF_EXTENT, WORLD_HALF_EXTENT) ?? 0;
    player.username = identity.username;
    player.gender = identity.appearance.gender;
    player.hat = identity.appearance.hat;
    player.top = identity.appearance.top;
    player.bottom = identity.appearance.bottom;
    this.state.players.set(client.sessionId, player);
    console.log(
      `[region ${this.roomId}] ${identity.username} vào phòng (${this.clients.length}/${this.maxClients})`,
    );
  }

  onLeave(client: Client, code: CloseCode) {
    this.state.players.delete(client.sessionId);
    console.log(`[region ${this.roomId}] ${client.sessionId} rời phòng (mã ${code})`);
  }
}
