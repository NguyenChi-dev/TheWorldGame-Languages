import { defineRoom, defineServer } from "colyseus";
import { REGION_ROOM } from "@lw/shared";
import { RegionRoom } from "./rooms/region-room.js";

const server = defineServer({
  rooms: {
    // Tên phòng lấy từ @lw/shared để web và máy chủ luôn khớp nhau.
    // Mỗi vùng đất một phòng riêng: người chơi chỉ gặp người cùng vùng đất (lọc theo landId).
    [REGION_ROOM]: defineRoom(RegionRoom).filterBy(["landId"]),
  },
});

export default server;
