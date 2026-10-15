// Test các route bằng app.request(): gọi thẳng vào app, không cần mở cổng 4000.
// Supabase được cố ý để trống (xem vitest.config.ts).
import { describe, expect, it } from "vitest";
import type { HealthResponse } from "@lw/shared/api";
import { app } from "./app";

const WEB = "http://localhost:3000";

describe("GET /health", () => {
  it("trả về ok, tên dịch vụ và giờ máy chủ", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    const body = (await res.json()) as HealthResponse;
    expect(body).toMatchObject({ ok: true, service: "api" });
    expect(new Date(body.time).toISOString()).toBe(body.time);
  });
});

describe("Đăng nhập", () => {
  it("GET /me không có token trả 401", async () => {
    const res = await app.request("/me");
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Chưa đăng nhập" });
  });

  it("route quản trị cũng đòi đăng nhập", async () => {
    const res = await app.request("/admin/me");
    expect(res.status).toBe(401);
  });

  it("có token nhưng chưa cấu hình Supabase thì trả 503, máy chủ không sập", async () => {
    const res = await app.request("/me", { headers: { Authorization: "Bearer abc.def.ghi" } });
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "Chưa cấu hình Supabase" });
  });
});

describe("CORS", () => {
  it("cho phép nguồn nằm trong CORS_ORIGINS", async () => {
    const res = await app.request("/health", { headers: { Origin: WEB } });
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(WEB);
  });

  it("vẫn gắn header CORS cho phản hồi lỗi, để web đọc được thông báo", async () => {
    const res = await app.request("/me", { headers: { Origin: WEB } });
    expect(res.status).toBe(401);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(WEB);
  });

  it("chặn nguồn lạ", async () => {
    const res = await app.request("/health", { headers: { Origin: "https://trang-la.example" } });
    expect(res.status).toBe(403);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });
});

describe("Lỗi chung", () => {
  it("đường dẫn không tồn tại trả 404 dạng { error }", async () => {
    const res = await app.request("/khong-co");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Không tìm thấy đường dẫn này" });
  });
});
