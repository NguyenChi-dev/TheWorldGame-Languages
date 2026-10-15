"use client";

import { useState, useTransition } from "react";
import {
  SKILL_COLOR_KEYS,
  SKILL_ICON_KEYS,
  type Skill,
  type SkillColorKey,
  type SkillIconKey,
} from "@lw/shared";
import { Button, useToast } from "@lw/ui";
import { SKILL_ICONS } from "@/components/content-icons";
import { FaIcon } from "@/components/fa-icon";
import { Field, fieldClass } from "@/components/fields";
import { SkillBadge } from "@/components/skill-badge";
import { createSkill, updateSkill } from "../actions";

const MAX_DESCRIPTION = 300;

/** Chấm màu đậm để chọn màu (nhãn thật dùng tông nhạt trong SKILL_COLOR_CLASSES). */
const SWATCH: Record<SkillColorKey, string> = {
  pink: "bg-pink-400",
  rose: "bg-rose-500",
  orange: "bg-orange-400",
  amber: "bg-amber-400",
  emerald: "bg-emerald-500",
  teal: "bg-teal-500",
  sky: "bg-sky-500",
  indigo: "bg-indigo-500",
  violet: "bg-violet-500",
  slate: "bg-slate-400",
};

const pickBase =
  "flex items-center justify-center rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

/** Form thêm / sửa kỹ năng luyện tập: tên, mô tả, chọn icon và màu, xem trước nhãn. */
export function SkillForm({ skill, onDone }: { skill?: Skill; onDone?: () => void }) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(skill?.name ?? "");
  const [description, setDescription] = useState(skill?.description ?? "");
  const [icon, setIcon] = useState<SkillIconKey>(skill?.icon ?? "book");
  const [color, setColor] = useState<SkillColorKey>(skill?.color ?? "pink");
  const [error, setError] = useState<string | null>(null);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const input = { name, description, icon, color };
    startTransition(async () => {
      const result = skill ? await updateSkill(skill.id, input) : await createSkill(input);
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
    <form onSubmit={submit} className="space-y-4">
      <Field label="Tên kỹ năng">
        {(id) => (
          <input
            id={id}
            required
            maxLength={60}
            value={name}
            placeholder="Ví dụ: Phát âm"
            onChange={(event) => setName(event.target.value)}
            className={`${fieldClass} text-base font-semibold`}
          />
        )}
      </Field>

      <Field
        label="Mô tả"
        hint={
          <span className="flex justify-between gap-2">
            <span>Người chơi luyện gì ở kỹ năng này.</span>
            <span>
              {description.length}/{MAX_DESCRIPTION}
            </span>
          </span>
        }
      >
        {(id) => (
          <textarea
            id={id}
            rows={2}
            maxLength={MAX_DESCRIPTION}
            value={description}
            placeholder="Ví dụ: Nghe và nói lại câu theo mẫu."
            onChange={(event) => setDescription(event.target.value)}
            className={`${fieldClass} resize-none`}
          />
        )}
      </Field>

      <fieldset>
        <legend className="mb-1.5 text-xs font-semibold text-slate-600">Icon</legend>
        <div className="grid grid-cols-7 gap-1.5">
          {SKILL_ICON_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setIcon(key)}
              aria-pressed={icon === key}
              aria-label={`Icon ${key}`}
              title={key}
              className={`${pickBase} h-10 ${
                icon === key
                  ? "bg-accent text-white shadow-sm"
                  : "bg-background text-slate-500 hover:bg-secondary hover:text-accent"
              }`}
            >
              <FaIcon icon={SKILL_ICONS[key]} />
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-1.5 text-xs font-semibold text-slate-600">Màu</legend>
        <div className="flex flex-wrap gap-2">
          {SKILL_COLOR_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setColor(key)}
              aria-pressed={color === key}
              aria-label={`Màu ${key}`}
              title={key}
              className={`${pickBase} size-8 rounded-full ${SWATCH[key]} ${
                color === key ? "ring-2 ring-slate-900 ring-offset-2" : "hover:scale-110"
              }`}
            />
          ))}
        </div>
      </fieldset>

      <div className="flex items-center gap-2 rounded-xl bg-background px-3 py-2.5 text-xs text-slate-500">
        Xem trước:
        <SkillBadge skill={{ name: name.trim() || "Tên kỹ năng", icon, color }} />
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex items-center justify-end gap-2 border-t border-secondary pt-3">
        {onDone ? (
          <Button variant="ghost" size="sm" onClick={onDone} disabled={pending}>
            Hủy
          </Button>
        ) : null}
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Đang lưu..." : skill ? "Lưu thay đổi" : "Thêm kỹ năng"}
        </Button>
      </div>
    </form>
  );
}
