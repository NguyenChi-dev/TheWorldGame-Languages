"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { AREA_SCENES, AREA_SCENE_LABELS, type Area, type AreaScene, type Skill } from "@lw/shared";
import { Button, useToast } from "@lw/ui";
import { Field, fieldClass } from "@/components/fields";
import { ImageUploader, type PickedImage } from "@/components/image-uploader";
import { createArea, updateArea } from "../actions";

/** Form thêm / sửa khu vực. `skills`: danh sách kỹ năng luyện tập (bảng skills) để chọn. */
export function AreaForm({
  landId,
  area,
  coverUrl,
  skills,
  onDone,
}: {
  landId: string;
  area?: Area;
  /** URL ảnh hiện tại của khu vực (để xem trước khi sửa). */
  coverUrl?: string | null;
  skills: Skill[];
  onDone?: () => void;
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(area?.name ?? "");
  const [skillId, setSkillId] = useState(area?.skillId ?? skills[0]?.id ?? "");
  const selectedSkill = skills.find((skill) => skill.id === skillId);
  const [scene, setScene] = useState<AreaScene>(area?.scene ?? "farm");
  const [cover, setCover] = useState<PickedImage | null>(
    area?.coverMediaId && coverUrl ? { id: area.coverMediaId, url: coverUrl } : null,
  );
  const [error, setError] = useState<string | null>(null);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const input = { name, skillId, scene, coverMediaId: cover?.id ?? null };
    startTransition(async () => {
      const result = area ? await updateArea(area.id, input) : await createArea(landId, input);
      if (result.ok) {
        toast.success(result.message);
        onDone?.();
      } else {
        setError(result.error);
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={submit}>
      <div className="grid gap-5 md:grid-cols-2">
        {/* Cột trái: ảnh */}
        <ImageUploader folder="areas" value={cover} onChange={setCover} label="Ảnh khu vực" />

        {/* Cột phải: tên, kỹ năng, mẫu cảnh */}
        <div className="space-y-4">
          <Field label="Tên khu vực">
            {(id) => (
              <input
                id={id}
                required
                maxLength={80}
                value={name}
                placeholder="Ví dụ: Nông trại"
                onChange={(event) => setName(event.target.value)}
                className={`${fieldClass} text-base font-semibold`}
              />
            )}
          </Field>
          <Field
            label="Kỹ năng luyện tập"
            hint={
              skills.length === 0 ? (
                <>
                  Chưa có kỹ năng nào.{" "}
                  <Link
                    href="/lands/skills"
                    className="font-semibold text-accent underline underline-offset-2"
                  >
                    Thêm kỹ năng
                  </Link>{" "}
                  trước.
                </>
              ) : (
                selectedSkill?.description || "Mỗi khu vực luyện một kỹ năng."
              )
            }
          >
            {(id) => (
              <select
                id={id}
                required
                value={skillId}
                onChange={(event) => setSkillId(event.target.value)}
                className={fieldClass}
              >
                {skills.length === 0 ? <option value="">Chưa có kỹ năng</option> : null}
                {skills.map((skill) => (
                  <option key={skill.id} value={skill.id}>
                    {skill.name}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Mẫu cảnh 3D" hint="Khung cảnh người chơi thấy khi vào khu vực.">
            {(id) => (
              <select
                id={id}
                value={scene}
                onChange={(event) => setScene(event.target.value as AreaScene)}
                className={fieldClass}
              >
                {AREA_SCENES.map((value) => (
                  <option key={value} value={value}>
                    {AREA_SCENE_LABELS[value]}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mt-5 flex items-center justify-end gap-2 border-t border-secondary pt-3">
        {onDone ? (
          <Button variant="ghost" size="sm" onClick={onDone} disabled={pending}>
            Hủy
          </Button>
        ) : null}
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Đang lưu..." : area ? "Lưu thay đổi" : "Thêm khu vực"}
        </Button>
      </div>
    </form>
  );
}
