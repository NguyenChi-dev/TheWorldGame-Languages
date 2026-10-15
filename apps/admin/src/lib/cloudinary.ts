/**
 * Kết nối Cloudinary (lưu ảnh / âm thanh cho trang Media), CHỈ chạy ở máy chủ.
 *
 * Cấu hình bằng biến môi trường CLOUDINARY_URL = cloudinary://<api_key>:<api_secret>@<cloud_name>
 * (apps/admin/.env.local). API Secret không bao giờ được gửi xuống trình duyệt:
 * trình duyệt chỉ nhận CHỮ KÝ cho từng lần tải lên (signUpload), rồi tự gửi file thẳng tới Cloudinary.
 */
import "server-only";
import { timingSafeEqual } from "node:crypto";
import { v2 as cloudinary } from "cloudinary";

/** Thư mục con được phép tải lên, theo loại nội dung. */
export const MEDIA_FOLDERS = ["lands", "areas"] as const;
export type MediaFolder = (typeof MEDIA_FOLDERS)[number];

let configured: boolean | undefined;

/** true khi đã có CLOUDINARY_URL hợp lệ. SDK tự đọc biến này; ở đây chỉ bật https. */
export function isCloudinaryConfigured(): boolean {
  if (configured === undefined) {
    const url = process.env.CLOUDINARY_URL;
    configured = Boolean(url && /^cloudinary:\/\/[^:]+:[^@]+@.+/.test(url));
    if (configured) cloudinary.config({ secure: true });
  }
  return configured;
}

function requireConfig() {
  if (!isCloudinaryConfigured())
    throw new Error("Chưa cấu hình Cloudinary (thiếu CLOUDINARY_URL trong apps/admin/.env.local)");
  const { cloud_name, api_key, api_secret } = cloudinary.config();
  if (!cloud_name || !api_key || !api_secret)
    throw new Error("CLOUDINARY_URL thiếu cloud name, API key hoặc API secret");
  return { cloudName: cloud_name, apiKey: api_key, apiSecret: api_secret };
}

/** Tên cloud (công khai, dùng để dựng URL ảnh). */
export function cloudinaryCloudName(): string | null {
  return isCloudinaryConfigured() ? (cloudinary.config().cloud_name ?? null) : null;
}

/** Thư mục gốc trên Cloudinary, ví dụ "language-world". */
export function rootFolder(): string {
  return (process.env.CLOUDINARY_FOLDER || "language-world").replace(/^\/+|\/+$/g, "");
}

/**
 * Kiểm tra phản hồi tải lên mà trình duyệt gửi về có đúng do Cloudinary tạo không.
 * Cloudinary ký phản hồi bằng SHA1("public_id=...&version=..." + API Secret), nên trình duyệt
 * không tự bịa được public_id / version để gắn file của người khác hay file không tồn tại.
 */
export function verifyUploadResponse(publicId: string, version: number, signature: string): boolean {
  const { apiSecret } = requireConfig();
  // Cùng thuật toán với utils.verify_api_response_signature của SDK (hàm đó thiếu trong bộ kiểu TypeScript).
  const expected = Buffer.from(
    cloudinary.utils.api_sign_request({ public_id: publicId, version }, apiSecret),
  );
  const received = Buffer.from(signature);
  // So sánh thời gian không đổi: không lộ chữ ký đúng qua thời gian phản hồi.
  return expected.length === received.length && timingSafeEqual(expected, received);
}

/** URL https của file đã tải lên, dựng ở máy chủ (không tin URL do trình duyệt gửi). */
export function deliveryUrl(
  publicId: string,
  version: number,
  format: string | null,
  resourceType = "image",
): string {
  requireConfig();
  return cloudinary.url(publicId, {
    secure: true,
    version,
    resource_type: resourceType,
    // Không gắn tham số thống kê "?_a=..." của SDK: URL lưu trong database cần gọn và cố định.
    urlAnalytics: false,
    ...(format ? { format } : {}),
  });
}

export interface UploadSignature {
  cloudName: string;
  /** API key là công khai (không phải secret), Cloudinary yêu cầu gửi kèm chữ ký. */
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
  /** Địa chỉ trình duyệt gửi file tới (resource_type "auto": ảnh, âm thanh, video). */
  uploadUrl: string;
}

/**
 * Chữ ký cho MỘT lần tải lên trực tiếp từ trình duyệt (signed upload).
 * Trình duyệt phải gửi đúng các tham số đã ký (folder, timestamp) cùng api_key và signature.
 * Chữ ký hết hạn sau 1 giờ (quy định của Cloudinary).
 */
export function signUpload(folder: MediaFolder, now: Date = new Date()): UploadSignature {
  const { cloudName, apiKey, apiSecret } = requireConfig();
  const timestamp = Math.floor(now.getTime() / 1000);
  const fullFolder = `${rootFolder()}/${folder}`;
  const signature = cloudinary.utils.api_sign_request({ folder: fullFolder, timestamp }, apiSecret);
  return {
    cloudName,
    apiKey,
    timestamp,
    folder: fullFolder,
    signature,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
  };
}

/** Gọi thử Cloudinary (Admin API ping, chỉ đọc). Giới hạn 500 lần/giờ nên chỉ gọi khi người dùng bấm. */
export async function pingCloudinary(): Promise<{ ok: boolean; message: string }> {
  try {
    const { cloudName } = requireConfig();
    const result = await cloudinary.api.ping();
    return result.status === "ok"
      ? { ok: true, message: `Đã kết nối Cloudinary (cloud ${cloudName})` }
      : { ok: false, message: "Cloudinary trả lời bất thường" };
  } catch (error) {
    const detail = (error as { error?: { message?: string } }).error?.message ?? (error as Error).message;
    console.error("[cloudinary] ping lỗi:", detail);
    return { ok: false, message: `Không kết nối được Cloudinary: ${detail}` };
  }
}
