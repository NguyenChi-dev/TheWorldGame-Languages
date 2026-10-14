"use client";

import { useState, useTransition } from "react";
import {
  AREA_SCENES,
  AREA_SCENE_LABELS,
  SKILLS,
  SKILL_LABELS,
  type Area,
  type AreaScene,
  type Skill,
} from "@lw/shared";
import { Button, Dialog, useToast } from "@lw/ui";
import { Field, fieldClass } from "@/components/fields";
import { ImageUploader, type PickedImage } from "@/components/image-uploader";
import { createArea, updateArea } from "../actions";

/**
 * Form thêm / sửa khu vực.
 * Sửa khu vực đã có bài học mà đổi kỹ năng: hiện hộp xác nhận trước khi lưu
 * (máy chủ cũng tự chặn nếu chưa xác nhận, phòng khi số bài học trên trang đã cũ).
 */
export function AreaForm({
  landId,
  area,
  coverUrl,
  lessonCount = 0,
  onDone,
}: {
  landId: string;
  area?: Area;
  /** URL ảnh hiện tại của khu vực (để xem trước khi sửa). */
  coverUrl?: string | null;
  lessonCount?: number;
  onDone?: () => void;
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(area?.name ?? "");
  const [skill, setSkill] = useState<Skill>(area?.skill ?? "vocabulary");
  const [scene, setScene] = useState<AreaScene>(area?.scene ?? "farm");
  const [cover, setCover] = useState<PickedImage | null>(
    area?.coverMediaId && coverUrl ? { id: area.coverMediaId, url: coverUrl } : null,
  );
  const [requirementText, setRequirementText] = useState(
    area && Object.keys(area.unlockRequirement).length > 0
      ? JSON.stringify(area.unlockRequirement, null, 2)
      : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [confirmCount, setConfirmCount] = useState<number | null>(null);

  function readRequirement(): Record<string, unknown> | null {
    if (!requirementText.trim()) return {};
    try {
      const value: unknown = JSON.parse(requirementText);
      if (value && typeof value === "object" && !Array.isArray(value))
        return value as Record<string, unknown>;
    } catch {
      // rơi xuống báo lỗi bên dưới
    }
    return null;
  }

  function save(confirmSkillChange: boolean) {
    setError(null);
    const unlockRequirement = readRequirement();
    if (!unlockRequirement) {
      setError('Điều kiện mở khóa phải là đối tượng JSON, ví dụ {"lessons_done": 3}');
      return;
    }
    const input = { name, skill, scene, coverMediaId: cover?.id ?? null, unlockRequirement };
    startTransition(async () => {
      const result = area
        ? await updateArea(area.id, input, { confirmSkillChange })
        : await createArea(landId, input);
      if (result.ok) {
        setConfirmCount(null);
        toast.success(result.message);
        onDone?.();
      } else if (result.code === "confirm_skill_change") {
        setConfirmCount(result.lessonCount ?? lessonCount);
      } else {
        setError(result.error);
        toast.error(result.error);
      }
    });
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (area && area.skill !== skill && lessonCount > 0) {
      setConfirmCount(lessonCount);
      return;
    }
    save(false);
  }

  return (
    <>
      <form onSubmit={submit}>
        <div className="grid gap-5 md:grid-cols-2">
          {/* Cột trái: ảnh + điều kiện mở khóa */}
          <div className="space-y-4">
            <ImageUploader folder="areas" value={cover} onChange={setCover} label="Ảnh khu vực" />
            <Field
              label="Điều kiện mở khóa (JSON)"
              hint='Để trống = không điều kiện. Ví dụ: {"lessons_done": 3}'
            >
              {(id) => (
                <textarea
                  id={id}
                  rows={3}
                  value={requirementText}
                  placeholder='{"lessons_done": 3}'
                  onChange={(event) => setRequirementText(event.target.value)}
                  className={`${fieldClass} resize-none font-mono`}
                />
              )}
            </Field>
          </div>

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
                area && lessonCount > 0
                  ? `Đang có ${lessonCount} bài học: đổi kỹ năng sẽ hỏi xác nhận.`
                  : "Mỗi khu vực luyện một kỹ năng, mỗi kỹ năng có mini-game riêng."
              }
            >
              {(id) => (
                <select
                  id={id}
                  value={skill}
                  onChange={(event) => setSkill(event.target.value as Skill)}
                  className={fieldClass}
                >
                  {SKILLS.map((value) => (
                    <option key={value} value={value}>
                      {SKILL_LABELS[value]}
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

      <Dialog
        open={confirmCount !== null}
        onClose={() => setConfirmCount(null)}
        title="Đổi kỹ năng của khu vực?"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setConfirmCount(null)} disabled={pending}>
              Giữ kỹ năng cũ
            </Button>
            <Button size="sm" onClick={() => save(true)} disabled={pending}>
              {pending ? "Đang lưu..." : "Vẫn đổi"}
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-slate-700">
          Khu vực này đang có <strong>{confirmCount} bài học</strong> được soạn cho kỹ năng{" "}
          <strong>{area ? SKILL_LABELS[area.skill] : ""}</strong>. Đổi sang{" "}
          <strong>{SKILL_LABELS[skill]}</strong> thì các bài đó có thể không còn hợp với mini-game mới và cần
          soạn lại.
        </p>
      </Dialog>
    </>
  );
}
