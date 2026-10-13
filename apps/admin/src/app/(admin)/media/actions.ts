"use server";

/**
 * Server action cho Media (Cloudinary). Chỉ admin, editor (cùng quyền với mục Media).
 * Không bao giờ trả API Secret: trình duyệt chỉ nhận chữ ký cho từng lần tải lên.
 *
 * Luồng tải ảnh: getUploadSignature → trình duyệt gửi file thẳng tới Cloudinary → registerUpload
 * (xác minh chữ ký phản hồi của Cloudinary rồi lưu vào bảng media).
 */
import { z } from "zod";
import type { ActionResult } from "@/lib/action-state";
import { logAction } from "@/lib/audit";
import { AuthError, requireRole } from "@/lib/auth";
import {
  deliveryUrl,
  MEDIA_FOLDERS,
  pingCloudinary,
  rootFolder,
  signUpload,
  verifyUploadResponse,
  type MediaFolder,
  type UploadSignature,
} from "@/lib/cloudinary";
import { createClient } from "@/lib/supabase/server";

const MEDIA_EDITORS = ["admin", "editor"] as const;

async function guard(): Promise<string | null> {
  try {
    await requireRole(MEDIA_EDITORS);
    return null;
  } catch (error) {
    if (error instanceof AuthError) return error.message;
    throw error;
  }
}

/** Kiểm tra kết nối Cloudinary (nút "Kiểm tra kết nối" ở trang Media). */
export async function checkCloudinary(): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return { ok: false, error: denied };
  const result = await pingCloudinary();
  return result.ok ? { ok: true, message: result.message } : { ok: false, error: result.message };
}

/** Chữ ký để trình duyệt tải file thẳng lên Cloudinary vào thư mục `folder`. */
export async function getUploadSignature(folder: unknown): Promise<ActionResult<UploadSignature>> {
  const denied = await guard();
  if (denied) return { ok: false, error: denied };
  if (!(MEDIA_FOLDERS as readonly unknown[]).includes(folder)) {
    return { ok: false, error: "Thư mục tải lên không hợp lệ" };
  }
  try {
    return { ok: true, message: "Đã tạo chữ ký tải lên", data: signUpload(folder as MediaFolder) };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

/** Phản hồi Cloudinary trả về trình duyệt sau khi tải lên (chỉ lấy các trường cần). */
const UploadResponse = z.object({
  public_id: z.string().min(1).max(300),
  version: z.number().int().positive(),
  signature: z.string().regex(/^[0-9a-f]{40}$/, "Chữ ký tải lên không hợp lệ"),
  resource_type: z.literal("image", { error: "Chỉ nhận file ảnh" }),
  format: z.string().max(10).nullish(),
  width: z.number().int().positive().nullish(),
  height: z.number().int().positive().nullish(),
  bytes: z.number().int().nonnegative().nullish(),
  original_filename: z.string().max(200).nullish(),
});

export interface RegisteredMedia {
  id: string;
  secureUrl: string;
}

/**
 * Lưu ảnh vừa tải lên Cloudinary vào bảng media (để gắn làm ảnh bìa...).
 * Chỉ nhận phản hồi có chữ ký hợp lệ của Cloudinary và nằm trong thư mục của dự án.
 * URL ảnh được dựng lại ở máy chủ, không dùng URL trình duyệt gửi lên.
 */
export async function registerUpload(response: unknown): Promise<ActionResult<RegisteredMedia>> {
  const denied = await guard();
  if (denied) return { ok: false, error: denied };
  const parsed = UploadResponse.safeParse(response);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Phản hồi tải lên không hợp lệ" };
  }
  const upload = parsed.data;

  try {
    if (!upload.public_id.startsWith(`${rootFolder()}/`)) {
      return { ok: false, error: "Ảnh không nằm trong thư mục của dự án" };
    }
    if (!verifyUploadResponse(upload.public_id, upload.version, upload.signature)) {
      return { ok: false, error: "Chữ ký tải lên không hợp lệ" };
    }
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("media")
    .insert({
      public_id: upload.public_id,
      resource_type: upload.resource_type,
      format: upload.format ?? null,
      secure_url: deliveryUrl(upload.public_id, upload.version, upload.format ?? null),
      width: upload.width ?? null,
      height: upload.height ?? null,
      bytes: upload.bytes ?? null,
      original_filename: upload.original_filename ?? null,
    })
    .select("*")
    .single();
  if (error || !data) {
    if (error?.code === "23505") return { ok: false, error: "Ảnh này đã được lưu trước đó" };
    if (error?.code === "42501") return { ok: false, error: "Bạn không có quyền làm việc này" };
    console.error("[media/actions] Không lưu được media:", error);
    return { ok: false, error: "Không lưu được thông tin ảnh" };
  }

  try {
    await logAction({ action: "media.create", targetTable: "media", targetId: data.id, after: data });
  } catch (auditError) {
    console.error("[media/actions] Không ghi được admin_logs:", auditError);
    return { ok: false, error: "Đã lưu ảnh nhưng KHÔNG ghi được nhật ký quản trị. Hãy báo admin kiểm tra." };
  }
  return { ok: true, message: "Đã tải ảnh lên", data: { id: data.id, secureUrl: data.secure_url } };
}
