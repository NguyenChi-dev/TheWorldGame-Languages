"use client";

import { useId, useRef, useState } from "react";
import { Button, useToast } from "@lw/ui";
import { getUploadSignature, registerUpload } from "@/app/(admin)/media/actions";
import { ImageIcon, UploadIcon } from "@/components/icons";
// Chỉ import KIỂU (bị xóa khi biên dịch), nên không kéo code máy chủ của lib/cloudinary xuống trình duyệt.
import type { MediaFolder } from "@/lib/cloudinary";
import { cloudinaryThumb } from "@/lib/media-url";

/** Ảnh đang chọn: id trong bảng media + URL để xem trước. */
export interface PickedImage {
  id: string;
  url: string;
}

const MAX_BYTES = 10 * 1024 * 1024; // Gói Free của Cloudinary: ảnh tối đa 10 MB.
const ACCEPT = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif"];

/** Gửi file thẳng tới Cloudinary bằng chữ ký từ máy chủ, báo tiến trình theo %. */
function uploadToCloudinary(
  file: File,
  signature: { uploadUrl: string; apiKey: string; timestamp: number; folder: string; signature: string },
  onProgress: (percent: number) => void,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);
    form.append("api_key", signature.apiKey);
    form.append("timestamp", String(signature.timestamp));
    form.append("folder", signature.folder);
    form.append("signature", signature.signature);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", signature.uploadUrl);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      let body: { error?: { message?: string } } = {};
      try {
        body = JSON.parse(xhr.responseText || "{}");
      } catch {
        // giữ body rỗng
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(body);
      else reject(new Error(body.error?.message ?? `Cloudinary từ chối (mã ${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Mất kết nối khi tải ảnh lên"));
    xhr.send(form);
  });
}

/**
 * Ô chọn ảnh: kéo thả hoặc bấm để chọn, xem trước, thanh tiến trình, đổi / bỏ ảnh.
 * Tải xong thì ảnh được lưu vào bảng media và trả về qua onChange; form cha lưu `id` vào cover_media_id.
 */
export function ImageUploader({
  folder,
  value,
  onChange,
  label = "Ảnh bìa",
}: {
  folder: MediaFolder;
  value: PickedImage | null;
  onChange: (image: PickedImage | null) => void;
  label?: string;
}) {
  const toast = useToast();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const uploading = progress !== null;

  async function handleFile(file: File | undefined) {
    if (!file || uploading) return;
    setError(null);
    if (!ACCEPT.includes(file.type)) return fail("Chỉ nhận ảnh PNG, JPG, WEBP, GIF hoặc AVIF");
    if (file.size > MAX_BYTES) return fail("Ảnh tối đa 10 MB");

    setProgress(0);
    try {
      const signed = await getUploadSignature(folder);
      if (!signed.ok || !signed.data) return fail(signed.ok ? "Không tạo được chữ ký" : signed.error);
      const response = await uploadToCloudinary(file, signed.data, setProgress);
      const saved = await registerUpload(response);
      if (!saved.ok || !saved.data) return fail(saved.ok ? "Không lưu được ảnh" : saved.error);
      onChange({ id: saved.data.id, url: saved.data.secureUrl });
      toast.success("Đã tải ảnh lên. Nhớ bấm Lưu để gắn ảnh.");
    } catch (uploadError) {
      fail((uploadError as Error).message);
    } finally {
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function fail(message: string) {
    setError(message);
    toast.error(message);
  }

  return (
    <div>
      <label htmlFor={inputId} className="mb-1 block text-xs font-semibold text-slate-600">
        {label}
      </label>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void handleFile(event.dataTransfer.files[0]);
        }}
        className={`flex items-center gap-3 rounded-xl border-2 border-dashed p-3 transition-colors ${
          dragging ? "border-primary bg-secondary/60" : "border-secondary bg-background/60"
        }`}
      >
        <div className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-secondary">
          {value ? (
            // Ảnh đã được Cloudinary cắt / nén theo kích thước (cloudinaryThumb), không cần next/image tối ưu lại.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cloudinaryThumb(value.url, 160)} alt={label} className="size-full object-cover" />
          ) : (
            <ImageIcon className="size-7 text-slate-300" />
          )}
          {uploading ? (
            <span className="absolute inset-0 flex items-center justify-center bg-white/80 text-xs font-bold text-accent">
              {progress}%
            </span>
          ) : null}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          {uploading ? (
            <div className="h-1.5 overflow-hidden rounded-full bg-secondary" aria-label="Tiến trình tải lên">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              Kéo ảnh vào đây hoặc bấm chọn. PNG, JPG, WEBP, GIF, AVIF · tối đa 10 MB.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              <UploadIcon className="size-4" />
              {uploading ? "Đang tải..." : value ? "Đổi ảnh" : "Chọn ảnh"}
            </Button>
            {value && !uploading ? (
              <Button variant="ghost" size="sm" onClick={() => onChange(null)}>
                Bỏ ảnh
              </Button>
            ) : null}
          </div>
          {error ? <p className="text-xs text-red-700">{error}</p> : null}
        </div>

        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={ACCEPT.join(",")}
          className="sr-only"
          onChange={(event) => void handleFile(event.target.files?.[0])}
        />
      </div>
    </div>
  );
}
