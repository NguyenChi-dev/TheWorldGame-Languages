/**
 * Ghép toàn bộ ứng dụng Hono: CORS, giới hạn kích thước, các route và cách trả lỗi.
 * Tách khỏi index.ts để test có thể gọi app.request(...) mà không cần mở cổng mạng.
 */
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { env } from "./env.js";
import { ApiError, errorJson, Messages, messageForStatus } from "./lib/errors.js";
import { adminRoutes } from "./routes/admin.js";
import { catalogRoutes } from "./routes/catalog.js";
import { farmRoutes } from "./routes/farm.js";
import { healthRoutes } from "./routes/health.js";
import { lessonRoutes } from "./routes/lessons.js";
import { meRoutes } from "./routes/me.js";
import { shopRoutes } from "./routes/shop.js";

export function createApp(allowedOrigins: string[] = env.CORS_ORIGINS) {
  const app = new Hono();

  // 1. Chặn trang web lạ: yêu cầu có header Origin (gửi từ trình duyệt) mà không nằm trong CORS_ORIGINS
  //    bị từ chối luôn. Yêu cầu không có Origin (app điện thoại, curl, máy chủ khác) vẫn đi tiếp
  //    và vẫn phải qua bước kiểm tra token như bình thường.
  app.use(async (c, next) => {
    const origin = c.req.header("Origin");
    if (origin && !allowedOrigins.includes(origin)) {
      return errorJson(c, 403, "Trang web này không được phép gọi API");
    }
    await next();
  });

  // 2. CORS: báo cho trình duyệt biết các nguồn trong CORS_ORIGINS được đọc phản hồi.
  app.use(
    cors({
      origin: allowedOrigins,
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowHeaders: ["Authorization", "Content-Type"],
      maxAge: 600,
    }),
  );

  // 3. Không nhận nội dung quá 64 KB (chống gửi dữ liệu khổng lồ làm nghẽn máy chủ).
  app.use(bodyLimit({ maxSize: 64 * 1024, onError: (c) => errorJson(c, 413, Messages.tooLarge) }));

  // 4. Các route.
  app.route("/health", healthRoutes);
  app.route("/catalog", catalogRoutes);
  app.route("/me", meRoutes);
  app.route("/farm", farmRoutes);
  app.route("/shop", shopRoutes);
  app.route("/lessons", lessonRoutes);
  app.route("/admin", adminRoutes);

  // 5. Mọi lỗi đều thành { error: "..." } tiếng Việt, không lộ chi tiết bên trong máy chủ.
  app.notFound((c) => errorJson(c, 404, Messages.notFound));
  app.onError((err, c) => {
    if (err instanceof ApiError) return errorJson(c, err.status, err.message);
    if (err instanceof HTTPException) return errorJson(c, err.status, messageForStatus(err.status));
    console.error("[api] Lỗi không mong đợi:", err); // chi tiết chỉ nằm trong log máy chủ
    return errorJson(c, 500, Messages.internal);
  });

  return app;
}

export const app = createApp();
