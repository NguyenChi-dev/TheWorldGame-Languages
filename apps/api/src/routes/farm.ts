import { Hono } from "hono";
import { HarvestRequest, PlantRequest, WaterRequest } from "@lw/shared/api";
import { notImplemented } from "../lib/errors.js";
import { validate } from "../lib/validate.js";
import { auth, type AuthEnv } from "../middleware/auth.js";

/** Các route nông trại. Mọi route đều cần đăng nhập. */
export const farmRoutes = new Hono<AuthEnv>()
  .use(auth)

  .post("/plant", validate("json", PlantRequest), (c) => {
    c.req.valid("json"); // { plotId, seedId } đã được kiểm tra
    // TODO: gieo hạt
    //   1. Đọc ô đất theo plotId VÀ user_id = c.get("user").id (ô phải thuộc người chơi).
    //   2. Ô phải đang trống (item_id = null).
    //   3. Túi đồ phải có ít nhất 1 hạt seedId; trừ đi 1.
    //   4. Ghi item_id = seedId, planted_at = now() theo giờ máy chủ (không nhận giờ từ trình duyệt).
    //   5. Trả về { plot, inventory }. Bước 3-4 nên làm trong 1 hàm SQL để không bị trừ hạt mà không trồng.
    return notImplemented(c);
  })

  .post("/water", validate("json", WaterRequest), (c) => {
    c.req.valid("json"); // { plotId }
    // TODO: tưới cây
    //   1. Kiểm tra ô đất thuộc người chơi và đang có cây chưa chín.
    //   2. Giới hạn số lần tưới (ví dụ 1 lần / 10 phút) bằng giờ máy chủ.
    //   3. Có thể rút ngắn thời gian lớn; tính lại readyAt bằng services/farm.service.ts.
    //   4. Trả về { plot }.
    return notImplemented(c);
  })

  .post("/harvest", validate("json", HarvestRequest), (c) => {
    c.req.valid("json"); // { plotId }
    // TODO: thu hoạch
    //   1. Kiểm tra ô đất thuộc người chơi (user_id = c.get("user").id) và đang có cây.
    //   2. Kiểm tra cây đã chín theo GIỜ MÁY CHỦ: isSeedReady(seedId, planted_at) trong farm.service.ts.
    //   3. Cộng 1 nông sản vào inventory, cộng vàng theo harvestGold(seedId) trong @lw/shared.
    //   4. Xóa cây khỏi ô (item_id = null, planted_at = null).
    //   5. Trả về { gold, inventory }. Bước 3-4 làm trong 1 giao dịch để không thu hoạch 2 lần.
    return notImplemented(c);
  });
