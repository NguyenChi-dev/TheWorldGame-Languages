import { Hono } from "hono";
import { LessonParams, LessonSubmitRequest } from "@lw/shared/api";
import { notImplemented } from "../lib/errors.js";
import { validate } from "../lib/validate.js";
import { auth, type AuthEnv } from "../middleware/auth.js";

/** Các route bài học. Mọi route đều cần đăng nhập. */
export const lessonRoutes = new Hono<AuthEnv>()
  .use(auth)

  .post("/:id/submit", validate("param", LessonParams), validate("json", LessonSubmitRequest), (c) => {
    c.req.valid("param"); // { id } của bài học trên đường dẫn
    c.req.valid("json"); // { answers: [{ wordId, answer }] }
    // TODO: nộp bài
    //   1. Đọc đáp án đúng từ bảng words trong database (trình duyệt không được biết trước đáp án).
    //   2. Chấm từng câu; cập nhật word_progress (correct_count / wrong_count, last_seen_at = giờ máy chủ).
    //   3. Cộng vàng = số câu đúng * CORRECT_ANSWER_GOLD trong @lw/shared.
    //   4. Chống nộp lặp để cày vàng (ví dụ mỗi bài chỉ nhận thưởng 1 lần mỗi giờ).
    //   5. Trả về { correct, total, goldEarned, gold }.
    return notImplemented(c);
  });
