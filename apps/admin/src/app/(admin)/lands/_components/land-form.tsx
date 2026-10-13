"use client";

import { useState, useTransition } from "react";
import { slugify, type Land } from "@lw/shared";
import { Button, useToast } from "@lw/ui";
import { Field, fieldClass } from "@/components/fields";
import { ImageUploader, type PickedImage } from "@/components/image-uploader";
import { createLand, updateLand } from "../actions";

/**
 * Form thêm / sửa vùng đất. Slug tự sinh từ tên cho tới khi người dùng tự sửa slug.
 * Ảnh bìa: tải lên Cloudinary ngay trong form, bấm Lưu thì gắn vào vùng đất.
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
    <form onSubmit={submit} className="space-y-3">
      <ImageUploader folder="lands" value={cover} onChange={setCover} label="Ảnh bìa" />
      <Field label="Tên vùng đất">
        {(id) => (
          <input
            id={id}
            required
            maxLength={80}
            value={name}
            placeholder="Ví dụ: Tiếng Anh"
            onChange={(event) => {
              setName(event.target.value);
              if (!slugTouched) setSlug(slugify(event.target.value));
            }}
            className={fieldClass}
          />
        )}
      </Field>
      <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
        <Field label="Slug" hint="Tự sinh từ tên; chỉ a-z, 0-9 và dấu gạch ngang.">
          {(id) => (
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
              className={`${fieldClass} font-mono`}
            />
          )}
        </Field>
        <Field label="Mã ngôn ngữ" hint="2–3 chữ, ví dụ en, ja.">
          {(id) => (
            <input
              id={id}
              required
              maxLength={3}
              value={languageCode}
              placeholder="en"
              onChange={(event) => setLanguageCode(event.target.value.toLowerCase())}
              className={`${fieldClass} font-mono`}
            />
          )}
        </Field>
      </div>
      <Field label="Mô tả">
        {(id) => (
          <textarea
            id={id}
            rows={3}
            maxLength={500}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className={fieldClass}
          />
        )}
      </Field>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" size="sm" onClick={onDone} disabled={pending}>
          Hủy
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Đang lưu..." : land ? "Lưu thay đổi" : "Thêm vùng đất"}
        </Button>
      </div>
    </form>
  );
}
