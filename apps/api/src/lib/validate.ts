/**
 * Kiểm tra dữ liệu gửi lên bằng schema Zod (lấy từ @lw/shared/api).
 * Dữ liệu sai: trả 400 với thông báo tiếng Việt, nêu tên trường bị sai.
 *
 * Cách dùng trong route:
 *   routes.post("/vi-du", validate("json", ViDuRequest), (c) => {
 *     const data = c.req.valid("json"); // đã đúng kiểu, đã kiểm tra
 *   })
 */
import { zValidator } from "@hono/zod-validator";
import type { ValidationTargets } from "hono";
import type { z } from "zod";
import { ApiError, Messages } from "./errors.js";

export const validate = <T extends z.ZodType, Target extends keyof ValidationTargets>(
  target: Target,
  schema: T,
) =>
  zValidator(target, schema, (result) => {
    if (result.success) return;
    const fields = [...new Set(result.error.issues.map((issue) => issue.path.join(".") || target))];
    throw new ApiError(400, `${Messages.invalidInput}: ${fields.join(", ")}`);
  });
