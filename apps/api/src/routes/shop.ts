import { Hono } from "hono";
import { BuyRequest, SellRequest } from "@lw/shared/api";
import { notImplemented } from "../lib/errors.js";
import { validate } from "../lib/validate.js";
import { auth, type AuthEnv } from "../middleware/auth.js";

/** Các route cửa hàng. Mọi route đều cần đăng nhập. */
export const shopRoutes = new Hono<AuthEnv>()
  .use(auth)

  .post("/buy", validate("json", BuyRequest), (c) => {
    c.req.valid("json"); // { itemId, quantity }
    // TODO: mua vật phẩm
    //   1. Đọc giá từ bảng items trong database (KHÔNG nhận giá từ trình duyệt).
    //   2. Tổng tiền = buy_price * quantity; người chơi phải đủ vàng trong profiles.gold.
    //   3. Trừ vàng và cộng vật phẩm vào inventory trong cùng 1 giao dịch.
    //   4. Trả về { gold, inventory }.
    return notImplemented(c);
  })

  .post("/sell", validate("json", SellRequest), (c) => {
    c.req.valid("json"); // { itemId, quantity }
    // TODO: bán vật phẩm
    //   1. Người chơi phải có đủ số lượng itemId trong inventory.
    //   2. Tiền nhận = sell_price (đọc từ database) * quantity.
    //   3. Trừ vật phẩm và cộng vàng trong cùng 1 giao dịch.
    //   4. Trả về { gold, inventory }.
    return notImplemented(c);
  });
