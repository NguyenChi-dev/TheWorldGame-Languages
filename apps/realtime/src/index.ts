/**
 * Máy chủ realtime của Language World (Colyseus).
 * listen() tự đọc file .env và cổng từ biến PORT (mặc định 2567).
 */
import { listen } from "@colyseus/tools";
import app from "./app.config.js";

void listen(app);
