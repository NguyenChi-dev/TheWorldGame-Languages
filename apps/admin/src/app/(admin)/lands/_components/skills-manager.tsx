"use client";

import {
  faGripVertical,
  faPen,
  faPlus,
  faTrashCan,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import { useState, useTransition } from "react";
import type { Skill } from "@lw/shared";
import { Button, Dialog, useToast } from "@lw/ui";
import { FaIcon } from "@/components/fa-icon";
import { Field, fieldClass } from "@/components/fields";
import { SkillBadge } from "@/components/skill-badge";
import { SortableList } from "@/components/sortable-list";
import { deleteSkill, reorderSkills } from "../actions";
import { SkillForm } from "./skill-form";

export interface SkillRow {
  skill: Skill;
  /** Số khu vực đang luyện kỹ năng này: còn khu vực dùng thì không xóa được. */
  areaCount: number;
}

const iconButton =
  "flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-secondary hover:text-accent " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

/** Hộp xác nhận xóa kỹ năng: gõ đúng tên; kỹ năng còn khu vực dùng thì nút Xóa bị khóa. */
function DeleteSkillDialog({ row, onClose }: { row: SkillRow; onClose: () => void }) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { skill, areaCount } = row;
  const blocked = areaCount > 0;

  function confirm() {
    setError(null);
    startTransition(async () => {
      const result = await deleteSkill(skill.id, typed);
      if (result.ok) {
        toast.success(result.message);
        onClose();
      } else {
        setError(result.error);
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={`Xóa kỹ năng "${skill.name}"?`}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={pending}>
            Hủy
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={confirm}
            disabled={pending || blocked || typed.trim() !== skill.name}
          >
            <FaIcon icon={faTrashCan} />
            {pending ? "Đang xóa..." : "Xóa vĩnh viễn"}
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-sm text-slate-700">
        <p>
          Thao tác này <strong>không hoàn tác được</strong> và được ghi vào nhật ký.
        </p>
        {blocked ? (
          <p className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-red-700">
            <FaIcon icon={faTriangleExclamation} className="mt-0.5" />
            <span>
              Đang có <strong>{areaCount} khu vực</strong> luyện kỹ năng này nên không xóa được. Hãy đổi kỹ
              năng của các khu vực đó trước.
            </span>
          </p>
        ) : (
          <Field label={`Gõ tên "${skill.name}" để xác nhận`}>
            {(id) => (
              <input
                id={id}
                value={typed}
                autoComplete="off"
                onChange={(event) => setTyped(event.target.value)}
                className={fieldClass}
              />
            )}
          </Field>
        )}
        {error ? <p className="text-red-700">{error}</p> : null}
      </div>
    </Dialog>
  );
}

/**
 * Danh sách kỹ năng luyện tập (dùng chung mọi vùng đất): thêm, sửa, xóa (chỉ admin),
 * kéo thả đổi thứ tự (thứ tự hiện trong ô chọn kỹ năng của khu vực).
 */
export function SkillsManager({ rows, canDelete }: { rows: SkillRow[]; canDelete: boolean }) {
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Skill | null>(null);
  const [deleting, setDeleting] = useState<SkillRow | null>(null);

  async function onReorder(next: SkillRow[]) {
    const result = await reorderSkills(next.map((row) => row.skill.id));
    if (result.ok) toast.success(result.message);
    else toast.error(result.error);
    return result.ok;
  }

  return (
    <section className="rounded-2xl border border-secondary bg-white p-4 shadow-sm">
      <div className="mb-1 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-game text-lg font-bold text-slate-900">Kỹ năng ({rows.length})</h2>
          <p className="text-xs text-slate-500">
            Kéo <FaIcon icon={faGripVertical} /> (hoặc bấm ↑ ↓) để đổi thứ tự hiện trong ô chọn kỹ năng của
            khu vực.
          </p>
        </div>
        <Button size="sm" onClick={() => setAdding(true)}>
          <FaIcon icon={faPlus} />
          Thêm kỹ năng
        </Button>
      </div>

      {rows.length === 0 ? (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-3 flex w-full flex-col items-center gap-1 rounded-xl border-2 border-dashed border-primary/40 py-8 text-center transition hover:border-primary hover:bg-secondary/40"
        >
          <span className="font-semibold text-slate-700">Chưa có kỹ năng nào</span>
          <span className="text-xs text-slate-500">
            Bấm để thêm kỹ năng đầu tiên (từ vựng, nghe, hội thoại...)
          </span>
        </button>
      ) : (
        <SortableList
          items={rows}
          getId={(row) => row.skill.id}
          onReorder={onReorder}
          renderItem={(row) => {
            const { skill, areaCount } = row;
            return (
              <div className="flex items-center gap-3 rounded-xl px-1 py-1">
                <div className="w-36 shrink-0">
                  <SkillBadge skill={skill} />
                </div>
                <p className="min-w-0 flex-1 truncate text-sm text-slate-500">
                  {skill.description || <span className="italic text-slate-400">Chưa có mô tả</span>}
                </p>
                <span className="shrink-0 text-xs text-slate-400">
                  {areaCount > 0 ? `${areaCount} khu vực` : "Chưa dùng"}
                </span>
                <span className="flex shrink-0 items-center">
                  <button
                    type="button"
                    onClick={() => setEditing(skill)}
                    className={iconButton}
                    aria-label={`Sửa kỹ năng ${skill.name}`}
                    title="Sửa"
                  >
                    <FaIcon icon={faPen} />
                  </button>
                  {canDelete ? (
                    <button
                      type="button"
                      onClick={() => setDeleting(row)}
                      className={`${iconButton} hover:bg-red-50 hover:text-red-600`}
                      aria-label={`Xóa kỹ năng ${skill.name}`}
                      title="Xóa"
                    >
                      <FaIcon icon={faTrashCan} />
                    </button>
                  ) : null}
                </span>
              </div>
            );
          }}
        />
      )}

      <Dialog
        open={adding}
        onClose={() => setAdding(false)}
        title="Thêm kỹ năng luyện tập"
        description="Kỹ năng dùng chung cho mọi vùng đất. Mỗi khu vực chọn một kỹ năng."
      >
        {adding ? <SkillForm onDone={() => setAdding(false)} /> : null}
      </Dialog>
      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing ? `Sửa kỹ năng "${editing.name}"` : "Sửa kỹ năng"}
      >
        {editing ? <SkillForm key={editing.id} skill={editing} onDone={() => setEditing(null)} /> : null}
      </Dialog>
      {deleting ? <DeleteSkillDialog row={deleting} onClose={() => setDeleting(null)} /> : null}
    </section>
  );
}
