import { schema, t, type SchemaType } from "@colyseus/schema";

/** Một người chơi trong phòng. Chỉ có vị trí, không có vàng hay vật phẩm. */
export const PlayerState = schema({
  id: t.string(),
  x: t.number(),
  z: t.number(),
});
export type PlayerState = SchemaType<typeof PlayerState>;

/** State của phòng "region", tự động đồng bộ xuống mọi trình duyệt trong phòng. */
export const RegionState = schema({
  /** Khóa là sessionId của người chơi. */
  players: t.map(PlayerState),
});
export type RegionState = SchemaType<typeof RegionState>;
