"use client";

import { faCloudArrowUp, faRotate, faTriangleExclamation, faXmark } from "@fortawesome/free-solid-svg-icons";
import { useId, useRef, useState } from "react";
import { useToast } from "@lw/ui";
import { getUploadSignature, registerUpload } from "@/app/(admin)/media/actions";
import { CoverImage } from "@/components/cover-image";
import { FaIcon } from "@/components/fa-icon";
// Chỉ import KIỂU (bị xóa khi biên dịch), nên không kéo code máy chủ của lib/cloudinary xuống trình duyệt.
import type { MediaFolder } from "@/lib/cloudinary";
import { cloudinaryFit, cloudinaryThumb } from "@/lib/media-url";

/** Ảnh đang chọn: id trong bảng media + URL để xem trước. */
export interface PickedImage {
  id: string;
  url: string;
}

const MAX_BYTES = 10 * 1024 * 1024; // Gói Free của Cloudinary: ảnh tối đa 10 MB.
/** Ảnh ngang rộng dưới mức này sẽ bị mờ khi phóng to trên màn hình người chơi. */
const MIN_WIDE_WIDTH = 1600;
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

const overlayButton =
  "inline-flex items-center gap-1.5 rounded-lg bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm " +
  "transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

/**
 * Ô ảnh bìa: cả khung là vùng kéo thả / bấm để chọn ảnh. Có ảnh thì (dạng "wide") khung co theo đúng tỉ lệ ảnh: hiện trọn ảnh, không cắt, không viền trống,
 * rê chuột (hoặc trên điện thoại: luôn hiện) nút Đổi ảnh / Bỏ ảnh. Đang tải thì phủ % tiến trình.
 * Tải xong ảnh được lưu vào bảng media và trả về qua onChange; form cha lưu `id` vào cover_media_id.
 */
export function ImageUploader({
  folder,
  value,
  onChange,
  label = "Ảnh bìa",
  aspect = "wide",
  hint,
}: {
  folder: MediaFolder;
  value: PickedImage | null;
  onChange: (image: PickedImage | null) => void;
  label?: string;
  /** "wide": ô trống 16:9, có ảnh thì khung theo tỉ lệ ảnh (ảnh bìa). "square": 1:1, ảnh cắt vừa ô. */
  aspect?: "wide" | "square";
  /** Dòng gợi ý dưới khung (ví dụ ảnh này hiện ở đâu, nên dùng cỡ nào). */
  hint?: string;
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
      const { width, height } = response as { width?: number; height?: number };
      if (aspect === "wide" && width && height) {
        if (height > width) {
          toast.info(
            `Ảnh đang dọc (${width}×${height}px). Màn hình người chơi là khung ngang nên sẽ trống hai bên; nên dùng ảnh ngang 16:9.`,
          );
        } else if (width < MIN_WIDE_WIDTH) {
          toast.info(
            `Ảnh chỉ ${width}×${height}px, có thể bị mờ trên màn hình người chơi. Nên dùng ảnh rộng từ ${MIN_WIDE_WIDTH}px.`,
          );
        }
      }
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

  const openPicker = () => inputRef.current?.click();

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label htmlFor={inputId} className="text-xs font-semibold text-slate-600">
          {label}
        </label>
        <span className="text-[11px] text-slate-400">Lưu trên Cloudinary</span>
      </div>

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
        className={`group relative overflow-hidden rounded-2xl transition-all ${
          aspect === "square"
            ? "aspect-square w-full max-w-56"
            : value
              ? "w-fit max-w-full"
              : "aspect-video w-full"
        } ${
          dragging
            ? "scale-[1.01] border-2 border-dashed border-accent bg-secondary"
            : value
              ? "bg-slate-100 ring-1 ring-secondary"
              : "border-2 border-dashed border-primary/40 bg-background hover:border-primary hover:bg-secondary/40"
        }`}
      >
        {value ? (
          <>
            {aspect === "wide" ? (
              <CoverImage
                key={value.url}
                src={cloudinaryFit(value.url, 1280, 960)}
                alt={label}
                className="block h-auto max-h-72 w-auto max-w-full"
                fallback={
                  <div className="flex h-44 w-80 max-w-full flex-col items-center justify-center gap-1 bg-red-50 px-4 text-center">
                    <FaIcon icon={faTriangleExclamation} className="text-2xl text-red-300" />
                    <span className="text-sm font-semibold text-red-700">Ảnh không còn trên Cloudinary</span>
                    <span className="text-xs text-red-600">Bấm Đổi ảnh để tải ảnh khác.</span>
                  </div>
                }
              />
            ) : (
              <CoverImage
                key={value.url}
                src={cloudinaryThumb(value.url, 480, 480)}
                alt={label}
                className="absolute inset-0 size-full object-cover"
                fallback={
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-red-50 px-4 text-center">
                    <FaIcon icon={faTriangleExclamation} className="text-2xl text-red-300" />
                    <span className="text-sm font-semibold text-red-700">Ảnh không còn trên Cloudinary</span>
                    <span className="text-xs text-red-600">Bấm Đổi ảnh để tải ảnh khác.</span>
                  </div>
                }
              />
            )}
            <div className="absolute inset-0 flex flex-wrap content-end items-end justify-end gap-2 bg-linear-to-t from-slate-900/55 via-slate-900/0 to-transparent p-3 transition sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
              <button type="button" onClick={openPicker} disabled={uploading} className={overlayButton}>
                <FaIcon icon={faRotate} />
                Đổi ảnh
              </button>
              <button
                type="button"
                onClick={() => onChange(null)}
                disabled={uploading}
                className={`${overlayButton} text-red-600`}
              >
                <FaIcon icon={faXmark} />
                Bỏ ảnh
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={openPicker}
            disabled={uploading}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
          >
            <span className="flex size-12 items-center justify-center rounded-full bg-white text-accent shadow-sm ring-1 ring-secondary transition group-hover:scale-110">
              <FaIcon icon={faCloudArrowUp} className="text-lg" />
            </span>
            <span className="text-sm font-semibold text-slate-700">
              Kéo thả ảnh vào đây hoặc{" "}
              <span className="text-accent underline underline-offset-2">chọn từ máy</span>
            </span>
            <span className="text-xs text-slate-400">PNG, JPG, WEBP, GIF, AVIF · tối đa 10 MB</span>
          </button>
        )}

        {uploading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/85 backdrop-blur-sm">
            <span className="font-game text-2xl font-extrabold text-accent">{progress}%</span>
            <div
              className="h-1.5 w-2/3 overflow-hidden rounded-full bg-secondary"
              role="progressbar"
              aria-valuenow={progress ?? 0}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Tiến trình tải ảnh lên"
            >
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-slate-500">Đang tải lên Cloudinary...</span>
          </div>
        ) : null}

        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={ACCEPT.join(",")}
          className="sr-only"
          onChange={(event) => void handleFile(event.target.files?.[0])}
        />
      </div>
      {error ? (
        <p className="mt-1.5 text-xs text-red-700">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-[11px] text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}
