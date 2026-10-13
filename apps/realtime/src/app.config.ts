import { defineRoom, defineServer } from "colyseus";
import { REGION_ROOM } from "@lw/shared";
import { RegionRoom } from "./rooms/region-room.js";

const server = defineServer({
  rooms: {
    // Tên phòng lấy từ @lw/shared để web và máy chủ luôn khớp nhau.
    [REGION_ROOM]: defineRoom(RegionRoom),
  },
});

export default server;
