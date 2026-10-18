/**
 * Giao kèo giữa máy chủ realtime (apps/realtime) và trình duyệt (apps/web).
 * Máy chủ realtime chỉ đồng bộ vị trí và chat, KHÔNG xử lý vàng hay phần thưởng.
 *
 * Mỗi vùng đất có phòng riêng (lọc theo landId). Tên và trang phục của người chơi do MÁY CHỦ đọc từ
 * hồ sơ (bảng profiles) bằng token đăng nhập, trình duyệt không tự khai được.
 */
import type { CharacterAppearance } from "./characters";

/** Tên phòng Colyseus cho một vùng đất. */
export const REGION_ROOM = "region";

/** Số người tối đa trong một phòng (một vùng đất). Đầy thì người sau vào phòng mới cùng vùng đất. */
export const MAX_PLAYERS_PER_ROOM = 60;

/** Trình duyệt gửi khi vào phòng (kèm token đăng nhập Supabase ở client.auth.token). */
export interface JoinOptions {
  /** Vùng đất đang chọn: phải khớp profiles.land_id của người chơi. */
  landId: string;
  /** Vị trí xuất hiện (điểm xuất phát trên bản đồ). */
  x: number;
  z: number;
}

/** Lưới đất 6x6, mỗi ô rộng 2 đơn vị. Tâm lưới ở gốc tọa độ (0, 0). */
export const GRID_SIZE = 6;
export const CELL_SIZE = 2;
/**
 * Tọa độ x, z hợp lệ nằm trong khoảng [-WORLD_HALF_EXTENT, WORLD_HALF_EXTENT].
 * Đủ cho bản đồ lớn nhất (thị trấn 96 x 96, xem packages/game/src/maps/); lưới 6x6 nằm gọn bên trong.
 */
export const WORLD_HALF_EXTENT = 48;

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

/** Một người chơi khác mà game cần vẽ: vị trí đích, tên nhân vật, trang phục. */
export interface RemotePlayer {
  id: string;
  x: number;
  z: number;
  username: string;
  appearance: CharacterAppearance;
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
