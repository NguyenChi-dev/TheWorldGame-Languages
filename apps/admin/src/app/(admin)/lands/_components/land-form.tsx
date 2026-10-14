"use client";

import { useState, useTransition } from "react";
import { slugify, type Land } from "@lw/shared";
import { Button, useToast } from "@lw/ui";
import { Field, fieldClass } from "@/components/fields";
import { ImageUploader, type PickedImage } from "@/components/image-uploader";
import { createLand, updateLand } from "../actions";

/** Ngôn ngữ hay dùng (mã ISO 639-1) để chọn nhanh. */
const COMMON_LANGUAGES: [code: string, name: string][] = [
  ["en", "Tiếng Anh"],
  ["ja", "Tiếng Nhật"],
  ["ko", "Tiếng Hàn"],
  ["zh", "Tiếng Trung"],
  ["fr", "Tiếng Pháp"],
  ["de", "Tiếng Đức"],
  ["es", "Tiếng Tây Ban Nha"],
  ["vi", "Tiếng Việt"],
];

/** Mã hay nhập nhầm (mã quốc gia thay vì mã ngôn ngữ) → gợi ý mã đúng. */
const COMMON_MISTAKES: Record<string, string> = {
  vn: "vi",
  jp: "ja",
  kr: "ko",
  cn: "zh",
  uk: "en",
  gb: "en",
};

const MAX_DESCRIPTION = 500;

/**
 * Form thêm / sửa vùng đất (dùng trong hộp thoại cỡ lg).
 * Cột trái: ảnh bìa + mô tả. Cột phải: tên, slug (tự sinh từ tên), mã ngôn ngữ (chọn nhanh).
 */
export function LandForm({
  land,
  coverUrl,
  onDone,
}: {
  land?: Land;
  coverUrl?: string | null;
  onDone: () => void;
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(land?.name ?? "");
  const [slug, setSlug] = useState(land?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(land));
  const [languageCode, setLanguageCode] = useState(land?.languageCode ?? "");
  const [description, setDescription] = useState(land?.description ?? "");
  const [cover, setCover] = useState<PickedImage | null>(
    land?.coverMediaId && coverUrl ? { id: land.coverMediaId, url: coverUrl } : null,
  );
  const [error, setError] = useState<string | null>(null);
  const suggestion = COMMON_MISTAKES[languageCode];

  function changeName(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  function pickLanguage(code: string, languageName: string) {
    setLanguageCode(code);
    if (!name.trim()) changeName(languageName);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const input = { name, slug, languageCode, description, coverMediaId: cover?.id ?? null };
    startTransition(async () => {
      const result = land ? await updateLand(land.id, input) : await createLand(input);
      if (result.ok) {
        toast.success(result.message);
        onDone();
      } else {
        setError(result.error);
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={submit}>
      <div className="grid gap-5 md:grid-cols-2">
        {/* Cột trái: hình ảnh và mô tả */}
        <div className="space-y-4">
          <ImageUploader
            folder="lands"
            value={cover}
            onChange={setCover}
            label="Ảnh bìa"
            hint="Ảnh này cũng hiện trên màn hình người chơi. Nên dùng ảnh ngang 16:9, rộng từ 1600px."
          />
          <Field
            label="Mô tả"
            hint={
              <span className="flex justify-between">
                <span>Hiện cho người chơi khi chọn vùng đất.</span>
                <span className={description.length > MAX_DESCRIPTION - 50 ? "text-amber-600" : ""}>
                  {description.length}/{MAX_DESCRIPTION}
                </span>
              </span>
            }
          >
            {(id) => (
              <textarea
                id={id}
                rows={4}
                maxLength={MAX_DESCRIPTION}
                value={description}
                placeholder="Ví dụ: Thế giới tiếng Anh với nông trại, rạp chiếu phim và công viên."
                onChange={(event) => setDescription(event.target.value)}
                className={`${fieldClass} resize-none`}
              />
            )}
          </Field>
        </div>

        {/* Cột phải: định danh */}
        <div className="space-y-4">
          <Field label="Tên vùng đất">
            {(id) => (
              <input
                id={id}
                required
                maxLength={80}
                value={name}
                placeholder="Ví dụ: Tiếng Anh"
                onChange={(event) => changeName(event.target.value)}
                className={`${fieldClass} text-base font-semibold`}
              />
            )}
          </Field>

          <Field label="Slug" hint="Tự sinh từ tên. Chỉ a-z, 0-9 và dấu gạch ngang.">
            {(id) => (
              <div className="flex items-stretch overflow-hidden rounded-lg border border-secondary focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30">
                <span className="flex items-center bg-background px-2.5 font-mono text-xs text-slate-400">
                  /lands/
                </span>
                <input
                  id={id}
                  required
                  maxLength={60}
                  value={slug}
                  placeholder="tieng-anh"
                  onChange={(event) => {
                    setSlugTouched(true);
                    setSlug(event.target.value);
                  }}
                  className="min-w-0 flex-1 bg-white px-2.5 py-2 font-mono text-sm text-slate-900 outline-none"
                />
              </div>
            )}
          </Field>

          <Field
            label="Mã ngôn ngữ"
            hint={
              suggestion ? (
                <span className="text-amber-700">
                  &quot;{languageCode}&quot; là mã quốc gia. Mã ngôn ngữ chuẩn là{" "}
                  <button
                    type="button"
                    onClick={() => setLanguageCode(suggestion)}
                    className="font-semibold underline"
                  >
                    {suggestion}
                  </button>
                  .
                </span>
              ) : (
                "Mã ISO 639-1, 2–3 chữ cái thường."
              )
            }
          >
            {(id) => (
              <div className="space-y-2">
                <input
                  id={id}
                  required
                  maxLength={3}
                  value={languageCode}
                  placeholder="en"
                  onChange={(event) => setLanguageCode(event.target.value.toLowerCase().trim())}
                  className={`${fieldClass} w-24 font-mono`}
                />
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_LANGUAGES.map(([code, languageName]) => {
                    const selected = languageCode === code;
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() => pickLanguage(code, languageName)}
                        aria-pressed={selected}
                        title={languageName}
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 transition ${
                          selected
                            ? "bg-accent text-white ring-accent"
                            : "bg-white text-slate-600 ring-secondary hover:bg-secondary hover:text-accent"
                        }`}
                      >
                        <span className="font-mono">{code}</span> · {languageName}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </Field>
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <div className="-mx-5 -mb-4 mt-5 flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
        <span className="text-xs text-slate-500">
          {land ? "Thay đổi được ghi vào nhật ký quản trị." : "Vùng đất mới mặc định đang TẮT."}
        </span>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onDone} disabled={pending}>
            Hủy
          </Button>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Đang lưu..." : land ? "Lưu thay đổi" : "Thêm vùng đất"}
          </Button>
        </div>
      </div>
    </form>
  );
}
