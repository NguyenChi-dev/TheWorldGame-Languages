/**
 * Giao kèo giữa máy chủ realtime (apps/realtime) và trình duyệt (apps/web).
 * Máy chủ realtime chỉ đồng bộ vị trí và chat, KHÔNG xử lý vàng hay phần thưởng.
 */

/** Tên phòng Colyseus cho một vùng đất. */
export const REGION_ROOM = "region";

/** Số người tối đa trong một phòng. */
export const MAX_PLAYERS_PER_ROOM = 30;

/** Lưới đất 6x6, mỗi ô rộng 2 đơn vị. Tâm lưới ở gốc tọa độ (0, 0). */
export const GRID_SIZE = 6;
export const CELL_SIZE = 2;
/** Tọa độ x, z hợp lệ nằm trong khoảng [-WORLD_HALF_EXTENT, WORLD_HALF_EXTENT]. */
export const WORLD_HALF_EXTENT = (GRID_SIZE * CELL_SIZE) / 2;

/** Tên các loại tin nhắn. */
export const MessageType = {
  Move: "move",
  Chat: "chat",
} as const;

/** Trình duyệt gửi khi người chơi chạm vào một ô đất. */
export interface MoveMessage {
  x: number;
  z: number;
}

/** Trình duyệt gửi khi người chơi chọn một câu chat có sẵn. */
export interface ChatMessage {
  phraseId: ChatPhraseId;
}

/** Máy chủ phát cho mọi người trong phòng khi có ai đó chat. */
export interface ChatBroadcast {
  playerId: string;
  phraseId: ChatPhraseId;
}

/** Vị trí một người chơi khác mà game cần vẽ. */
export interface RemotePlayer {
  id: string;
  x: number;
  z: number;
}

/** Chỉ cho chat bằng câu có sẵn để tránh nội dung xấu và giúp luyện câu mẫu. */
export const CHAT_PHRASES = [
  { id: "hello", text: "Hello!" },
  { id: "nice-farm", text: "Nice farm!" },
  { id: "thank-you", text: "Thank you!" },
  { id: "good-morning", text: "Good morning!" },
  { id: "see-you", text: "See you later!" },
] as const;

export type ChatPhraseId = (typeof CHAT_PHRASES)[number]["id"];

export function isChatPhraseId(value: unknown): value is ChatPhraseId {
  return CHAT_PHRASES.some((phrase) => phrase.id === value);
}
