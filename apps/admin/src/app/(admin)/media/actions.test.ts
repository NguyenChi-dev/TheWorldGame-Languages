import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { logAction } from "@/lib/audit";
import { AuthError, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { checkCloudinary, getUploadSignature, registerUpload } from "./actions";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/audit", () => ({ logAction: vi.fn() }));
vi.mock("@/lib/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth")>()),
  requireRole: vi.fn(),
}));

// CLOUDINARY_URL giả đặt trong vitest.config.mts: cloudinary://123456789:test-secret-khong-that@test-cloud
const SECRET = "test-secret-khong-that";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireRole).mockResolvedValue({} as never);
});

describe("Media / Cloudinary", () => {
  it("moderator, player không lấy được chữ ký tải lên", async () => {
    vi.mocked(requireRole).mockRejectedValue(new AuthError("forbidden"));
    expect(await getUploadSignature("lands")).toEqual({
      ok: false,
      error: "Bạn không có quyền làm việc này",
    });
    expect(await checkCloudinary()).toEqual({ ok: false, error: "Bạn không có quyền làm việc này" });
    expect(requireRole).toHaveBeenCalledWith(["admin", "editor"]);
  });

  it("thư mục ngoài danh sách bị từ chối", async () => {
    expect(await getUploadSignature("../khac")).toEqual({ ok: false, error: "Thư mục tải lên không hợp lệ" });
  });

  it("chữ ký đúng thuật toán của Cloudinary và KHÔNG chứa API Secret", async () => {
    const result = await getUploadSignature("lands");
    if (!result.ok || !result.data) throw new Error("phải thành công");
    const { cloudName, apiKey, folder, timestamp, signature, uploadUrl } = result.data;
    expect({ cloudName, apiKey, folder, uploadUrl }).toEqual({
      cloudName: "test-cloud",
      apiKey: "123456789",
      folder: "language-world/lands",
      uploadUrl: "https://api.cloudinary.com/v1_1/test-cloud/auto/upload",
    });
    const expected = createHash("sha1")
      .update(`folder=${folder}&timestamp=${timestamp}${SECRET}`)
      .digest("hex");
    expect(signature).toBe(expected);
    expect(JSON.stringify(result)).not.toContain(SECRET);
  });
});

describe("registerUpload: chỉ nhận ảnh thật do Cloudinary trả về", () => {
  const PUBLIC_ID = "language-world/lands/abc123";
  const VERSION = 1791916969;
  const sign = (publicId: string, version: number) =>
    createHash("sha1").update(`public_id=${publicId}&version=${version}${SECRET}`).digest("hex");
  const response = (overrides: Record<string, unknown> = {}) => ({
    public_id: PUBLIC_ID,
    version: VERSION,
    signature: sign(PUBLIC_ID, VERSION),
    resource_type: "image",
    format: "png",
    width: 1200,
    height: 600,
    bytes: 2048,
    original_filename: "bia",
    // Trình duyệt có thể gửi kèm URL giả: máy chủ phải bỏ qua và tự dựng URL.
    secure_url: "https://trang-la.example/gia.png",
    ...overrides,
  });

  function fakeInsert(result: { data?: unknown; error?: unknown }) {
    const insert = vi.fn(() => ({ select: () => ({ single: async () => result }) }));
    vi.mocked(createClient).mockResolvedValue({ from: vi.fn(() => ({ insert })) } as never);
    return insert;
  }

  it("chữ ký đúng: lưu media với URL do máy chủ dựng, ghi 1 dòng nhật ký", async () => {
    const insert = fakeInsert({
      data: { id: "m1", secure_url: "https://res.cloudinary.com/test-cloud/x.png" },
    });
    expect(await registerUpload(response())).toEqual({
      ok: true,
      message: "Đã tải ảnh lên",
      data: { id: "m1", secureUrl: "https://res.cloudinary.com/test-cloud/x.png" },
    });
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        public_id: PUBLIC_ID,
        secure_url: `https://res.cloudinary.com/test-cloud/image/upload/v${VERSION}/${PUBLIC_ID}.png`,
        width: 1200,
        height: 600,
      }),
    );
    expect(logAction).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["chữ ký sai", { signature: "0".repeat(40) }, "Chữ ký tải lên không hợp lệ"],
    [
      "đổi public_id mà giữ chữ ký cũ",
      { public_id: "language-world/lands/khac" },
      "Chữ ký tải lên không hợp lệ",
    ],
    [
      "ngoài thư mục dự án",
      { public_id: "khac/abc", signature: sign("khac/abc", VERSION) },
      "Ảnh không nằm trong thư mục của dự án",
    ],
    ["không phải ảnh", { resource_type: "video" }, "Chỉ nhận file ảnh"],
  ])("%s thì từ chối, không lưu", async (_name, overrides, message) => {
    const insert = fakeInsert({ data: null });
    expect(await registerUpload(response(overrides))).toEqual({ ok: false, error: message });
    expect(insert).not.toHaveBeenCalled();
    expect(logAction).not.toHaveBeenCalled();
  });
});
